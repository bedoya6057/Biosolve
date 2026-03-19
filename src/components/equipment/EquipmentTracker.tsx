import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Wrench, Car, Check, AlertCircle, MessageSquare, Save } from "lucide-react";
import { Vehicle, Project, EquipmentInstallation } from "@/types";
import { equipmentList } from "@/data/equipmentData";
import { useToast } from "@/hooks/use-toast";
import { useEquipmentDB } from "@/hooks/useEquipmentDB";

interface EquipmentTrackerProps {
  vehicles: Vehicle[];
  projects: Project[];
  installations: EquipmentInstallation[];
  onSearchVehicle: (query: string) => Vehicle | undefined;
  onUpdateInstallation: (vehicleId: string, equipmentId: string, installed: boolean, notes?: string) => void;
  onUpdateObservations: (vehicleId: string, observations: string) => Promise<void>;
  getVehicleProgress: (vehicleId: string) => number;
}

export function EquipmentTracker({
  vehicles,
  projects,
  installations,
  onSearchVehicle,
  onUpdateInstallation,
  onUpdateObservations,
  getVehicleProgress,
}: EquipmentTrackerProps) {
  const { toast } = useToast();
  const { equipment: equipmentDB } = useEquipmentDB();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [comments, setComments] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync comments when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      setComments(selectedVehicle.observations || "");
      setSaved(false);
    }
  }, [selectedVehicle?.id]);

  // Debounced auto-save for comments
  const saveComments = useCallback(async (vehicleId: string, value: string) => {
    setIsSaving(true);
    try {
      await onUpdateObservations(vehicleId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error toast handled by the hook
    } finally {
      setIsSaving(false);
    }
  }, [onUpdateObservations]);

  const handleCommentsChange = (value: string) => {
    setComments(value);
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedVehicle) {
      debounceRef.current = setTimeout(() => {
        saveComments(selectedVehicle.id, value);
      }, 1000);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const vehicle = onSearchVehicle(searchQuery);
    if (vehicle) {
      setSelectedVehicle(vehicle);
    } else {
      toast({
        title: "Vehículo no encontrado",
        description: "No se encontró un vehículo con ese VIN o placa",
        variant: "destructive",
      });
    }
  };

  const getProject = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  const getVehicleInstallations = (vehicleId: string) => {
    return installations.filter(i => i.vehicleId === vehicleId);
  };

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

  const vehicleInstallations = selectedVehicle ? getVehicleInstallations(selectedVehicle.id) : [];
  const project = selectedVehicle ? getProject(selectedVehicle.projectId) : null;
  const progress = selectedVehicle ? getVehicleProgress(selectedVehicle.id) : 0;

  // Group installations by category
  const groupedInstallations = vehicleInstallations.reduce((acc, installation) => {
    const category = getEquipmentCategory(installation.equipmentId);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(installation);
    return acc;
  }, {} as Record<string, EquipmentInstallation[]>);

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Search */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por VIN o Placa"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-12 pl-10 font-mono"
            />
          </div>
          <Button onClick={handleSearch} className="h-12 px-6">
            Buscar
          </Button>
        </div>
      </div>

      {selectedVehicle ? (
        <>
          {/* Vehicle Header */}
          <div className="p-4 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  <h2 className="text-lg font-display font-bold">{selectedVehicle.plate || selectedVehicle.vin}</h2>
                </div>
                <p className="text-sm text-primary-foreground/70 font-mono">{selectedVehicle.vin}</p>
                {project && (
                  <p className="text-sm text-primary-foreground/70 mt-1">{project.name}</p>
                )}
                {selectedVehicle.cochera && (
                  <p className="text-sm text-primary-foreground/70 mt-1">
                    📍 {selectedVehicle.cochera}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{progress}%</div>
                <p className="text-xs text-primary-foreground/70">Completado</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-3 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Equipment List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {Object.entries(groupedInstallations).map(([category, categoryInstallations]) => {
                const completedInCategory = categoryInstallations.filter(i => i.installed).length;
                
                return (
                  <Card key={category} className="glass-card overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-muted/50">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          {category}
                        </span>
                        <Badge variant={completedInCategory === categoryInstallations.length ? "success" : "secondary"}>
                          {completedInCategory}/{categoryInstallations.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {categoryInstallations.map((installation) => (
                        <label
                          key={installation.equipmentId}
                          className="flex items-center gap-3 p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <Checkbox
                            checked={installation.installed}
                            onCheckedChange={(checked) => 
                              onUpdateInstallation(
                                selectedVehicle.id, 
                                installation.equipmentId, 
                                checked as boolean
                              )
                            }
                            className="w-6 h-6"
                          />
                          <span className={`flex-1 text-sm ${installation.installed ? 'line-through text-muted-foreground' : ''}`}>
                            {getEquipmentName(installation.equipmentId)}
                          </span>
                          {installation.installed && (
                            <Check className="w-5 h-5 text-success" />
                          )}
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              {vehicleInstallations.length === 0 && (
                <Card className="glass-card">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-warning" />
                    <p className="text-muted-foreground">
                      Este vehículo no tiene equipamiento asignado
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              <Card className="glass-card overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/50">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comentarios
                    </span>
                    {isSaving && (
                      <span className="text-xs text-muted-foreground animate-pulse">Guardando...</span>
                    )}
                    {saved && !isSaving && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <Save className="w-3 h-3" />
                        Guardado
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Textarea
                    placeholder="Escribe comentarios u observaciones sobre este vehículo..."
                    value={comments}
                    onChange={(e) => handleCommentsChange(e.target.value)}
                    rows={4}
                    className="resize-none text-sm"
                  />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Busque un vehículo por VIN o placa para ver y actualizar su equipamiento
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
