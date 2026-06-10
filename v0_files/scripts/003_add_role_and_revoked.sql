-- Add nullable role column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;

-- Drop old constraint and re-add with revoked
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_access_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_access_status_check
  CHECK (access_status IN ('none', 'beta', 'trial', 'active', 'revoked'));
