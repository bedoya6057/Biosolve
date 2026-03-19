
-- Allow first user creation (bootstrap)
-- Drop existing restrictive policies for initial setup
DROP POLICY IF EXISTS "Admins can insert usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create policies that allow admins OR when there are no users yet (bootstrap)
CREATE POLICY "Admins or bootstrap can insert usuarios"
ON public.usuarios FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR NOT EXISTS (SELECT 1 FROM public.usuarios LIMIT 1)
);

CREATE POLICY "Admins or bootstrap can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1)
);

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
