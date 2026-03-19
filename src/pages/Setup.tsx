import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, UserPlus } from 'lucide-react';
import { z } from 'zod';

const setupSchema = z.object({
  nombre: z.string().trim().min(1, { message: 'El nombre es requerido' }).max(100),
  apellido: z.string().trim().min(1, { message: 'El apellido es requerido' }).max(100),
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

const Setup = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    try {
      // Use the public function to check if users exist (bypasses RLS)
      const { data, error } = await supabase.rpc('has_any_users');
      
      if (error) throw error;

      // If users exist, redirect to auth
      if (data === true) {
        navigate('/auth', { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = setupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Error al crear el usuario');

      // Create usuario profile
      const { error: profileError } = await supabase
        .from('usuarios')
        .insert({
          user_id: authData.user.id,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
        });

      if (profileError) throw profileError;

      // Create admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin',
        });

      if (roleError) throw roleError;

      toast({
        title: 'Configuración completada',
        description: 'El administrador ha sido creado. Redirigiendo...',
      });

      // Sign in and redirect
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear el administrador';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <img 
          src="/logo-biosolve.png" 
          alt="Biosolve" 
          className="h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-display font-bold text-foreground">
          Configuración Inicial
        </h1>
        <p className="text-muted-foreground mt-2">
          Crea el primer administrador del sistema
        </p>
      </div>

      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Crear Administrador
          </CardTitle>
          <CardDescription>
            Este usuario tendrá acceso completo al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Juan"
                  disabled={isLoading}
                  className={errors.nombre ? 'border-destructive' : ''}
                />
                {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Pérez"
                  disabled={isLoading}
                  className={errors.apellido ? 'border-destructive' : ''}
                />
                {errors.apellido && <p className="text-sm text-destructive">{errors.apellido}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@empresa.com"
                disabled={isLoading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                disabled={isLoading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando administrador...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Administrador
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
