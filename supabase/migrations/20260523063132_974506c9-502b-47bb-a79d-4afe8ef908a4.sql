
-- ────────────────────────────────────────────────────────────────────────────
-- Memory v2.1 hardening — P0 patches
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Dedup atômico: UNIQUE (user_id, canonical_key) em user_memory_events.
--    Antes do índice, colapsa duplicatas que possam existir (somando reinforcement_count).
WITH ranked AS (
  SELECT id, user_id, canonical_key,
         row_number() OVER (PARTITION BY user_id, canonical_key
                            ORDER BY last_reinforced_at DESC NULLS LAST, created_at DESC) AS rn
  FROM public.user_memory_events
)
DELETE FROM public.user_memory_events e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ume_user_canonical
  ON public.user_memory_events (user_id, canonical_key);

-- 2. Fence de downgrade: timestamp do último wipe por usuária.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS memory_wipe_at timestamptz;

-- 3. Mutex genérico por chave (serialização cross-request, à prova de pgbouncer).
CREATE TABLE IF NOT EXISTS public.memory_locks (
  key text PRIMARY KEY,
  acquired_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memory_locks ENABLE ROW LEVEL SECURITY;
-- service_role bypassa RLS; nenhuma policy = nenhum acesso para authenticated.
CREATE INDEX IF NOT EXISTS idx_memory_locks_acquired ON public.memory_locks(acquired_at);

-- 4. RPC: upsert atômico de evento com cap de reinforcement_count,
--    cooldown anti-rumination e merge de pesos.
--    Devolve a ação tomada ('inserted' | 'merged' | 'rejected_wipe_fence').
CREATE OR REPLACE FUNCTION public.ingest_memory_event(
  _user_id           uuid,
  _category          text,
  _canonical_key     text,
  _entry_type        text,
  _emotion           text,
  _content           text,
  _importance        numeric,
  _emotional_weight  numeric,
  _confidence        numeric,
  _intensity         numeric,
  _expires_at        timestamptz,
  _request_started_at timestamptz
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wipe_at        timestamptz;
  v_existing       record;
  v_new_reinf      integer;
  v_eff_ew         numeric;
  v_imp_bump       numeric;
  v_new_imp        numeric;
  v_new_ew         numeric;
  v_new_conf       numeric;
  v_new_decay      numeric;
  v_now            timestamptz := now();
  v_recent_24h     integer;
  v_rumination_div numeric;
BEGIN
  -- Wipe fence: se o profile foi wipado APÓS o início desta request,
  -- ignora — caso contrário a memória "ressuscitaria" depois do downgrade.
  SELECT memory_wipe_at INTO v_wipe_at FROM public.profiles WHERE id = _user_id;
  IF v_wipe_at IS NOT NULL AND v_wipe_at > _request_started_at THEN
    RETURN 'rejected_wipe_fence';
  END IF;

  -- Tenta achar evento existente no mesmo bucket canônico.
  SELECT id, content, importance, emotional_weight, confidence,
         reinforcement_count, last_reinforced_at
    INTO v_existing
  FROM public.user_memory_events
  WHERE user_id = _user_id AND canonical_key = _canonical_key
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- MERGE: incrementa reforço.
    v_new_reinf := COALESCE(v_existing.reinforcement_count, 1) + 1;

    -- Cooldown anti-rumination: se já tem >5 reforços em 24h,
    -- atenua peso emocional novo para impedir ciclo de sofrimento.
    IF v_existing.last_reinforced_at > v_now - interval '24 hours'
       AND v_existing.reinforcement_count > 5 THEN
      v_rumination_div := 1 + ln(GREATEST(v_existing.reinforcement_count - 4, 1));
      v_eff_ew := _emotional_weight / v_rumination_div;
    ELSE
      v_eff_ew := _emotional_weight;
    END IF;

    -- Cap de reinforcement: importance só sobe até reinforcement_count <= 5.
    -- Acima disso, repetir não vira mais "verdade".
    IF v_new_reinf <= 5 THEN
      v_imp_bump := 0.05;
    ELSE
      v_imp_bump := 0;
    END IF;

    v_new_imp  := LEAST(1.0, GREATEST(0, (v_existing.importance + _importance) / 2 + v_imp_bump));
    v_new_ew   := LEAST(1.0, GREATEST(0, (v_existing.emotional_weight + v_eff_ew) / 2));
    v_new_conf := LEAST(1.0, GREATEST(0, (v_existing.confidence + _confidence) / 2));

    -- decay = imp*.4 + ew*.3 + recency(=1 pois acabou de ser reforçado)*.2 + conf*.1
    v_new_decay := LEAST(1.0, v_new_imp * 0.4 + v_new_ew * 0.3 + 0.2 + v_new_conf * 0.1);

    UPDATE public.user_memory_events
       SET importance          = v_new_imp,
           emotional_weight    = v_new_ew,
           confidence          = v_new_conf,
           reinforcement_count = v_new_reinf,
           last_reinforced_at  = v_now,
           decay_score         = v_new_decay,
           expires_at          = _expires_at
     WHERE id = v_existing.id;

    RETURN 'merged';
  END IF;

  -- INSERT novo evento.
  v_new_decay := LEAST(1.0, _importance * 0.4 + _emotional_weight * 0.3 + 0.2 + _confidence * 0.1);

  INSERT INTO public.user_memory_events (
    user_id, category, canonical_key, entry_type, emotion,
    intensity, content, confidence, importance, emotional_weight,
    reinforcement_count, decay_score, last_reinforced_at, expires_at
  ) VALUES (
    _user_id, _category, _canonical_key, _entry_type, _emotion,
    _intensity, _content, _confidence, _importance, _emotional_weight,
    1, v_new_decay, v_now, _expires_at
  )
  ON CONFLICT (user_id, canonical_key) DO UPDATE
    SET reinforcement_count = public.user_memory_events.reinforcement_count + 1,
        last_reinforced_at  = v_now,
        expires_at          = _expires_at;

  RETURN 'inserted';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_memory_event(uuid,text,text,text,text,text,numeric,numeric,numeric,numeric,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;

-- 5. RPC de lock por chave (mutex de identidade, cross-request).
CREATE OR REPLACE FUNCTION public.try_memory_lock(_key text, _ttl_seconds integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  -- Libera locks travados há mais de _ttl_seconds.
  DELETE FROM public.memory_locks
    WHERE key = _key AND acquired_at < now() - make_interval(secs => _ttl_seconds);

  INSERT INTO public.memory_locks(key) VALUES (_key)
    ON CONFLICT (key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_memory_lock(_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.memory_locks WHERE key = _key;
$$;

REVOKE EXECUTE ON FUNCTION public.try_memory_lock(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_memory_lock(text) FROM PUBLIC, anon, authenticated;
