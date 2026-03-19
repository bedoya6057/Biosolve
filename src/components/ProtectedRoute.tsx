import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AllowedRole = 'admin' | 'registrador' | 'tecnico' | 'auditor';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no roles specified, allow any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has one of the allowed roles
  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // User doesn't have permission - redirect to home
  return <Navigate to="/" replace />;
}
