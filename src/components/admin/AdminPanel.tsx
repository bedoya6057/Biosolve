import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Building2, FolderOpen, Car, ChevronRight, Package, FileText, Image, Check, X as XIcon, Send, ClipboardCheck, AlertCircle, Pencil, Users, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Company, Project, Vehicle, EquipmentInstallation } from "@/types";
import { ProjectForm } from "./ProjectForm";
import { CompanyForm } from "./CompanyForm";
import { VehicleDetailModal } from "./VehicleDetailModal";
import { EquipmentManager } from "./EquipmentManager";
import { ProjectEditForm } from "./ProjectEditForm";
import { CompanyManagement } from "./CompanyManagement";
import { useEquipmentDB } from "@/hooks/useEquipmentDB";
import type { VehiculoEntregadoDB } from "@/hooks/useProjectsDB";
import { useAudits } from "@/hooks/useAudits";

interface AdminPanelProps {
  companies: Company[];
  projects: Project[];
  vehicles: Vehicle[];
  installations?: EquipmentInstallation[];
  vehiculosEntregados?: VehiculoEntregadoDB[];
  onAddCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<void> | void;
  onAddProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void> | void;
  onUpdateCompany?: (id: string, data: { name: string; ruc?: string; contact?: string }) => Promise<void>;
  onDeleteCompany?: (id: string) => Promise<void>;
  onUpdateProjectEquipment?: (projectId: string, equipment: string[]) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
  onDeleteVehicle?: (vehicleId: string) => Promise<void>;
  onAddEquipment?: (name: string, category: string) => void;
  getVehicleProgress: (vehicleId: string) => number;
}

type ModalType = 'ficha' | 'fotos' | 'ficha-entrega' | 'fotos-entrega' | null;

export function AdminPanel({
  companies,
  projects,
  vehicles,
  installations = [],
  vehiculosEntregados = [],
  onAddCompany,
  onAddProject,
  onUpdateCompany,
  onDeleteCompany,
  onUpdateProjectEquipment,
  onDeleteProject,
  onDeleteVehicle,
  onAddEquipment,
  getVehicleProgress,
}: AdminPanelProps) {
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showEquipmentManager, setShowEquipmentManager] = useState(false);
  const [showCompanyManagement, setShowCompanyManagement] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
  const { getVehicleAuditStatus, getEquipmentAuditObservation } = useAudits();
  const { equipment: equipmentDB } = useEquipmentDB();

  const getProjectVehicles = (projectId: string) => {
    return vehicles.filter(v => v.projectId === projectId);
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Sin empresa';
  };

  const getEquipmentName = (equipmentId: string) => {
    // First try to find in database equipment
    const dbEquipment = equipmentDB.find(e => e.id === equipmentId);
    if (dbEquipment) return dbEquipment.name;
    // Return the ID as fallback (shouldn't happen normally)
    return equipmentId;
  };

  const getVehicleEquipmentStatus = (vehicleId: string, projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return [];
    
    return project.equipment.map(equipmentId => {
      const installation = installations.find(
        i => i.vehicleId === vehicleId && i.equipmentId === equipmentId
      );
      return {
        id: equipmentId,
        name: getEquipmentName(equipmentId),
        installed: installation?.installed || false,
      };
    });
  };

  const openVehicleModal = (vehicle: Vehicle, type: ModalType) => {
    setSelectedVehicle(vehicle);
    setModalType(type);
  };

  const getVehicleDeliveryData = (vehicleId: string) => {
    return vehiculosEntregados.find(ve => ve.vehicle_id === vehicleId);
  };

  const isVehicleDelivered = (vehicleId: string) => {
    return vehiculosEntregados.some(ve => ve.vehicle_id === vehicleId);
  };

  // Count pending vehicles (not delivered)
  const pendingVehiclesCount = vehicles.filter(v => !isVehicleDelivered(v.id)).length;
  const deliveredVehiclesCount = vehiculosEntregados.length;

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-4 pb-24 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <Building2 className="w-6 h-6 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-xs text-muted-foreground">Empresas</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <Car className="w-6 h-6 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-bold">{pendingVehiclesCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <Send className="w-6 h-6 mx-auto mb-1 text-success" />
                <p className="text-2xl font-bold">{deliveredVehiclesCount}</p>
                <p className="text-xs text-muted-foreground">Entregados</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <Building2 className="w-6 h-6 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-xs text-muted-foreground">Empresas</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <FolderOpen className="w-6 h-6 mx-auto mb-1 text-accent" />
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Proyectos</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => setShowCompanyForm(true)}
              variant="outline" 
              className="h-12"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Nueva Empresa
            </Button>
            <Button 
              onClick={() => setShowProjectForm(true)}
              className="h-12"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
            </Button>
            <Button 
              onClick={() => setShowEquipmentManager(true)}
              variant="outline" 
              className="h-12"
            >
              <Package className="w-4 h-4 mr-2" />
              Equipamiento
            </Button>
            <Button 
              onClick={() => setShowCompanyManagement(true)}
              variant="outline" 
              className="h-12"
            >
              <Users className="w-4 h-4 mr-2" />
              Ver Empresas
            </Button>
          </div>

          {/* Projects List */}
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg">Proyectos</h2>
            
            {projects.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay proyectos creados</p>
                  <Button 
                    onClick={() => setShowProjectForm(true)}
                    variant="link" 
                    className="mt-2"
                  >
                    Crear primer proyecto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              projects.map(project => {
                const projectVehicles = getProjectVehicles(project.id);
                const isExpanded = expandedProject === project.id;
                
                return (
                  <Card key={project.id} className="glass-card overflow-hidden">
                    <CardHeader 
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{project.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getCompanyName(project.companyId)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(project);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esto eliminará permanentemente el proyecto <strong>{project.name}</strong> y todos sus registros asociados:
                                  <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>{projectVehicles.length} vehículos</li>
                                    <li>Todas las instalaciones de equipamiento</li>
                                    <li>Todos los registros de entrega</li>
                                    <li>Todas las auditorías</li>
                                  </ul>
                                  <span className="block mt-2 font-semibold text-destructive">Esta acción no se puede deshacer.</span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    if (onDeleteProject) {
                                      await onDeleteProject(project.id);
                                    }
                                  }}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Badge variant="accent">{projectVehicles.length} vehículos</Badge>
                          {projectVehicles.filter(v => isVehicleDelivered(v.id)).length > 0 && (
                            <Badge variant="success" className="gap-1">
                              <Check className="w-3 h-3" />
                              {projectVehicles.filter(v => isVehicleDelivered(v.id)).length}
                            </Badge>
                          )}
                          <ChevronRight 
                            className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="px-4 pb-4 pt-0 border-t border-border">
                        {/* Vehicles */}
                        {projectVehicles.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Sin vehículos registrados
                          </p>
                        ) : (
                          <div className="space-y-2 pt-4">
                            {projectVehicles.map(vehicle => {
                              const progress = getVehicleProgress(vehicle.id);
                              const equipmentStatus = getVehicleEquipmentStatus(vehicle.id, project.id);
                              const installedCount = equipmentStatus.filter(e => e.installed).length;
                              const isVehicleExpanded = expandedVehicle === vehicle.id;
                              const delivered = isVehicleDelivered(vehicle.id);
                              const deliveryData = getVehicleDeliveryData(vehicle.id);
                              const auditStatus = getVehicleAuditStatus(vehicle.id);
                              
                              return (
                                <div
                                  key={vehicle.id}
                                  className={`rounded-lg overflow-hidden ${delivered ? 'bg-success/10 border border-success/20' : 'bg-muted/50'}`}
                                >
                                  {/* Vehicle Summary - Always visible */}
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => setExpandedVehicle(isVehicleExpanded ? null : vehicle.id)}
                                      className="flex-1 flex items-center justify-between p-3 hover:bg-muted/80 transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-sm">
                                              {vehicle.plate ? `${vehicle.vin} / ${vehicle.plate}` : vehicle.vin}
                                            </p>
                                            {delivered && (
                                              <Badge variant="success" className="text-xs">Entregado</Badge>
                                            )}
                                            {auditStatus.hasAudit && !auditStatus.hasObservations && (
                                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                                <ClipboardCheck className="w-3 h-3 mr-1" />
                                                Auditoría OK
                                              </Badge>
                                            )}
                                            {auditStatus.hasObservations && (
                                              <Badge variant="destructive" className="text-xs">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Observación Auditoría
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground">{vehicle.model}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <span className="text-sm font-bold text-accent">{progress}%</span>
                                          <p className="text-xs text-muted-foreground">{installedCount}/{equipmentStatus.length}</p>
                                        </div>
                                        <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
                                          <div 
                                            className="h-full bg-accent transition-all"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        <ChevronRight 
                                          className={`w-4 h-4 text-muted-foreground transition-transform ${isVehicleExpanded ? 'rotate-90' : ''}`} 
                                        />
                                      </div>
                                    </button>
                                    
                                    {/* Delete button - visible in collapsed row */}
                                    {onDeleteVehicle && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 mr-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esto eliminará permanentemente el vehículo <strong>{vehicle.vin}</strong> {vehicle.plate && `(${vehicle.plate})`} y todos sus registros asociados:
                                              <ul className="list-disc list-inside mt-2 space-y-1">
                                                <li>Instalaciones de equipamiento</li>
                                                <li>Registros de entrega</li>
                                                <li>Auditorías</li>
                                              </ul>
                                              <span className="block mt-2 font-semibold text-destructive">Esta acción no se puede deshacer.</span>
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              onClick={async () => {
                                                await onDeleteVehicle(vehicle.id);
                                              }}
                                            >
                                              Eliminar
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                  
                                  {/* Expanded Details */}
                                  {isVehicleExpanded && (
                                    <div className="px-3 pb-3 pt-0 border-t border-border/50 space-y-3">
                                      <p className="text-xs text-muted-foreground pt-2">VIN: {vehicle.vin}</p>
                                      
                                      {/* Equipment List */}
                                      <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Package className="w-3 h-3" />
                                          Equipamiento
                                        </p>
                                        <div className="grid grid-cols-1 gap-1">
                                          {equipmentStatus.map(eq => {
                                            const auditObservation = getEquipmentAuditObservation(vehicle.id, eq.id);
                                            const hasAuditIssue = !!auditObservation;
                                            
                                            return (
                                              <div 
                                                key={eq.id}
                                                className={`flex flex-col px-2 py-1.5 rounded text-sm ${
                                                  hasAuditIssue
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    : eq.installed 
                                                      ? 'bg-accent/10 text-accent' 
                                                      : 'bg-muted text-muted-foreground'
                                                }`}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="truncate flex-1">{eq.name}</span>
                                                  {eq.installed ? (
                                                    <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                                                  ) : (
                                                    <XIcon className="w-4 h-4 flex-shrink-0 ml-2 opacity-50" />
                                                  )}
                                                </div>
                                                {hasAuditIssue && (
                                                  <p className="text-xs mt-1 text-red-600 dark:text-red-400 italic">
                                                    Obs: {auditObservation}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      
                                      {/* Action Buttons - Recepción */}
                                      <div className="space-y-2 pt-2">
                                        <p className="text-xs text-muted-foreground">Recepción</p>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openVehicleModal(vehicle, 'ficha');
                                            }}
                                          >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Ficha
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openVehicleModal(vehicle, 'fotos');
                                            }}
                                          >
                                            <Image className="w-4 h-4 mr-2" />
                                            Fotos ({vehicle.photos.length})
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {/* Action Buttons - Entrega */}
                                      {delivered && deliveryData && (
                                        <div className="space-y-2 pt-2 border-t border-border/50">
                                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Send className="w-3 h-3" />
                                            Entrega
                                          </p>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 border-success/30 text-success hover:bg-success/10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openVehicleModal(vehicle, 'ficha-entrega');
                                              }}
                                            >
                                              <FileText className="w-4 h-4 mr-2" />
                                              Ficha
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 border-success/30 text-success hover:bg-success/10"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openVehicleModal(vehicle, 'fotos-entrega');
                                              }}
                                            >
                                              <Image className="w-4 h-4 mr-2" />
                                              Fotos ({[deliveryData.foto_1, deliveryData.foto_2, deliveryData.foto_3, deliveryData.foto_4].filter(Boolean).length})
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Modals */}
      {showProjectForm && (
        <ProjectForm
          companies={companies}
          onSubmit={async (project) => {
            await onAddProject(project);
            setShowProjectForm(false);
          }}
          onCancel={() => setShowProjectForm(false)}
          onAddCompany={() => {
            setShowProjectForm(false);
            setShowCompanyForm(true);
          }}
        />
      )}

      {showCompanyForm && (
        <CompanyForm
          onSubmit={async (company) => {
            await onAddCompany(company);
            setShowCompanyForm(false);
            if (!showProjectForm) {
              setShowProjectForm(true);
            }
          }}
          onCancel={() => {
            setShowCompanyForm(false);
            if (!showProjectForm) {
              setShowProjectForm(true);
            }
          }}
        />
      )}

      {selectedVehicle && modalType && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          project={projects.find(p => p.id === selectedVehicle.projectId)}
          progress={getVehicleProgress(selectedVehicle.id)}
          viewMode={modalType}
          deliveryData={getVehicleDeliveryData(selectedVehicle.id)}
          onClose={() => {
            setSelectedVehicle(null);
            setModalType(null);
          }}
        />
      )}

      {showEquipmentManager && (
        <EquipmentManager
          onClose={() => setShowEquipmentManager(false)}
        />
      )}

      {editingProject && onUpdateProjectEquipment && (
        <ProjectEditForm
          project={editingProject}
          onSubmit={async (projectId, equipment) => {
            await onUpdateProjectEquipment(projectId, equipment);
            setEditingProject(null);
          }}
          onCancel={() => setEditingProject(null)}
        />
      )}

      {showCompanyManagement && onUpdateCompany && onDeleteCompany && (
        <CompanyManagement
          companies={companies}
          onClose={() => setShowCompanyManagement(false)}
          onUpdateCompany={onUpdateCompany}
          onDeleteCompany={onDeleteCompany}
        />
      )}
    </>
  );
}
