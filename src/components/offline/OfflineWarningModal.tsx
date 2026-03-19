import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOfflineSafe } from '@/contexts/OfflineContext';

export function OfflineWarningModal() {
  const context = useOfflineSafe();

  // If context is not available yet, render nothing
  if (!context) {
    return null;
  }

  const { showOfflineWarning, dismissOfflineWarning, pendingOperationsCount } = context;

  return (
    <Dialog open={showOfflineWarning} onOpenChange={dismissOfflineWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <WifiOff className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">
              <span className="text-destructive font-bold">MODO OFFLINE</span>
            </DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  Estás ingresando al modo offline. Por favor lee las siguientes indicaciones importantes:
                </p>
              </div>

              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">1</span>
                  <span className="text-foreground">
                    <strong className="text-destructive">Antes de cerrar sesión</strong>, validar que se han sincronizado todos los ítems pendientes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">2</span>
                  <span className="text-foreground">
                    <strong className="text-destructive">Mientras la app está sincronizando</strong>, no cerrarla en ningún momento.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">3</span>
                  <span className="text-foreground">
                    <strong className="text-destructive">No cerrar sesión</strong> mientras se encuentre en modo offline.
                  </span>
                </li>
              </ol>

              {pendingOperationsCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tienes {pendingOperationsCount} operación(es) pendiente(s) de sincronización.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={dismissOfflineWarning} variant="default">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
