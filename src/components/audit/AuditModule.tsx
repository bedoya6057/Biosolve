import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, ClipboardCheck, Save, AlertCircle, CheckCircle, Shuffle } from "lucide-react";
import { Vehicle, Project, EquipmentInstallation } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { equipmentList } from "@/data/equipmentData";
import { useEquipmentDB } from "@/hooks/useEquipmentDB";

interface AuditModuleProps {
  vehicles: Vehicle[];
  projects: Project[];
  installations: EquipmentInstallation[];
  onSearchVehicle: (query: string) => Vehicle | undefined;
}

interface AuditItem {
  equipment_id: string;
  item_name: string;
  category: string;
  is_correct: boolean;
  has_observation: boolean;
  observation: string;
}

export function AuditModule({ vehicles, projects, installations, onSearchVehicle }: AuditModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { equipment: equipmentDB } = useEquipmentDB();

  const getEquipmentName = (equipmentId: string) => {
    const dbEquip = equipmentDB.find(e => e.id === equipmentId);
    if (dbEquip) return dbEquip.name;
    return equipmentList.find(e => e.id === equipmentId)?.name || equipmentId;
  };

  const getEquipmentCategory = (equipmentId: string) => {
    const dbEquip = equipmentDB.find(e => e.id === equipmentId);
    if (dbEquip) return dbEquip.category;
    return equipmentList.find(e => e.id === equipmentId)?.category || 'General';
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Ingrese VIN o placa");
      return;
    }

    const vehicle = onSearchVehicle(searchQuery.trim());
    if (!vehicle) {
      toast.error("Vehículo no encontrado");
      setSelectedVehicle(null);
      setSelectedProject(null);
      setAuditItems([]);
      return;
    }

    const project = projects.find(p => p.id === vehicle.projectId);
    setSelectedVehicle(vehicle);
    setSelectedProject(project || null);
    
    if (vehicle) {
      initializeAuditItems(vehicle.id);
    }
  };

  const selectRandomVehicle = () => {
    if (vehicles.length === 0) {
      toast.error("No hay vehículos disponibles");
      return;
    }
    const randomIndex = Math.floor(Math.random() * vehicles.length);
    const vehicle = vehicles[randomIndex];
    const project = projects.find(p => p.id === vehicle.projectId);
    
    setSelectedVehicle(vehicle);
    setSelectedProject(project || null);
    setSearchQuery(vehicle.vin);
    
    initializeAuditItems(vehicle.id);
  };

  const initializeAuditItems = (vehicleId: string) => {
    // Get only INSTALLED equipment for this vehicle
    const installedEquipment = installations.filter(
      i => i.vehicleId === vehicleId && i.installed
    );

    const items: AuditItem[] = installedEquipment.map(inst => ({
      equipment_id: inst.equipmentId,
      item_name: getEquipmentName(inst.equipmentId),
      category: getEquipmentCategory(inst.equipmentId),
      is_correct: true,
      has_observation: false,
      observation: "",
    }));
    
    setAuditItems(items);
  };

  const loadExistingAudit = async (vehicleId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*')
        .eq('vehicle_id', vehicleId);

      if (error) throw error;

      if (data && data.length > 0) {
        const existingAuditMap = new Map(
          data.map(a => [a.equipment_id, { is_correct: a.is_correct, observation: a.observation || "" }])
        );

        setAuditItems(prev => prev.map(item => {
          const existing = existingAuditMap.get(item.equipment_id);
          if (existing) {
            return {
              ...item,
              is_correct: existing.is_correct,
              has_observation: !existing.is_correct,
              observation: existing.observation,
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('Error loading audit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVehicle && auditItems.length > 0) {
      loadExistingAudit(selectedVehicle.id);
    }
  }, [selectedVehicle?.id, auditItems.length]);

  const handleItemChange = (index: number, field: 'is_correct' | 'has_observation', value: boolean) => {
    setAuditItems(prev => {
      const updated = [...prev];
      if (field === 'is_correct') {
        updated[index] = {
          ...updated[index],
          is_correct: value,
          has_observation: !value,
          observation: value ? "" : updated[index].observation,
        };
      } else if (field === 'has_observation') {
        updated[index] = {
          ...updated[index],
          has_observation: value,
          is_correct: !value,
        };
      }
      return updated;
    });
  };

  const handleObservationChange = (index: number, observation: string) => {
    setAuditItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], observation };
      return updated;
    });
  };

  const saveAudit = async () => {
    if (!selectedVehicle) return;

    setIsSaving(true);
    try {
      // Delete existing audits for this vehicle
      await supabase
        .from('auditorias')
        .delete()
        .eq('vehicle_id', selectedVehicle.id);

      // Insert new audit records
      const auditRecords = auditItems.map(item => ({
        vehicle_id: selectedVehicle.id,
        equipment_id: item.equipment_id,
        is_correct: item.is_correct,
        observation: item.has_observation ? item.observation : null,
      }));

      const { error } = await supabase
        .from('auditorias')
        .insert(auditRecords);

      if (error) throw error;

      toast.success("Auditoría guardada exitosamente");
    } catch (error) {
      console.error('Error saving audit:', error);
      toast.error("Error al guardar la auditoría");
    } finally {
      setIsSaving(false);
    }
  };

  // Group items by category
  const groupedItems = auditItems.reduce((acc, item, index) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push({ ...item, index });
    return acc;
  }, {} as Record<string, (AuditItem & { index: number })[]>);

  const hasObservations = auditItems.some(item => item.has_observation);

  return (
    <div className="flex-1 flex flex-col p-4 pb-24 space-y-4 overflow-hidden">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-accent" />
            Auditoría de Equipamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por VIN o Placa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="icon" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
            <Button onClick={selectRandomVehicle} size="icon" variant="outline" title="Aleatorio">
              <Shuffle className="w-4 h-4" />
            </Button>
          </div>

          {selectedVehicle && selectedProject && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">VIN</span>
                <span className="font-mono font-semibold">{selectedVehicle.vin}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Placa</span>
                <span className="font-semibold">{selectedVehicle.plate || 'Sin placa'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Proyecto</span>
                <Badge variant="outline">{selectedProject.name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Equipos a auditar</span>
                <Badge variant="accent">{auditItems.length} items</Badge>
              </div>
              {selectedVehicle.equipmentObservations && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">💬 Comentarios del técnico</p>
                  <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">{selectedVehicle.equipmentObservations}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVehicle && selectedProject && auditItems.length > 0 && (
        <>
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {Object.entries(groupedItems).map(([category, items]) => (
                <Card key={category} className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display text-accent">
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map(({ index, item_name, is_correct, has_observation, observation }) => (
                      <div key={index} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item_name}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`correct-${index}`}
                              checked={is_correct}
                              onCheckedChange={(checked) => 
                                handleItemChange(index, 'is_correct', checked === true)
                              }
                            />
                            <Label 
                              htmlFor={`correct-${index}`}
                              className="text-sm flex items-center gap-1 text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Correcto
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`observation-${index}`}
                              checked={has_observation}
                              onCheckedChange={(checked) => 
                                handleItemChange(index, 'has_observation', checked === true)
                              }
                            />
                            <Label 
                              htmlFor={`observation-${index}`}
                              className="text-sm flex items-center gap-1 text-red-600"
                            >
                              <AlertCircle className="w-4 h-4" />
                              Con Observación
                            </Label>
                          </div>
                        </div>
                        {has_observation && (
                          <Textarea
                            placeholder="Escriba la observación..."
                            value={observation}
                            onChange={(e) => handleObservationChange(index, e.target.value)}
                            className="mt-2"
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="pt-4">
            {hasObservations && (
              <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="text-sm text-destructive">
                  Hay items con observaciones
                </span>
              </div>
            )}
            <Button 
              onClick={saveAudit}
              disabled={isSaving}
              className="w-full bg-accent hover:bg-accent/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Auditoría'}
            </Button>
          </div>
        </>
      )}

      {selectedVehicle && selectedProject && auditItems.length === 0 && (
        <Card className="glass-card">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Este proyecto no tiene equipamiento asignado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
