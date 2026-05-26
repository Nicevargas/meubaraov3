ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_is_internal_idx
  ON public.profiles (is_internal) WHERE is_internal = true;

CREATE INDEX IF NOT EXISTS profiles_is_test_idx
  ON public.profiles (is_test) WHERE is_test = true;