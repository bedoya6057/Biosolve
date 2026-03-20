import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { offlineStorage } from '@/services/offlineStorage';
import { useOfflineSafe } from '@/contexts/OfflineContext';

export const uploadBase64ToStorage = async (base64String: string | null | undefined, folderName: string): Promise<string | null> => {
  if (!base64String || !base64String.startsWith('data:image')) return base64String || null;
  
  try {
    const res = await fetch(base64String);
    const blob = await res.blob();
    const filename = `${folderName}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { error } = await supabase.storage
      .from('photos')
      .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
      
    if (error) {
      console.error('Error uploading to storage:', error);
      return null;
    }
    
    const { data } = supabase.storage.from('photos').getPublicUrl(filename);
    return data.publicUrl;
  } catch (error) {
    console.error('Error converting/uploading photo:', error);
    return null;
  }
};

export interface EmpresaDB {
  id: string;
  name: string;
  ruc: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface ProyectoDB {
  id: string;
  name: string;
  company_id: string;
  equipment: string[];
  status: string;
  created_at: string;
}

export interface VehiculoDB {
  id: string;
  project_id: string;
  vin: string;
  plate: string | null;
  color: string;
  model: string;
  delivery_date: string;
  delivery_time: string;
  km_entry: string;
  check_items: Json;
  foto_1: string | null;
  foto_2: string | null;
  foto_3: string | null;
  foto_4: string | null;
  status: string;
  created_at: string;
  delivery_person_name: string | null;
  delivery_person_position: string | null;
  delivery_person_dni: string | null;
  delivery_signature: string | null;
  cochera: string | null;
  observations: string | null;
  dealer_sheet_photo: string | null;
}

export interface InstalacionDB {
  id: string;
  vehicle_id: string;
  equipment_id: string;
  installed: boolean;
  installed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface VehiculoEntregadoDB {
  id: string;
  vehicle_id: string;
  project_id: string;
  delivery_date: string;
  delivery_time: string;
  km_exit: string;
  check_items: Json;
  foto_1: string | null;
  foto_2: string | null;
  foto_3: string | null;
  foto_4: string | null;
  receiver_name: string;
  receiver_position: string;
  receiver_signature: string;
  notes: string | null;
  created_at: string;
}

// Cache for delivered vehicle IDs - computed once
const deliveredVehicleIdsCache = new Set<string>();

export function useProjectsDB() {
  const offlineContext = useOfflineSafe();
  const isOnline = offlineContext?.isOnline ?? true;
  const addPendingOperation =
    offlineContext?.addPendingOperation ??
    (async (operation) => offlineStorage.addPendingOperation(operation as any));

  const [empresas, setEmpresas] = useState<EmpresaDB[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoDB[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoDB[]>([]);
  const [instalaciones, setInstalaciones] = useState<InstalacionDB[]>([]);
  const [vehiculosEntregados, setVehiculosEntregados] = useState<VehiculoEntregadoDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedFromCacheRef = useRef(false);
  const isLoadingNetworkRef = useRef(false);

  // Update delivered cache when vehiculosEntregados changes
  useEffect(() => {
    deliveredVehicleIdsCache.clear();
    vehiculosEntregados.forEach(ve => deliveredVehicleIdsCache.add(ve.vehicle_id));
  }, [vehiculosEntregados]);

  // Load from offline cache first (instant)
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await offlineStorage.getOfflineData();
      if (cached && cached.empresas) {
        setEmpresas(cached.empresas || []);
        setProyectos(cached.proyectos || []);
        setVehiculos(cached.vehiculos || []);
        setInstalaciones(cached.instalaciones || []);
        setVehiculosEntregados(cached.vehiculosEntregados || []);
        loadedFromCacheRef.current = true;
        // Show UI immediately with cached data
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return false;
  }, []);

  // Fetch all data from network in parallel
  const fetchFromNetwork = useCallback(async (showLoading = true) => {
    if (isLoadingNetworkRef.current) return;
    isLoadingNetworkRef.current = true;

    if (showLoading && !loadedFromCacheRef.current) {
      setIsLoading(true);
    }

    try {
      // Fetch all in parallel for maximum speed
      const [empresasRes, proyectosRes, vehiculosRes, instalacionesRes, entregadosRes] = await Promise.all([
        supabase.from('empresas').select('*').order('created_at', { ascending: false }),
        supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
        supabase.from('vehiculos').select('*').order('created_at', { ascending: false }),
        supabase.from('instalaciones').select('*'),
        supabase.from('vehiculos_entregados').select('*').order('created_at', { ascending: false }),
      ]);

      // Only update if we got data (handle offline gracefully)
      if (!empresasRes.error && empresasRes.data) setEmpresas(empresasRes.data);
      if (!proyectosRes.error && proyectosRes.data) setProyectos(proyectosRes.data);
      if (!vehiculosRes.error && vehiculosRes.data) setVehiculos(vehiculosRes.data);
      if (!instalacionesRes.error && instalacionesRes.data) setInstalaciones(instalacionesRes.data);
      if (!entregadosRes.error && entregadosRes.data) setVehiculosEntregados(entregadosRes.data);

      // Save to cache for next time
      if (!empresasRes.error) {
        await offlineStorage.saveOfflineData({
          empresas: empresasRes.data || [],
          proyectos: proyectosRes.data || [],
          vehiculos: vehiculosRes.data || [],
          instalaciones: instalacionesRes.data || [],
          equipamiento: [], // Will be handled separately
          vehiculosEntregados: entregadosRes.data || [],
          lastSyncTimestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error fetching from network:', error);
      // Don't show error if we have cached data
      if (!loadedFromCacheRef.current) {
        toast.error('Error al cargar datos');
      }
    } finally {
      isLoadingNetworkRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Initial load: cache first, then network
  useEffect(() => {
    const init = async () => {
      const hasCached = await loadFromCache();
      // Fetch from network in background (or as primary if no cache)
      fetchFromNetwork(!hasCached);
    };
    init();
  }, [loadFromCache, fetchFromNetwork]);

  const addEmpresa = useCallback(async (empresa: { name: string; ruc?: string; contact?: string; phone?: string; email?: string }) => {
    const { data, error } = await supabase
      .from('empresas')
      .insert({
        name: empresa.name,
        ruc: empresa.ruc || null,
        contact: empresa.contact || null,
        phone: empresa.phone || null,
        email: empresa.email || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding empresa:', error);
      toast.error('Error al guardar empresa');
      return null;
    }

    setEmpresas(prev => [data, ...prev]);
    toast.success('Empresa guardada correctamente');
    return data;
  }, []);

  const addProyecto = useCallback(async (proyecto: { name: string; company_id: string; equipment: string[]; status?: string }) => {
    const { data, error } = await supabase
      .from('proyectos')
      .insert({
        name: proyecto.name,
        company_id: proyecto.company_id,
        equipment: proyecto.equipment,
        status: proyecto.status || 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding proyecto:', error);
      toast.error('Error al guardar proyecto');
      return null;
    }

    setProyectos(prev => [data, ...prev]);
    toast.success('Proyecto guardado correctamente');
    return data;
  }, []);

  const addVehiculo = useCallback(async (vehiculo: {
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
    dealer_sheet_photo?: string;
  }) => {
    const vehiculoData = {
      project_id: vehiculo.project_id,
      vin: vehiculo.vin,
      plate: vehiculo.plate || null,
      color: vehiculo.color,
      model: vehiculo.model,
      delivery_date: vehiculo.delivery_date,
      delivery_time: vehiculo.delivery_time,
      km_entry: vehiculo.km_entry,
      check_items: vehiculo.check_items,
      foto_1: vehiculo.photos[0] || null,
      foto_2: vehiculo.photos[1] || null,
      foto_3: vehiculo.photos[2] || null,
      foto_4: vehiculo.photos[3] || null,
      status: vehiculo.status || 'pending',
      delivery_person_name: vehiculo.delivery_person_name || null,
      delivery_person_position: vehiculo.delivery_person_position || null,
      delivery_person_dni: vehiculo.delivery_person_dni || null,
      delivery_signature: vehiculo.delivery_signature || null,
      cochera: vehiculo.cochera || null,
      observations: vehiculo.observations || null,
      dealer_sheet_photo: vehiculo.dealer_sheet_photo || null,
    };

    // OFFLINE PATH
    if (!isOnline) {
      try {
        // Stable UUID is critical so later offline installation updates reference the same vehicle.
        const stableId =
          globalThis.crypto?.randomUUID?.() ??
          `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const proyecto = proyectos.find((p) => p.id === vehiculo.project_id);
        const equipmentIds = proyecto?.equipment ?? [];

        const offlineVehiculo: VehiculoDB = {
          ...(vehiculoData as any),
          id: stableId,
          created_at: new Date().toISOString(),
        };

        // Queue creation INCLUDING id + equipment list for server-side instalaciones creation.
        await addPendingOperation({
          type: 'vehicle',
          action: 'create',
          data: {
            ...vehiculoData,
            id: stableId,
            __equipment_ids: equipmentIds,
          },
        });

        await offlineStorage.updateLocalVehiculo(offlineVehiculo);
        setVehiculos((prev) => [offlineVehiculo, ...prev]);

        // Create local instalaciones for UI progress while offline
        if (equipmentIds.length > 0) {
          const createdAt = new Date().toISOString();
          const localInstalaciones: InstalacionDB[] = equipmentIds.map((equipmentId, idx) => ({
            id: `offline_inst_${Date.now()}_${idx}`,
            vehicle_id: stableId,
            equipment_id: equipmentId,
            installed: false,
            installed_at: null,
            notes: null,
            created_at: createdAt,
          }));
          setInstalaciones((prev) => [...prev, ...localInstalaciones]);
        }

        toast.success('Vehículo guardado localmente (se sincronizará cuando haya conexión)');
        return offlineVehiculo;
      } catch (e) {
        console.error('Error saving vehiculo offline:', e);
        toast.error('Error al guardar vehículo en modo offline');
        return null;
      }
    }

    // ONLINE PATH
    const uploadedPhotos = [];
    for (const photo of vehiculo.photos) {
      if (photo) {
        const url = await uploadBase64ToStorage(photo, `vehiculos/${vehiculo.vin}`);
        uploadedPhotos.push(url);
      }
    }
    
    let dealerSheetUrl = vehiculo.dealer_sheet_photo || null;
    if (vehiculo.dealer_sheet_photo) {
       dealerSheetUrl = await uploadBase64ToStorage(vehiculo.dealer_sheet_photo, `fichas/${vehiculo.vin}`);
    }

    const onlineVehiculoData = {
      ...vehiculoData,
      foto_1: uploadedPhotos[0] || null,
      foto_2: uploadedPhotos[1] || null,
      foto_3: uploadedPhotos[2] || null,
      foto_4: uploadedPhotos[3] || null,
      dealer_sheet_photo: dealerSheetUrl,
    };

    const { data, error } = await supabase
      .from('vehiculos')
      .insert(onlineVehiculoData)
      .select()
      .single();

    if (error) {
      console.error('Error adding vehiculo:', error);
      toast.error('Error al guardar vehículo');
      return null;
    }

    // Create installation records for the project's equipment
    const proyecto = proyectos.find((p) => p.id === vehiculo.project_id);
    if (proyecto && proyecto.equipment.length > 0) {
      const instalacionesData = proyecto.equipment.map((equipmentId) => ({
        vehicle_id: data.id,
        equipment_id: equipmentId,
        installed: false,
      }));

      const { data: newInstalaciones, error: instError } = await supabase
        .from('instalaciones')
        .insert(instalacionesData)
        .select();

      if (instError) {
        console.error('Error creating instalaciones:', instError);
      } else if (newInstalaciones) {
        setInstalaciones((prev) => [...prev, ...newInstalaciones]);
      }
    }

    setVehiculos((prev) => [data, ...prev]);
    toast.success('Vehículo guardado correctamente');
    return data;
  }, [isOnline, proyectos, addPendingOperation]);

  const updateInstalacion = useCallback(async (vehicleId: string, equipmentId: string, installed: boolean, notes?: string) => {
    if (!isOnline) {
      try {
        await addPendingOperation({
          type: 'installation',
          action: 'update',
          data: { vehicle_id: vehicleId, equipment_id: equipmentId, installed, notes },
        });

        await offlineStorage.updateLocalInstalacion(vehicleId, equipmentId, installed, notes);
        toast.success('Instalación guardada localmente');
      } catch (e) {
        console.error('Error saving instalacion offline:', e);
        toast.error('Error al guardar instalación en modo offline');
      }

      setInstalaciones((prev) =>
        prev.map((i) =>
          i.vehicle_id === vehicleId && i.equipment_id === equipmentId
            ? { ...i, installed, installed_at: installed ? new Date().toISOString() : null, notes: notes || null }
            : i
        )
      );
      return;
    }

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

    setInstalaciones((prev) =>
      prev.map((i) =>
        i.vehicle_id === vehicleId && i.equipment_id === equipmentId
          ? { ...i, installed, installed_at: installed ? new Date().toISOString() : null, notes: notes || null }
          : i
      )
    );
  }, [isOnline, addPendingOperation]);

  const getEmpresaById = useCallback((id: string) => {
    return empresas.find(e => e.id === id);
  }, [empresas]);

  const getVehicleProgress = useCallback((vehicleId: string) => {
    const vehicleInstalaciones = instalaciones.filter(i => i.vehicle_id === vehicleId);
    if (vehicleInstalaciones.length === 0) return 0;
    const installed = vehicleInstalaciones.filter(i => i.installed).length;
    return Math.round((installed / vehicleInstalaciones.length) * 100);
  }, [instalaciones]);

  const searchVehicle = useCallback((query: string) => {
    const normalizedQuery = query.toUpperCase().trim();
    return vehiculos.find(v =>
      v.vin.toUpperCase().includes(normalizedQuery) ||
      (v.plate && v.plate.toUpperCase().includes(normalizedQuery))
    );
  }, [vehiculos]);

  const deliverVehicle = useCallback(async (entrega: {
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
    if (!isOnline) {
      try {
        await addPendingOperation({
          type: 'delivery',
          action: 'create',
          data: entrega,
        });

        await offlineStorage.addLocalVehiculoEntregado(entrega);

        // Update local state (mirror what UI expects)
        setVehiculos((prev) => prev.map((v) => (v.id === entrega.vehicle_id ? { ...v, status: 'completed' } : v)));

        const offlineEntrega: VehiculoEntregadoDB = {
          id: `offline_${Date.now()}`,
          vehicle_id: entrega.vehicle_id,
          project_id: entrega.project_id,
          delivery_date: entrega.delivery_date,
          delivery_time: entrega.delivery_time,
          km_exit: entrega.km_exit,
          check_items: entrega.check_items,
          foto_1: entrega.photos[0] || null,
          foto_2: entrega.photos[1] || null,
          foto_3: entrega.photos[2] || null,
          foto_4: entrega.photos[3] || null,
          receiver_name: entrega.receiver_name,
          receiver_position: entrega.receiver_position,
          receiver_signature: entrega.receiver_signature,
          notes: entrega.notes || null,
          created_at: new Date().toISOString(),
        };

        setVehiculosEntregados((prev) => [offlineEntrega, ...prev]);
        toast.success('Entrega guardada localmente (se sincronizará cuando haya conexión)');
        return offlineEntrega;
      } catch (e) {
        console.error('Error saving delivery offline:', e);
        toast.error('Error al guardar entrega en modo offline');
        return null;
      }
    }

    // Online: Upload photos first
    const uploadedPhotos = [];
    for (const photo of entrega.photos) {
      if (photo) {
        const url = await uploadBase64ToStorage(photo, `entregas/${entrega.vehicle_id}`);
        uploadedPhotos.push(url);
      }
    }

    const { data, error } = await supabase
      .from('vehiculos_entregados')
      .insert({
        vehicle_id: entrega.vehicle_id,
        project_id: entrega.project_id,
        delivery_date: entrega.delivery_date,
        delivery_time: entrega.delivery_time,
        km_exit: entrega.km_exit,
        check_items: entrega.check_items,
        foto_1: uploadedPhotos[0] || null,
        foto_2: uploadedPhotos[1] || null,
        foto_3: uploadedPhotos[2] || null,
        foto_4: uploadedPhotos[3] || null,
        receiver_name: entrega.receiver_name,
        receiver_position: entrega.receiver_position,
        receiver_signature: entrega.receiver_signature,
        notes: entrega.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error delivering vehicle:', error);
      toast.error('Error al registrar entrega');
      return null;
    }

    // Update vehicle status to completed
    const { error: updateError } = await supabase
      .from('vehiculos')
      .update({ status: 'completed' })
      .eq('id', entrega.vehicle_id);

    if (updateError) {
      console.error('Error updating vehicle status:', updateError);
    }

    // Update state optimistically instead of refetching
    setVehiculosEntregados((prev) => [data, ...prev]);
    setVehiculos((prev) => prev.map((v) => (v.id === entrega.vehicle_id ? { ...v, status: 'completed' } : v)));

    toast.success('Vehículo entregado correctamente');
    return data;
  }, [isOnline, addPendingOperation]);

  // Memoized Set of delivered vehicle IDs for O(1) lookup
  const deliveredVehicleIds = useMemo(() => {
    return new Set(vehiculosEntregados.map(ve => ve.vehicle_id));
  }, [vehiculosEntregados]);

  // Get vehicles that haven't been delivered yet
  const getVehiculosPendientes = useCallback((projectId?: string) => {
    return vehiculos.filter(v => {
      const notDelivered = !deliveredVehicleIds.has(v.id);
      if (projectId) {
        return notDelivered && v.project_id === projectId;
      }
      return notDelivered;
    });
  }, [vehiculos, deliveredVehicleIds]);

  const isVehicleDelivered = useCallback((vehicleId: string) => {
    return deliveredVehicleIds.has(vehicleId);
  }, [deliveredVehicleIds]);

  const updateVehiclePlate = useCallback(async (vehicleId: string, plate: string) => {
    const { error } = await supabase
      .from('vehiculos')
      .update({ plate })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error updating vehicle plate:', error);
      toast.error('Error al actualizar la placa');
      throw error;
    }

    setVehiculos(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, plate } : v
    ));
  }, []);

  const updateVehicleCochera = useCallback(async (vehicleId: string, cochera: string) => {
    const { error } = await supabase
      .from('vehiculos')
      .update({ cochera })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error updating vehicle cochera:', error);
      toast.error('Error al actualizar la cochera');
      throw error;
    }

    setVehiculos(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, cochera } : v
    ));
  }, []);

  const updateVehicleObservations = useCallback(async (vehicleId: string, observations: string) => {
    const { error } = await supabase
      .from('vehiculos')
      .update({ observations: observations || null })
      .eq('id', vehicleId);

    if (error) {
      console.error('Error updating vehicle observations:', error);
      toast.error('Error al guardar comentarios');
      throw error;
    }

    setVehiculos(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, observations: observations || null } : v
    ));
  }, []);

  const updateVehicleProject = useCallback(async (vehicleId: string, newProjectId: string) => {
    // Update vehiculos table
    const { error: vehiculoError } = await supabase
      .from('vehiculos')
      .update({ project_id: newProjectId })
      .eq('id', vehicleId);

    if (vehiculoError) {
      console.error('Error updating vehicle project:', vehiculoError);
      toast.error('Error al actualizar el proyecto del vehículo');
      throw vehiculoError;
    }

    // Delete existing installations for this vehicle
    const { error: deleteError } = await supabase
      .from('instalaciones')
      .delete()
      .eq('vehicle_id', vehicleId);

    if (deleteError) {
      console.error('Error deleting old installations:', deleteError);
    }

    // Create new installations based on the new project's equipment
    const newProyecto = proyectos.find(p => p.id === newProjectId);
    let newInstalacionesData: InstalacionDB[] = [];
    
    if (newProyecto && newProyecto.equipment.length > 0) {
      const instalacionesInsert = newProyecto.equipment.map(equipmentId => ({
        vehicle_id: vehicleId,
        equipment_id: equipmentId,
        installed: false,
      }));

      const { data: insertedInstalaciones, error: insertError } = await supabase
        .from('instalaciones')
        .insert(instalacionesInsert)
        .select();

      if (insertError) {
        console.error('Error creating new installations:', insertError);
      } else {
        newInstalacionesData = insertedInstalaciones || [];
      }
    }

    // Update state optimistically
    setVehiculos(prev => prev.map(v =>
      v.id === vehicleId ? { ...v, project_id: newProjectId } : v
    ));
    setInstalaciones(prev => [
      ...prev.filter(i => i.vehicle_id !== vehicleId),
      ...newInstalacionesData
    ]);

    toast.success('Vehículo transferido a nuevo proyecto');
  }, [proyectos]);

  const updateEmpresa = useCallback(async (id: string, data: { name: string; ruc?: string; contact?: string }) => {
    const { error } = await supabase
      .from('empresas')
      .update({
        name: data.name,
        ruc: data.ruc || null,
        contact: data.contact || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating empresa:', error);
      toast.error('Error al actualizar empresa');
      throw error;
    }

    setEmpresas(prev => prev.map(e =>
      e.id === id ? { ...e, name: data.name, ruc: data.ruc || null, contact: data.contact || null } : e
    ));
    toast.success('Empresa actualizada correctamente');
  }, []);

  const deleteEmpresa = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting empresa:', error);
      toast.error('Error al eliminar empresa. Puede tener proyectos asociados.');
      throw error;
    }

    setEmpresas(prev => prev.filter(e => e.id !== id));
    toast.success('Empresa eliminada correctamente');
  }, []);

  const updateProyectoEquipment = useCallback(async (id: string, equipment: string[]) => {
    const { error } = await supabase
      .from('proyectos')
      .update({ equipment })
      .eq('id', id);

    if (error) {
      console.error('Error updating proyecto equipment:', error);
      toast.error('Error al actualizar equipamiento del proyecto');
      throw error;
    }

    // Sync installations for all vehicles in this project
    const projectVehicles = vehiculos.filter(v => v.project_id === id);
    for (const vehicle of projectVehicles) {
      // Get existing installations for this vehicle
      const { data: existingInstalls } = await supabase
        .from('instalaciones')
        .select('equipment_id')
        .eq('vehicle_id', vehicle.id);

      const existingIds = new Set((existingInstalls || []).map(i => i.equipment_id));

      // Add missing equipment installations
      const newInstalls = equipment
        .filter(eqId => !existingIds.has(eqId))
        .map(eqId => ({
          vehicle_id: vehicle.id,
          equipment_id: eqId,
          installed: false,
        }));

      if (newInstalls.length > 0) {
        await supabase.from('instalaciones').insert(newInstalls);
      }

      // Remove installations for equipment no longer in the project
      const equipmentSet = new Set(equipment);
      const toRemove = (existingInstalls || [])
        .filter(i => !equipmentSet.has(i.equipment_id))
        .map(i => i.equipment_id);

      if (toRemove.length > 0) {
        for (const eqId of toRemove) {
          await supabase
            .from('instalaciones')
            .delete()
            .eq('vehicle_id', vehicle.id)
            .eq('equipment_id', eqId);
        }
      }
    }

    // Refresh instalaciones state
    const { data: allInstalls } = await supabase.from('instalaciones').select('*');
    if (allInstalls) {
      setInstalaciones(allInstalls);
    }

    setProyectos(prev => prev.map(p =>
      p.id === id ? { ...p, equipment } : p
    ));
    toast.success('Equipamiento del proyecto actualizado');
  }, [vehiculos]);

  const checkVinExists = useCallback((vin: string, excludeVehicleId?: string) => {
    const normalizedVin = vin.toUpperCase().trim();
    return vehiculos.some(v => 
      v.vin.toUpperCase().trim() === normalizedVin && v.id !== excludeVehicleId
    );
  }, [vehiculos]);

  const checkPlateExists = useCallback((plate: string, excludeVehicleId?: string) => {
    if (!plate || !plate.trim()) return false;
    const normalizedPlate = plate.toUpperCase().trim();
    return vehiculos.some(v => 
      v.plate && v.plate.toUpperCase().trim() === normalizedPlate && v.id !== excludeVehicleId
    );
  }, [vehiculos]);

  const deleteVehiculo = useCallback(async (vehicleId: string) => {
    // Delete auditorias for this vehicle
    const { error: auditError } = await supabase
      .from('auditorias')
      .delete()
      .eq('vehicle_id', vehicleId);
    if (auditError) console.error('Error deleting auditorias:', auditError);

    // Delete instalaciones for this vehicle
    const { error: instError } = await supabase
      .from('instalaciones')
      .delete()
      .eq('vehicle_id', vehicleId);
    if (instError) console.error('Error deleting instalaciones:', instError);

    // Delete vehiculos_entregados for this vehicle
    const { error: entregadosError } = await supabase
      .from('vehiculos_entregados')
      .delete()
      .eq('vehicle_id', vehicleId);
    if (entregadosError) console.error('Error deleting vehiculos_entregados:', entregadosError);

    // Delete the vehicle itself
    const { error } = await supabase
      .from('vehiculos')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      console.error('Error deleting vehiculo:', error);
      toast.error('Error al eliminar vehículo');
      throw error;
    }

    // Update state
    setVehiculos(prev => prev.filter(v => v.id !== vehicleId));
    setInstalaciones(prev => prev.filter(i => i.vehicle_id !== vehicleId));
    setVehiculosEntregados(prev => prev.filter(ve => ve.vehicle_id !== vehicleId));
    
    toast.success('Vehículo eliminado correctamente');
  }, []);

  const deleteProyecto = useCallback(async (projectId: string) => {
    // Get all vehicles for this project
    const projectVehicleIds = vehiculos.filter(v => v.project_id === projectId).map(v => v.id);

    // Delete auditorias for all project vehicles
    if (projectVehicleIds.length > 0) {
      const { error: auditError } = await supabase
        .from('auditorias')
        .delete()
        .in('vehicle_id', projectVehicleIds);
      if (auditError) console.error('Error deleting auditorias:', auditError);

      // Delete instalaciones for all project vehicles
      const { error: instError } = await supabase
        .from('instalaciones')
        .delete()
        .in('vehicle_id', projectVehicleIds);
      if (instError) console.error('Error deleting instalaciones:', instError);

      // Delete vehiculos_entregados for all project vehicles
      const { error: entregadosError } = await supabase
        .from('vehiculos_entregados')
        .delete()
        .in('vehicle_id', projectVehicleIds);
      if (entregadosError) console.error('Error deleting vehiculos_entregados:', entregadosError);

      // Delete all vehicles for this project
      const { error: vehiculosError } = await supabase
        .from('vehiculos')
        .delete()
        .eq('project_id', projectId);
      if (vehiculosError) {
        console.error('Error deleting vehiculos:', vehiculosError);
        toast.error('Error al eliminar vehículos del proyecto');
        throw vehiculosError;
      }
    }

    // Finally delete the project itself
    const { error } = await supabase
      .from('proyectos')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting proyecto:', error);
      toast.error('Error al eliminar proyecto');
      throw error;
    }

    // Update state
    setProyectos(prev => prev.filter(p => p.id !== projectId));
    setVehiculos(prev => prev.filter(v => v.project_id !== projectId));
    setInstalaciones(prev => prev.filter(i => !projectVehicleIds.includes(i.vehicle_id)));
    setVehiculosEntregados(prev => prev.filter(ve => !projectVehicleIds.includes(ve.vehicle_id)));
    
    toast.success('Proyecto y todos sus registros eliminados correctamente');
  }, [vehiculos]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    fetchFromNetwork(false);
  }, [fetchFromNetwork]);

  return {
    empresas,
    proyectos,
    vehiculos,
    instalaciones,
    vehiculosEntregados,
    isLoading,
    addEmpresa,
    addProyecto,
    addVehiculo,
    updateInstalacion,
    deliverVehicle,
    getEmpresaById,
    getVehicleProgress,
    searchVehicle,
    getVehiculosPendientes,
    isVehicleDelivered,
    updateVehiclePlate,
    updateVehicleCochera,
    updateVehicleProject,
    updateVehicleObservations,
    updateEmpresa,
    deleteEmpresa,
    updateProyectoEquipment,
    deleteProyecto,
    deleteVehiculo,
    checkVinExists,
    checkPlateExists,
    refetch,
  };
}
