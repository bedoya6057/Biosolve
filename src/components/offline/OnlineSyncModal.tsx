import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Wifi, CheckCircle2, Loader2 } from 'lucide-react';
import { useOfflineSafe } from '@/contexts/OfflineContext';

export function OnlineSyncModal() {
  const context = useOfflineSafe();

  // If context is not available yet, render nothing
  if (!context) {
    return null;
  }

  const { showOnlineSync, dismissOnlineSync, isSyncing, syncProgress, lastSyncResult, pendingOperationsCount } = context;

  const canDismiss = !isSyncing;

  return (
    <Dialog open={showOnlineSync} onOpenChange={canDismiss ? dismissOnlineSync : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !canDismiss && e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Wifi className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              <span className="text-primary font-bold">MODO ONLINE</span>
            </DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-sm text-foreground">
                {isSyncing 
                  ? 'Por favor espera a que la sincronización termine.' 
                  : lastSyncResult 
                    ? `Sincronización completada: ${lastSyncResult.synced} de ${lastSyncResult.total} operaciones.`
                    : pendingOperationsCount > 0 
                      ? `Hay ${pendingOperationsCount} operaciones pendientes.`
                      : 'No hay operaciones pendientes.'}
              </p>

              {isSyncing && syncProgress && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sincronizando...
                    </span>
                    <span className="text-muted-foreground">
                      {syncProgress.current} de {syncProgress.total}
                    </span>
                  </div>
                  
                  <Progress value={syncProgress.percentage} className="h-3" />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{syncProgress.currentItem}</span>
                    <span className="font-bold text-primary">{syncProgress.percentage}%</span>
                  </div>
                </div>
              )}

              {!isSyncing && lastSyncResult && lastSyncResult.errors === 0 && lastSyncResult.synced > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                    {lastSyncResult.synced} operación(es) sincronizada(s) correctamente.
                  </span>
                </div>
              )}

              {!isSyncing && lastSyncResult && lastSyncResult.errors > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <CheckCircle2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-800 dark:text-red-200 font-medium">
                    {lastSyncResult.synced} sincronizada(s), {lastSyncResult.errors} error(es).
                  </span>
                </div>
              )}

              {!isSyncing && (!lastSyncResult || lastSyncResult.total === 0) && pendingOperationsCount === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                    No hay operaciones pendientes.
                  </span>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        {!isSyncing && (
          <div className="flex justify-end mt-4">
            <Button onClick={dismissOnlineSync} variant="default">
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
