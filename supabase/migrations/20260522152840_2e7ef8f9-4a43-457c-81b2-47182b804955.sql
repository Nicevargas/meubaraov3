
-- ============================================================
-- Products
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','internal','hidden')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads public active products" ON public.products;
CREATE POLICY "Anyone reads public active products"
  ON public.products FOR SELECT TO authenticated
  USING (active = true AND visibility = 'public');

DROP POLICY IF EXISTS "Super admins manage products" ON public.products;
CREATE POLICY "Super admins manage products"
  ON public.products FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Pricing plans (one per product × billing cycle)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','semiannual','annual','lifetime','trial')),
  price_brl numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  promo_price_brl numeric,
  mp_preapproval_plan_id text,
  mp_product_id text,
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','internal','hidden')),
  sort_order int NOT NULL DEFAULT 0,
  legacy_plan_id uuid REFERENCES public.plans(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, billing_cycle)
);

CREATE INDEX IF NOT EXISTS idx_pricing_plans_product ON public.pricing_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_legacy ON public.pricing_plans(legacy_plan_id);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads public active pricing" ON public.pricing_plans;
CREATE POLICY "Anyone reads public active pricing"
  ON public.pricing_plans FOR SELECT TO authenticated
  USING (active = true AND visibility = 'public');

DROP POLICY IF EXISTS "Super admins manage pricing_plans" ON public.pricing_plans;
CREATE POLICY "Super admins manage pricing_plans"
  ON public.pricing_plans FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_pricing_plans_updated_at ON public.pricing_plans;
CREATE TRIGGER trg_pricing_plans_updated_at BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Features catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS public.features (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads features" ON public.features;
CREATE POLICY "Anyone reads features"
  ON public.features FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admins manage features" ON public.features;
CREATE POLICY "Super admins manage features"
  ON public.features FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================
-- Product features (entitlements per product)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_features (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.features(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  limit_value bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, feature_key)
);

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads product_features" ON public.product_features;
CREATE POLICY "Anyone reads product_features"
  ON public.product_features FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admins manage product_features" ON public.product_features;
CREATE POLICY "Super admins manage product_features"
  ON public.product_features FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================
-- Link subscriptions and payments to the new model (additive)
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS pricing_plan_id uuid REFERENCES public.pricing_plans(id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_product ON public.subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pricing_plan ON public.subscriptions(pricing_plan_id);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pricing_plan_id uuid REFERENCES public.pricing_plans(id);

CREATE INDEX IF NOT EXISTS idx_payments_pricing_plan ON public.payments(pricing_plan_id);

-- ============================================================
-- Seed products
-- ============================================================
INSERT INTO public.products (slug, name, description, sort_order) VALUES
  ('premium', 'Premium', 'A relação começa de verdade.', 1),
  ('elite',   'Elite',   'Uma intimidade ultra personalizada.', 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- Seed pricing_plans from current premium/elite plan rows
-- ============================================================
INSERT INTO public.pricing_plans
  (product_id, billing_cycle, price_brl, currency, promo_price_brl,
   mp_preapproval_plan_id, mp_product_id, active, visibility, sort_order, legacy_plan_id)
SELECT
  prod.id,
  p.billing_cycle,
  p.price_brl,
  p.currency,
  p.promo_price_brl,
  p.mp_preapproval_plan_id,
  p.mp_product_id,
  p.active,
  'public',
  COALESCE(p.sort_order, 0),
  p.id
FROM public.plans p
JOIN public.products prod ON prod.slug = p.tier
WHERE p.tier IN ('premium','elite')
  AND p.billing_cycle IN ('monthly','quarterly','semiannual','annual')
  AND p.archived_at IS NULL
ON CONFLICT (product_id, billing_cycle) DO UPDATE SET
  price_brl = EXCLUDED.price_brl,
  promo_price_brl = EXCLUDED.promo_price_brl,
  mp_preapproval_plan_id = COALESCE(EXCLUDED.mp_preapproval_plan_id, public.pricing_plans.mp_preapproval_plan_id),
  mp_product_id = COALESCE(EXCLUDED.mp_product_id, public.pricing_plans.mp_product_id),
  active = EXCLUDED.active,
  legacy_plan_id = EXCLUDED.legacy_plan_id,
  updated_at = now();

-- Backfill subscriptions
UPDATE public.subscriptions s
SET pricing_plan_id = pp.id,
    product_id = pp.product_id
FROM public.pricing_plans pp
WHERE pp.legacy_plan_id = s.plan_id
  AND s.pricing_plan_id IS NULL;

-- Backfill payments
UPDATE public.payments pay
SET pricing_plan_id = pp.id
FROM public.pricing_plans pp
WHERE pp.legacy_plan_id = pay.plan_id
  AND pay.pricing_plan_id IS NULL;

-- ============================================================
-- Seed features
-- ============================================================
INSERT INTO public.features (key, name, description, category) VALUES
  ('unlimited_chat',              'Conversas ilimitadas',         'Sem limite diário de mensagens',     'chat'),
  ('long_memory',                 'Memória emocional longa',      'Contexto profundo e duradouro',      'memory'),
  ('image_generation',            'Geração de imagens',           'Imagens com IA',                     'media'),
  ('voice_messages',              'Mensagens de voz',             'Áudios ilimitados',                  'media'),
  ('video_calls',                 'Chamadas de vídeo',            'Videochamadas com o Barão',          'media'),
  ('premium_persona',             'Persona premium',              'Personalidade refinada',             'persona'),
  ('priority_responses',          'Respostas prioritárias',       'Fila de resposta acelerada',         'performance'),
  ('custom_rituals',              'Rituais customizados',         'Rituais personalizados',             'ritual'),
  ('advanced_emotional_analysis', 'Análise emocional avançada',   'Insights emocionais profundos',      'analysis')
ON CONFLICT (key) DO NOTHING;

-- Premium gets the relationship baseline
INSERT INTO public.product_features (product_id, feature_key, enabled)
SELECT p.id, f.key, true
FROM public.products p
CROSS JOIN public.features f
WHERE p.slug = 'premium'
  AND f.key IN ('unlimited_chat','long_memory','voice_messages','custom_rituals','premium_persona')
ON CONFLICT (product_id, feature_key) DO NOTHING;

-- Elite gets everything
INSERT INTO public.product_features (product_id, feature_key, enabled)
SELECT p.id, f.key, true
FROM public.products p
CROSS JOIN public.features f
WHERE p.slug = 'elite'
ON CONFLICT (product_id, feature_key) DO NOTHING;

-- ============================================================
-- Helpers: resolve features for the current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_features(_user_id uuid)
RETURNS TABLE(feature_key text, enabled boolean, limit_value bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ent jsonb;
  v_plan_id uuid;
  v_product_id uuid;
BEGIN
  v_ent := public.resolve_user_entitlement(_user_id);
  v_plan_id := NULLIF(v_ent->>'plan_id','')::uuid;

  IF v_plan_id IS NULL THEN
    RETURN;
  END IF;

  -- Map legacy plan -> pricing_plan -> product
  SELECT pp.product_id INTO v_product_id
  FROM public.pricing_plans pp
  WHERE pp.legacy_plan_id = v_plan_id
  LIMIT 1;

  -- Fallback: map by tier slug (covers manual plans without a pricing_plan link)
  IF v_product_id IS NULL THEN
    SELECT prod.id INTO v_product_id
    FROM public.products prod
    WHERE prod.slug = lower(v_ent->>'tier')
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pf.feature_key, pf.enabled, pf.limit_value
  FROM public.product_features pf
  WHERE pf.product_id = v_product_id
    AND pf.enabled = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_feature(_user_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_features(_user_id) f
    WHERE f.feature_key = _feature_key
  );
$$;
