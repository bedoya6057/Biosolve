import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineStorage, PendingOperation } from '@/services/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import type { VehiculoDB, InstalacionDB, VehiculoEntregadoDB, EmpresaDB, ProyectoDB } from '@/hooks/useProjectsDB';
import { uploadBase64ToStorage } from '@/hooks/useProjectsDB';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logService } from '@/services/logService';

interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem: string;
}

interface SyncError {
  operationId: string;
  type: string;
  error: string;
}

interface SyncResult {
  synced: number;
  errors: number;
  total: number;
}

interface OfflineContextType {
  isOnline: boolean;
  isOfflineMode: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  pendingOperationsCount: number;
  showOfflineWarning: boolean;
  showOnlineSync: boolean;
  syncErrors: SyncError[];
  lastSyncResult: SyncResult | null;
  dismissOfflineWarning: () => void;
  dismissOnlineSync: () => void;
  downloadDataForOffline: () => Promise<void>;
  getOfflineData: () => Promise<any>;
  addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp'>) => Promise<string>;
  updateLocalData: (type: string, data: any) => Promise<void>;
  clearSyncErrors: () => void;
  triggerManualSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  const [showOnlineSync, setShowOnlineSync] = useState(false);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Refs to prevent effect loops and track state
  const previousOnlineRef = useRef<boolean | null>(null);
  const hasDownloadedRef = useRef(false);
  const isDownloadingRef = useRef(false);

  // Check pending operations (throttled)
  const checkPendingOperations = useCallback(async () => {
    try {
      const operations = await offlineStorage.getPendingOperations();
      setPendingOperationsCount(operations.length);
    } catch (error) {
      console.error('Error checking pending operations:', error);
    }
  }, []);

  // Download data for offline use
  const downloadDataForOffline = useCallback(async () => {
    if (!user || !isOnline || isDownloadingRef.current) return;

    isDownloadingRef.current = true;
    try {
      const [empresasRes, proyectosRes, vehiculosRes, instalacionesRes, equipamientoRes, entregadosRes] = await Promise.all([
        supabase.from('empresas').select('*'),
        supabase.from('proyectos').select('*'),
        supabase.from('vehiculos').select('*'),
        supabase.from('instalaciones').select('*'),
        supabase.from('equipamiento').select('*'),
        supabase.from('vehiculos_entregados').select('*'),
      ]);

      await offlineStorage.saveOfflineData({
        empresas: empresasRes.data || [],
        proyectos: proyectosRes.data || [],
        vehiculos: vehiculosRes.data || [],
        instalaciones: instalacionesRes.data || [],
        equipamiento: equipamientoRes.data || [],
        vehiculosEntregados: entregadosRes.data || [],
        lastSyncTimestamp: Date.now(),
      });

      hasDownloadedRef.current = true;
      console.log('Offline data downloaded successfully');
    } catch (error) {
      console.error('Error downloading offline data:', error);
      if (isOnline) {
        toast({
          title: "Error de sincronización",
          description: "No se pudieron descargar los datos.",
          variant: "destructive",
        });
      }
    } finally {
      isDownloadingRef.current = false;
    }
  }, [user, isOnline, toast]);

  // Sync pending operations to server
  const syncPendingOperations = useCallback(async (): Promise<SyncResult> => {
    const emptyResult: SyncResult = { synced: 0, errors: 0, total: 0 };
    
    // Only sync if we're actually online (use our reliable connectivity check)
    if (!isOnline) {
      logService.warning('sync', 'No se puede sincronizar - sin conexión');
      console.log('[SYNC] Cannot sync - no internet connection');
      return emptyResult;
    }

    console.log('[SYNC] Starting sync process...');
    const operations = await offlineStorage.getPendingOperations();
    
    console.log('[SYNC] Pending operations found:', operations.length);
    logService.info('sync', `Operaciones pendientes encontradas: ${operations.length}`);
    
    if (operations.length === 0) {
      console.log('[SYNC] No pending operations to sync');
      setSyncProgress(null);
      setLastSyncResult({ synced: 0, errors: 0, total: 0 });
      return emptyResult;
    }

    setIsSyncing(true);
    setSyncErrors([]);
    setLastSyncResult(null);
    logService.logSyncStart(operations.length);
    
    let synced = 0;
    const errors: SyncError[] = [];

    for (const op of operations) {
      try {
        const progress = {
          current: synced + 1,
          total: operations.length,
          percentage: Math.round(((synced + 1) / operations.length) * 100),
          currentItem: `${op.type} - ${op.action}`,
        };
        console.log('[SYNC] Progress:', progress);
        setSyncProgress(progress);

        console.log('[SYNC] Syncing operation:', op.type, op.action, op.id);
        logService.info('sync', `Sincronizando: ${op.type} - ${op.action}`, JSON.stringify(op.data).slice(0, 500));
        
        await syncOperation(op);
        
        console.log('[SYNC] Removing operation from queue:', op.id);
        await offlineStorage.removePendingOperation(op.id);
        synced++;
        
        console.log('[SYNC] Operation synced successfully:', op.type);
        logService.success('sync', `Operación sincronizada: ${op.type}`, `ID: ${op.id}`);
      } catch (error) {
        console.error(`[SYNC] Error syncing operation ${op.id}:`, error);
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        errors.push({
          operationId: op.id,
          type: op.type,
          error: errorMsg,
        });
        
        logService.error('sync', `Error sincronizando ${op.type}`, `${errorMsg} - ID: ${op.id}`);
        
        // Show toast for each sync error
        toast({
          title: `Error al sincronizar ${op.type}`,
          description: errorMsg,
          variant: "destructive",
        });
      }
    }

    const result: SyncResult = { synced, errors: errors.length, total: operations.length };
    console.log('[SYNC] Sync complete:', result);
    
    setSyncErrors(errors);
    setLastSyncResult(result);
    await checkPendingOperations();
    setIsSyncing(false);
    setSyncProgress(null);
    
    logService.logSyncComplete(synced, errors.length);

    // Show summary
    if (errors.length > 0) {
      toast({
        title: "Sincronización incompleta",
        description: `${synced} de ${operations.length} operaciones sincronizadas. ${errors.length} error(es).`,
        variant: "destructive",
      });
    } else if (synced > 0) {
      toast({
        title: "Sincronización completada",
        description: `${synced} operación(es) sincronizada(s) exitosamente.`,
      });
    }

    // Re-download fresh data after sync
    console.log('[SYNC] Re-downloading fresh data...');
    await downloadDataForOffline();
    
    return result;
  }, [isOnline, checkPendingOperations, downloadDataForOffline, toast]);

  // Process a single operation
  const syncOperation = async (op: PendingOperation) => {
    switch (op.type) {
      case 'vehicle':
        if (op.action === 'create') {
          // If the record was created offline, we expect a stable id so subsequent operations can reference it.
          const { __equipment_ids, _offline_base64_photos, _offline_base64_dealer, ...vehicleData } = op.data ?? {};
          const equipmentIds: string[] = Array.isArray(__equipment_ids) ? __equipment_ids : [];

          // Upload offline photos to Supabase Storage
          if (_offline_base64_photos && Array.isArray(_offline_base64_photos)) {
            const uploadedPhotos = [];
            for (const photo of _offline_base64_photos) {
               if (photo && photo.startsWith('data:image')) {
                 const url = await uploadBase64ToStorage(photo, `vehiculos/${vehicleData.vin}`);
                 uploadedPhotos.push(url);
               } else {
                 uploadedPhotos.push(photo); // Already URL or null
               }
            }
            vehicleData.foto_1 = uploadedPhotos[0] || null;
            vehicleData.foto_2 = uploadedPhotos[1] || null;
            vehicleData.foto_3 = uploadedPhotos[2] || null;
            vehicleData.foto_4 = uploadedPhotos[3] || null;
          }

          if (_offline_base64_dealer && _offline_base64_dealer.startsWith('data:image')) {
             vehicleData.dealer_sheet_photo = await uploadBase64ToStorage(_offline_base64_dealer, `fichas/${vehicleData.vin}`);
          }

          const { error: vehicleError } = await supabase.from('vehiculos').insert(vehicleData);
          if (vehicleError) throw new Error(vehicleError.message);

          // Create instalaciones for this vehicle so later "installation" updates can succeed.
          if (equipmentIds.length > 0) {
            const instalacionesData = equipmentIds.map((equipmentId) => ({
              vehicle_id: vehicleData.id,
              equipment_id: equipmentId,
              installed: false,
            }));

            const { error: instError } = await supabase.from('instalaciones').insert(instalacionesData);
            if (instError) {
              // Not fatal for vehicle creation, but it will break future installation updates, so treat as error.
              throw new Error(instError.message);
            }
          }
        } else if (op.action === 'update') {
          const { id, ...updateData } = op.data;
          const { error } = await supabase.from('vehiculos').update(updateData).eq('id', id);
          if (error) throw new Error(error.message);
        }
        break;

      case 'installation':
        if (op.action === 'update') {
          const { vehicle_id, equipment_id, installed, notes } = op.data;

          // Try update; if nothing is updated (missing row), insert it.
          const { data: updatedRows, error: updateError } = await supabase
            .from('instalaciones')
            .update({
              installed,
              installed_at: installed ? new Date().toISOString() : null,
              notes: notes || null,
            })
            .eq('vehicle_id', vehicle_id)
            .eq('equipment_id', equipment_id)
            .select();

          if (updateError) throw new Error(updateError.message);

          if (!updatedRows || updatedRows.length === 0) {
            const { error: insertError } = await supabase.from('instalaciones').insert({
              vehicle_id,
              equipment_id,
              installed,
              installed_at: installed ? new Date().toISOString() : null,
              notes: notes || null,
            });
            if (insertError) throw new Error(insertError.message);
          }
        }
        break;

      case 'delivery':
        if (op.action === 'create') {
          const { id, photos, ...entregaData } = op.data;
          
          if (photos && Array.isArray(photos)) {
            const uploadedPhotos = [];
            for (const photo of photos) {
              if (photo && photo.startsWith('data:image')) {
                 const url = await uploadBase64ToStorage(photo, `entregas/${entregaData.vehicle_id}`);
                 uploadedPhotos.push(url);
              } else {
                 uploadedPhotos.push(photo);
              }
            }
            entregaData.foto_1 = uploadedPhotos[0] || null;
            entregaData.foto_2 = uploadedPhotos[1] || null;
            entregaData.foto_3 = uploadedPhotos[2] || null;
            entregaData.foto_4 = uploadedPhotos[3] || null;
          }

          // First insert the delivery
          const { error: deliveryError } = await supabase.from('vehiculos_entregados').insert(entregaData);
          if (deliveryError) throw new Error(deliveryError.message);
          // Then update vehicle status
          const { error: statusError } = await supabase.from('vehiculos').update({ status: 'completed' }).eq('id', entregaData.vehicle_id);
          if (statusError) throw new Error(statusError.message);
        }
        break;

      case 'audit':
        if (op.action === 'create') {
          const { error } = await supabase.from('auditorias').insert(op.data);
          if (error) throw new Error(error.message);
        }
        break;
    }
  };

  // Handle online/offline transitions
  // IMPORTANT: Only show popups for REAL connectivity changes, not app minimize/restore
  useEffect(() => {
    const prev = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    // First render: Don't show any popup
    if (prev === null) {
      logService.info('network', `Estado inicial de red: ${isOnline ? 'Online' : 'Offline'}`);
      return;
    }

    // Only react to REAL state changes (not just app resuming)
    if (prev === isOnline) {
      return;
    }

    // User actually went offline
    if (!isOnline && prev) {
      setIsOfflineMode(true);
      setShowOfflineWarning(true);
      logService.logOffline();
    } 
    // User actually came back online
    else if (isOnline && !prev) {
      setIsOfflineMode(false);
      logService.logOnline();
    }
  }, [isOnline]);

  // Handle sync when coming back online (wasOffline is only set on real offline)
  useEffect(() => {
    if (wasOffline && isOnline) {
      logService.info('sync', 'Conexión restaurada - iniciando sincronización');
      setShowOnlineSync(true);
      setIsOfflineMode(false);
      syncPendingOperations();
      clearWasOffline();
    }
  }, [wasOffline, isOnline, syncPendingOperations, clearWasOffline]);

  // Sync on app visibility change (user comes back to app)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isOnline && !isSyncing) {
        const operations = await offlineStorage.getPendingOperations();
        if (operations.length > 0) {
          logService.info('sync', `App visible con ${operations.length} operaciones pendientes - sincronizando`);
          syncPendingOperations();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOnline, isSyncing, syncPendingOperations]);

  // AUTO-SYNC: Check and sync pending operations on mount and when online status changes
  useEffect(() => {
    const autoSync = async () => {
      if (isOnline && user && !isSyncing) {
        const operations = await offlineStorage.getPendingOperations();
        if (operations.length > 0) {
          logService.info('sync', `Auto-sync: ${operations.length} operaciones pendientes detectadas`);
          syncPendingOperations();
        }
      }
    };

    // Run auto-sync after a short delay to let the app stabilize
    const timeoutId = setTimeout(autoSync, 2000);
    return () => clearTimeout(timeoutId);
  }, [isOnline, user, isSyncing, syncPendingOperations]);

  // PERIODIC AUTO-SYNC: Check every 30 seconds if there are pending operations
  useEffect(() => {
    if (!isOnline || !user) return;

    const intervalId = setInterval(async () => {
      if (isSyncing) return;
      
      const operations = await offlineStorage.getPendingOperations();
      if (operations.length > 0) {
        logService.info('sync', `Sync periódico: ${operations.length} operaciones pendientes`);
        syncPendingOperations();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(intervalId);
  }, [isOnline, user, isSyncing, syncPendingOperations]);

  // Download data once when user logs in
  useEffect(() => {
    if (user && isOnline && !hasDownloadedRef.current) {
      if (userRole === 'tecnico' || userRole === 'registrador' || userRole === 'admin') {
        downloadDataForOffline();
      }
    }
  }, [user, userRole, isOnline, downloadDataForOffline]);

  // Check pending operations once on mount
  useEffect(() => {
    checkPendingOperations();
  }, [checkPendingOperations]);

  const getOfflineData = async () => {
    return await offlineStorage.getOfflineData();
  };

  // Add pending operation - and try to sync immediately if online
  const addPendingOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp'>) => {
    const id = await offlineStorage.addPendingOperation(operation);
    await checkPendingOperations();
    
    logService.logOfflineOperation(operation.type);
    
    // If online, try to sync immediately
    if (isOnline && !isSyncing) {
      logService.info('sync', 'Operación añadida - sincronizando inmediatamente');
      // Small delay to batch multiple rapid operations
      setTimeout(() => {
        syncPendingOperations();
      }, 500);
    }
    
    return id;
  };

  const updateLocalData = async (type: string, data: any) => {
    switch (type) {
      case 'vehiculo':
        await offlineStorage.updateLocalVehiculo(data);
        break;
      case 'instalacion':
        await offlineStorage.updateLocalInstalacion(
          data.vehicle_id,
          data.equipment_id,
          data.installed,
          data.notes
        );
        break;
      case 'entrega':
        await offlineStorage.addLocalVehiculoEntregado(data);
        break;
    }
  };

  const dismissOfflineWarning = () => setShowOfflineWarning(false);
  const dismissOnlineSync = () => setShowOnlineSync(false);
  const clearSyncErrors = () => setSyncErrors([]);
  
  // Manual sync trigger for UI buttons
  const triggerManualSync = async () => {
    console.log('[SYNC] Manual sync triggered');
    logService.info('sync', 'Sincronización manual iniciada');
    setShowOnlineSync(true);
    await syncPendingOperations();
  };

  const value: OfflineContextType = {
    isOnline,
    isOfflineMode,
    isSyncing,
    syncProgress,
    pendingOperationsCount,
    showOfflineWarning,
    showOnlineSync,
    syncErrors,
    lastSyncResult,
    dismissOfflineWarning,
    dismissOnlineSync,
    downloadDataForOffline,
    getOfflineData,
    addPendingOperation,
    updateLocalData,
    clearSyncErrors,
    triggerManualSync,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

// Safe version that returns null instead of throwing
export function useOfflineSafe() {
  const context = useContext(OfflineContext);
  return context ?? null;
}
