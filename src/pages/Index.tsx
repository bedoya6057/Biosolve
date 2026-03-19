import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { UserManagement } from "@/components/admin/UserManagement";
import { VehicleRegistration } from "@/components/register/VehicleRegistration";
import { VehicleDelivery } from "@/components/register/VehicleDelivery";
import { EquipmentTracker } from "@/components/equipment/EquipmentTracker";
import { ExtraModule } from "@/components/extra/ExtraModule";
import { AuditModule } from "@/components/audit/AuditModule";
import { useProjectsDB } from "@/hooks/useProjectsDB";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSafe } from "@/contexts/OfflineContext";
import { Loader2, WifiOff } from "lucide-react";
import { Company, Project, Vehicle, EquipmentInstallation } from "@/types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { TabType } from "@/types";

const Index = () => {
  const { userRole, isAdmin, isRegistrador, isTecnico, isAuditor } = useAuth();
  const offlineContext = useOfflineSafe();
  const isOnline = offlineContext?.isOnline ?? true;
  const pendingOperationsCount = offlineContext?.pendingOperationsCount ?? 0;
  
  // Set default tab based on user role
  const getDefaultTab = useCallback((): TabType => {
    if (isAdmin) return 'admin';
    if (isRegistrador) return 'register';
    if (isTecnico) return 'equipment';
    if (isAuditor) return 'audit';
    return 'register';
  }, [isAdmin, isRegistrador, isTecnico, isAuditor]);

  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTab());

  // Update active tab when role changes
  useEffect(() => {
    setActiveTab(getDefaultTab());
  }, [getDefaultTab]);

  const {
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
  } = useProjectsDB();

  // Memoize mapped data to prevent re-renders
  const companies: Company[] = useMemo(() => empresas.map(e => ({
    id: e.id,
    name: e.name,
    ruc: e.ruc || undefined,
    contact: e.contact || undefined,
    phone: e.phone || undefined,
    email: e.email || undefined,
    createdAt: new Date(e.created_at),
  })), [empresas]);

  const projects: Project[] = useMemo(() => proyectos.map(p => ({
    id: p.id,
    name: p.name,
    companyId: p.company_id,
    equipment: p.equipment,
    status: p.status as 'active' | 'completed' | 'paused',
    createdAt: new Date(p.created_at),
  })), [proyectos]);

  const vehicles: Vehicle[] = useMemo(() => vehiculos.map(v => ({
    id: v.id,
    projectId: v.project_id,
    vin: v.vin,
    plate: v.plate || '',
    color: v.color,
    model: v.model,
    deliveryDate: v.delivery_date,
    deliveryTime: v.delivery_time,
    kmEntry: v.km_entry,
    checkItems: v.check_items as unknown as Vehicle['checkItems'],
    photos: v.photos,
    status: v.status as Vehicle['status'],
    createdAt: new Date(v.created_at),
    deliveryPersonName: v.delivery_person_name || undefined,
    deliveryPersonPosition: v.delivery_person_position || undefined,
    deliveryPersonDni: v.delivery_person_dni || undefined,
    deliverySignature: v.delivery_signature || undefined,
    cochera: v.cochera || undefined,
    observations: v.observations || undefined,
    dealerSheetPhoto: v.dealer_sheet_photo || undefined,
  })), [vehiculos]);

  const installations: EquipmentInstallation[] = useMemo(() => instalaciones.map(i => ({
    vehicleId: i.vehicle_id,
    equipmentId: i.equipment_id,
    installed: i.installed,
    installedAt: i.installed_at ? new Date(i.installed_at) : undefined,
    notes: i.notes || undefined,
  })), [instalaciones]);

  // Memoize filtered vehicles
  const activeVehicles = useMemo(() => 
    vehicles.filter(v => !isVehicleDelivered(v.id)),
  [vehicles, isVehicleDelivered]);

  const handleAddCompany = useCallback(async (company: Omit<Company, 'id' | 'createdAt'>) => {
    await addEmpresa({
      name: company.name,
      ruc: company.ruc,
      contact: company.contact,
      phone: company.phone,
      email: company.email,
    });
  }, [addEmpresa]);

  const handleAddProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt'>) => {
    await addProyecto({
      name: project.name,
      company_id: project.companyId,
      equipment: project.equipment,
      status: project.status,
    });
  }, [addProyecto]);

  const handleSearchVehicle = useCallback((query: string) => {
    const dbVehicle = searchVehicle(query);
    if (!dbVehicle) return undefined;
    return vehicles.find(v => v.id === dbVehicle.id);
  }, [searchVehicle, vehicles]);

  // Search for vehicles that are NOT delivered (for Extra module)
  const handleSearchVehicleNotDelivered = useCallback((query: string) => {
    const dbVehicle = searchVehicle(query);
    if (!dbVehicle) return undefined;
    if (isVehicleDelivered(dbVehicle.id)) return undefined;
    return vehicles.find(v => v.id === dbVehicle.id);
  }, [searchVehicle, isVehicleDelivered, vehicles]);

  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case 'admin': return { subtitle: 'Panel de Administración' };
      case 'users': return { subtitle: 'Gestión de Usuarios' };
      case 'register': return { subtitle: 'Registro de Vehículos' };
      case 'equipment': return { subtitle: 'Control de Equipamiento' };
      case 'delivery': return { subtitle: 'Entrega de Vehículos' };
      case 'extra': return { subtitle: 'Módulo Extra' };
      case 'audit': return { subtitle: 'Auditoría de Equipamiento' };
      default: return { subtitle: '' };
    }
  }, [activeTab]);

  const canViewTab = useCallback((tab: TabType): boolean => {
    if (isAdmin) return true;
    if (isRegistrador && (tab === 'register' || tab === 'delivery' || tab === 'extra')) return true;
    if (isTecnico && (tab === 'equipment' || tab === 'register' || tab === 'delivery' || tab === 'extra')) return true;
    if (isAuditor && (tab === 'audit' || tab === 'equipment' || tab === 'register' || tab === 'delivery' || tab === 'extra')) return true;
    return false;
  }, [isAdmin, isRegistrador, isTecnico, isAuditor]);

  // Loading state - after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">
            {!isOnline ? 'Cargando datos locales...' : 'Cargando...'}
          </p>
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 mt-2 text-amber-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Modo Offline</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-top">
      <Header subtitle={headerInfo.subtitle} />

      <main className="flex-1 flex flex-col overflow-auto main-content-with-nav">
        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            companies={companies}
            projects={projects}
            vehicles={vehicles}
            installations={installations}
            vehiculosEntregados={vehiculosEntregados}
            onAddCompany={handleAddCompany}
            onAddProject={handleAddProject}
            onUpdateCompany={updateEmpresa}
            onDeleteCompany={deleteEmpresa}
            onUpdateProjectEquipment={updateProyectoEquipment}
            onDeleteProject={deleteProyecto}
            onDeleteVehicle={deleteVehiculo}
            onAddEquipment={(name, category) => {
              // For now, just log - in production would save to DB
              console.log('New equipment:', name, category);
            }}
            getVehicleProgress={getVehicleProgress}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagement />
        )}

        {activeTab === 'register' && canViewTab('register') && (
          <VehicleRegistration
            projects={projects}
            onAddVehicle={addVehiculo}
            checkVinExists={checkVinExists}
            checkPlateExists={checkPlateExists}
          />
        )}

        {activeTab === 'equipment' && canViewTab('equipment') && (
          <EquipmentTracker
            vehicles={activeVehicles}
            projects={projects}
            installations={installations}
            onSearchVehicle={handleSearchVehicleNotDelivered}
            onUpdateInstallation={updateInstalacion}
            onUpdateObservations={updateVehicleObservations}
            getVehicleProgress={getVehicleProgress}
          />
        )}

        {activeTab === 'delivery' && canViewTab('delivery') && (
          <VehicleDelivery
            projects={projects}
            vehicles={vehicles}
            getVehiculosPendientes={getVehiculosPendientes}
            onDeliverVehicle={deliverVehicle}
            getVehicleProgress={getVehicleProgress}
          />
        )}

        {activeTab === 'extra' && canViewTab('extra') && (
          <ExtraModule
            vehicles={activeVehicles}
            projects={projects}
            onUpdatePlate={updateVehiclePlate}
            onUpdateCochera={updateVehicleCochera}
            onUpdateProject={updateVehicleProject}
            onSearchVehicle={handleSearchVehicleNotDelivered}
          />
        )}

        {activeTab === 'audit' && canViewTab('audit') && (
          <AuditModule
            vehicles={activeVehicles}
            projects={projects}
            installations={installations}
            onSearchVehicle={handleSearchVehicleNotDelivered}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
