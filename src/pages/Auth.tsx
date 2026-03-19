import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn, WifiOff } from 'lucide-react';
import { z } from 'zod';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const checkIfSetupNeeded = async () => {
    try {
      // Use the public function to check if users exist (bypasses RLS)
      const { data, error } = await supabase.rpc('has_any_users');
      
      if (error) throw error;

      // If no users exist, redirect to setup
      if (data === false) {
        navigate('/setup', { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setIsChecking(false);
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Block login if offline
    if (!isOnline) {
      toast({
        title: 'Sin conexión',
        description: 'Necesitas conexión a internet para iniciar sesión',
        variant: 'destructive',
      });
      return;
    }

    // Validate inputs
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      let message = 'Error al iniciar sesión';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Credenciales inválidas';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Email no confirmado';
      }
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bienvenido',
        description: 'Has iniciado sesión correctamente',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium bg-destructive text-destructive-foreground">
          <WifiOff className="w-4 h-4" />
          <span>Sin conexión - Necesitas internet para iniciar sesión</span>
        </div>
      )}

      <div className="mb-8 text-center">
        <img 
          src="/logo-biosolve.png" 
          alt="Biosolve" 
          className="h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-display font-bold text-foreground">
          Sistema de Gestión
        </h1>
      </div>

      <Card className="w-full max-w-sm glass-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" />
            Iniciar Sesión
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
