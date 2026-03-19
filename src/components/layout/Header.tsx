import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSafe } from "@/contexts/OfflineContext";
import { useOfflineCounts } from "@/hooks/useOfflineCounts";
import { Button } from "@/components/ui/button";
import { LogOut, User, WifiOff, CloudOff, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface HeaderProps {
  subtitle?: string;
}

export function Header({ subtitle }: HeaderProps) {
  const { userProfile, userRole, signOut } = useAuth();
  const offlineContext = useOfflineSafe();
  const isOnline = offlineContext?.isOnline ?? true;
  const pendingOperationsCount = offlineContext?.pendingOperationsCount ?? 0;
  const isSyncing = offlineContext?.isSyncing ?? false;
  const offlineCounts = useOfflineCounts(2000);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    registrador: 'Registrador',
    tecnico: 'Técnico',
    auditor: 'Auditor',
  };

  const handleLogoutClick = () => {
    if (!isOnline || pendingOperationsCount > 0 || isSyncing) {
      setShowLogoutWarning(true);
    } else {
      signOut();
    }
  };

  const handleForceLogout = () => {
    setShowLogoutWarning(false);
    signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logo on the left */}
            <img
              src="/logo-biosolve.png"
              alt="Biosolve"
              className="h-10 w-auto shrink-0"
            />

            {/* Spacer to push content to right */}
            <div className="flex-1" />

            {/* Offline indicator - left of title */}
            {!isOnline && (
              <div className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-1 shrink-0">
                <WifiOff className="h-4 w-4 text-destructive-foreground" />
                <span className="text-[11px] font-semibold text-destructive-foreground">Offline</span>
              </div>
            )}

            {isOnline && pendingOperationsCount > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 shrink-0">
                <CloudOff className="h-4 w-4 text-accent" />
                <span className="text-[11px] font-semibold text-accent">
                  {pendingOperationsCount}
                </span>
              </div>
            )}

            {/* Title - left of profile button */}
            <div className="text-right shrink-0">
              <h1 className="text-sm font-display font-bold tracking-tight leading-tight">
                Administrador
                <span className="font-normal"> de </span>
                Equipamientos
              </h1>
              <p className="text-[11px] text-primary-foreground/70 leading-tight">
                Offline: <span className="font-semibold">{offlineCounts.pendingOperations}</span> ops •{" "}
                <span className="font-semibold">{offlineCounts.vehiculos}</span> veh.
              </p>
              {subtitle && (
                <p className="text-xs text-primary-foreground/70">{subtitle}</p>
              )}
              <p className="text-[9px] text-primary-foreground/50 leading-tight">Operación México</p>
            </div>

            {/* Profile menu - far right */}
            {userProfile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
                    aria-label="Perfil"
                  >
                    <User className="w-5 h-5" />
                    {!isOnline && (
                      <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                    )}
                    {isOnline && pendingOperationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-semibold">
                        {userProfile.nombre} {userProfile.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                      {userRole && (
                        <p className="text-xs text-accent mt-1">{roleLabels[userRole]}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogoutClick} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              ¡Advertencia!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {!isOnline && (
                  <p className="text-destructive font-medium">
                    Estás en modo offline. No deberías cerrar sesión mientras no tengas conexión.
                  </p>
                )}
                {pendingOperationsCount > 0 && (
                  <p>
                    Tienes <strong className="text-destructive">{pendingOperationsCount} operación(es)</strong> pendiente(s) de sincronización que se perderán si cierras sesión.
                  </p>
                )}
                {isSyncing && (
                  <p className="text-destructive font-medium">
                    La sincronización está en progreso. Por favor espera a que termine.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  ¿Estás seguro de que deseas cerrar sesión de todos modos?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cerrar sesión de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
