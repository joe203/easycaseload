-- Create schools table for Phase 1
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  district_name TEXT,
  campus_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - teachers can only see/manage their own schools
CREATE POLICY "schools_select_own" ON public.schools 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "schools_insert_own" ON public.schools 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schools_update_own" ON public.schools 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "schools_delete_own" ON public.schools 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS schools_user_id_idx ON public.schools(user_id);

-- Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schools_updated_at ON public.schools;
CREATE TRIGGER schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
