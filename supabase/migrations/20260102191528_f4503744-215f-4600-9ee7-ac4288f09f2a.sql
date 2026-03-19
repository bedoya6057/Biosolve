
-- Create a public function to check if any users exist (for setup check)
CREATE OR REPLACE FUNCTION public.has_any_users()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios LIMIT 1)
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.has_any_users() TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_users() TO authenticated;
