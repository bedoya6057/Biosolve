import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOfflineSafe } from '@/contexts/OfflineContext';
import type { Json } from '@/integrations/supabase/types';
import type { EmpresaDB, ProyectoDB, VehiculoDB, InstalacionDB, VehiculoEntregadoDB } from './useProjectsDB';

export function useProjectsDBOffline() {
  const offlineContext = useOfflineSafe();
  const isOnline = offlineContext?.isOnline ?? true;
  const isOfflineMode = offlineContext?.isOfflineMode ?? false;
  const getOfflineData = offlineContext?.getOfflineData ?? (async () => null);
  const addPendingOperation = offlineContext?.addPendingOperation ?? (async () => '');
  const updateLocalData = offlineContext?.updateLocalData ?? (async () => {});
  
  const [empresas, setEmpresas] = useState<EmpresaDB[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoDB[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoDB[]>([]);
  const [instalaciones, setInstalaciones] = useState<InstalacionDB[]>([]);
  const [vehiculosEntregados, setVehiculosEntregados] = useState<VehiculoEntregadoDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch from Supabase (online mode)
  const fetchFromSupabase = useCallback(async () => {
    const [empresasRes, proyectosRes, vehiculosRes, instalacionesRes, entregadosRes] = await Promise.all([
      supabase.from('empresas').select('*').order('created_at', { ascending: false }),
      supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
      supabase.from('vehiculos').select('*').order('created_at', { ascending: false }),
      supabase.from('instalaciones').select('*'),
      supabase.from('vehiculos_entregados').select('*').order('created_at', { ascending: false }),
    ]);

    if (!empresasRes.error) setEmpresas(empresasRes.data || []);
    if (!proyectosRes.error) setProyectos(proyectosRes.data || []);
    if (!vehiculosRes.error) setVehiculos(vehiculosRes.data || []);
    if (!instalacionesRes.error) setInstalaciones(instalacionesRes.data || []);
    if (!entregadosRes.error) setVehiculosEntregados(entregadosRes.data || []);
  }, []);

  // Load from local storage (offline mode)
  const loadFromOfflineStorage = useCallback(async () => {
    try {
      const data = await getOfflineData();
      if (data) {
        setEmpresas(data.empresas || []);
        setProyectos(data.proyectos || []);
        setVehiculos(data.vehiculos || []);
        setInstalaciones(data.instalaciones || []);
        setVehiculosEntregados(data.vehiculosEntregados || []);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  }, [getOfflineData]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (isOnline) {
        await fetchFromSupabase();
      } else {
        await loadFromOfflineStorage();
      }
      setIsLoading(false);
    };
    loadData();
  }, [isOnline, fetchFromSupabase, loadFromOfflineStorage]);

  // Add vehicle (with offline support)
  const addVehiculo = async (vehiculo: {
    project_id: string;
    vin: string;
    plate?: string;
    color: string;
    model: string;
    delivery_date: string;
    delivery_time: string;
    km_entry: string;
    check_items: Json;
    photos: string[];
    status?: string;
    delivery_person_name?: string;
    delivery_person_position?: string;
    delivery_person_dni?: string;
    delivery_signature?: string;
    cochera?: string;
    observations?: string;
  }) => {
    const vehiculoData = {
      ...vehiculo,
      plate: vehiculo.plate || null,
      status: vehiculo.status || 'pending',
      delivery_person_name: vehiculo.delivery_person_name || null,
      delivery_person_position: vehiculo.delivery_person_position || null,
      delivery_person_dni: vehiculo.delivery_person_dni || null,
      delivery_signature: vehiculo.delivery_signature || null,
      cochera: vehiculo.cochera || null,
      observations: vehiculo.observations || null,
    };

    if (isOnline) {
      // Online: save directly to Supabase
      const { data, error } = await supabase
        .from('vehiculos')
        .insert(vehiculoData)
        .select()
        .single();

      if (error) {
        console.error('Error adding vehiculo:', error);
        toast.error('Error al guardar vehículo');
        return null;
      }

      // Create installation records
      const proyecto = proyectos.find(p => p.id === vehiculo.project_id);
      if (proyecto && proyecto.equipment.length > 0) {
        const instalacionesData = proyecto.equipment.map(equipmentId => ({
          vehicle_id: data.id,
          equipment_id: equipmentId,
          installed: false,
        }));

        const { data: newInstalaciones } = await supabase
          .from('instalaciones')
          .insert(instalacionesData)
          .select();

        if (newInstalaciones) {
          setInstalaciones(prev => [...prev, ...newInstalaciones]);
        }
      }

      setVehiculos(prev => [data, ...prev]);
      toast.success('Vehículo guardado correctamente');
      return data;
    }

    // Offline: IMPORTANT: use a stable UUID so later offline operations reference the SAME id when syncing
    const stableId = (globalThis.crypto?.randomUUID?.() ?? `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`) as string;
    const proyecto = proyectos.find(p => p.id === vehiculo.project_id);
    const equipmentIds = proyecto?.equipment ?? [];

    const offlineVehiculo = {
      ...vehiculoData,
      id: stableId,
      created_at: new Date().toISOString(),
    };

    // Queue vehicle creation INCLUDING id + equipment list (so sync can create instalaciones)
    await addPendingOperation({
      type: 'vehicle',
      action: 'create',
      data: {
        ...vehiculoData,
        id: stableId,
        __equipment_ids: equipmentIds,
      },
    });

    // Update local storage + state
    await updateLocalData('vehiculo', offlineVehiculo);
    setVehiculos(prev => [offlineVehiculo as VehiculoDB, ...prev]);

    // Create local installation records (for UI progress while offline)
    if (equipmentIds.length > 0) {
      const newInstalaciones = equipmentIds.map((equipmentId, idx) => ({
        id: `offline_inst_${Date.now()}_${idx}`,
        vehicle_id: stableId,
        equipment_id: equipmentId,
        installed: false,
        installed_at: null,
        notes: null,
        created_at: new Date().toISOString(),
      }));
      setInstalaciones(prev => [...prev, ...newInstalaciones]);
    }

    toast.success('Vehículo guardado localmente (se sincronizará cuando haya conexión)');
    return offlineVehiculo;
  };

  // Update installation (with offline support)
  const updateInstalacion = async (vehicleId: string, equipmentId: string, installed: boolean, notes?: string) => {
    if (isOnline) {
      const { error } = await supabase
        .from('instalaciones')
        .update({
          installed,
          installed_at: installed ? new Date().toISOString() : null,
          notes: notes || null,
        })
        .eq('vehicle_id', vehicleId)
        .eq('equipment_id', equipmentId);

      if (error) {
        console.error('Error updating instalacion:', error);
        toast.error('Error al actualizar instalación');
        return;
      }
    } else {
      // Queue for sync
      await addPendingOperation({
        type: 'installation',
        action: 'update',
        data: { vehicle_id: vehicleId, equipment_id: equipmentId, installed, notes },
      });

      // Update local storage
      await updateLocalData('instalacion', {
        vehicle_id: vehicleId,
        equipment_id: equipmentId,
        installed,
        notes,
      });

      toast.success('Instalación guardada localmente');
    }

    // Update state regardless of mode
    setInstalaciones(prev => prev.map(i =>
      i.vehicle_id === vehicleId && i.equipment_id === equipmentId
        ? { ...i, installed, installed_at: installed ? new Date().toISOString() : null, notes: notes || null }
        : i
    ));
  };

  // Deliver vehicle (with offline support)
  const deliverVehicle = async (entrega: {
    vehicle_id: string;
    project_id: string;
    delivery_date: string;
    delivery_time: string;
    km_exit: string;
    check_items: Json;
    photos: string[];
    receiver_name: string;
    receiver_position: string;
    receiver_signature: string;
    notes?: string;
  }) => {
    if (isOnline) {
      const { data, error } = await supabase
        .from('vehiculos_entregados')
        .insert({
          ...entrega,
          notes: entrega.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error delivering vehicle:', error);
        toast.error('Error al registrar entrega');
        return null;
      }

      await supabase
        .from('vehiculos')
        .update({ status: 'completed' })
        .eq('id', entrega.vehicle_id);

      await fetchFromSupabase();
      toast.success('Vehículo entregado correctamente');
      return data;
    } else {
      // Queue for sync
      await addPendingOperation({
        type: 'delivery',
        action: 'create',
        data: entrega,
      });

      // Update local
      await updateLocalData('entrega', entrega);

      // Update local state
      setVehiculos(prev => prev.map(v =>
        v.id === entrega.vehicle_id ? { ...v, status: 'completed' } : v
      ));

      const offlineEntrega = {
        ...entrega,
        id: `offline_${Date.now()}`,
        created_at: new Date().toISOString(),
        notes: entrega.notes || null,
      };
      setVehiculosEntregados(prev => [offlineEntrega as VehiculoEntregadoDB, ...prev]);

      toast.success('Entrega guardada localmente (se sincronizará cuando haya conexión)');
      return offlineEntrega;
    }
  };

  // Helper functions (same as original)
  const getEmpresaById = (id: string) => empresas.find(e => e.id === id);
  
  const getVehicleProgress = (vehicleId: string) => {
    const vehicleInstalaciones = instalaciones.filter(i => i.vehicle_id === vehicleId);
    if (vehicleInstalaciones.length === 0) return 0;
    const installed = vehicleInstalaciones.filter(i => i.installed).length;
    return Math.round((installed / vehicleInstalaciones.length) * 100);
  };

  const searchVehicle = (query: string) => {
    const normalizedQuery = query.toUpperCase().trim();
    return vehiculos.find(v =>
      v.vin.toUpperCase().includes(normalizedQuery) ||
      (v.plate && v.plate.toUpperCase().includes(normalizedQuery))
    );
  };

  const getVehiculosPendientes = (projectId?: string) => {
    const entregadosIds = new Set(vehiculosEntregados.map(ve => ve.vehicle_id));
    return vehiculos.filter(v => {
      const notDelivered = !entregadosIds.has(v.id);
      if (projectId) {
        return notDelivered && v.project_id === projectId;
      }
      return notDelivered;
    });
  };

  const isVehicleDelivered = (vehicleId: string) => {
    return vehiculosEntregados.some(ve => ve.vehicle_id === vehicleId);
  };

  return {
    empresas,
    proyectos,
    vehiculos,
    instalaciones,
    vehiculosEntregados,
    isLoading,
    isOfflineMode,
    addVehiculo,
    updateInstalacion,
    deliverVehicle,
    getEmpresaById,
    getVehicleProgress,
    searchVehicle,
    getVehiculosPendientes,
    isVehicleDelivered,
    refetchVehiculos: fetchFromSupabase,
    refetchVehiculosEntregados: fetchFromSupabase,
    refetchInstalaciones: fetchFromSupabase,
  };
}
