import { useOfflineSafe } from '@/contexts/OfflineContext';
import { WifiOff, CloudOff, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function OfflineIndicator() {
  const context = useOfflineSafe();

  // If context is not available yet, render nothing
  if (!context) {
    return null;
  }

  const { isOnline, isOfflineMode, pendingOperationsCount, isSyncing } = context;

  if (isOnline && !isSyncing && pendingOperationsCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-1 px-3 text-xs font-medium bg-destructive text-destructive-foreground">
      {!isOnline && (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Modo Offline</span>
        </>
      )}
      
      {isOnline && isSyncing && (
        <>
          <Upload className="w-3 h-3 animate-pulse" />
          <span>Sincronizando...</span>
        </>
      )}

      {pendingOperationsCount > 0 && !isSyncing && (
        <Badge variant="outline" className="bg-background/20 text-xs h-5">
          {pendingOperationsCount} pendiente{pendingOperationsCount > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}
