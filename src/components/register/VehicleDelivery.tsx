import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Minus, Send, FileText, Camera, ChevronRight, Search } from "lucide-react";
import { Project, Vehicle, VehicleCheckItem } from "@/types";
import { vehicleCheckTemplate } from "@/data/equipmentData";
import { PhotoCapture } from "./PhotoCapture";
import { SignatureModal, DeliveryPersonData } from "./SignatureModal";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface VehicleDeliveryProps {
  projects: Project[];
  vehicles: Vehicle[];
  getVehiculosPendientes: (projectId?: string) => { id: string; vin: string; plate: string | null; model: string; color: string; project_id: string }[];
  onDeliverVehicle: (entrega: {
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
  }) => Promise<unknown>;
  getVehicleProgress: (vehicleId: string) => number;
}

export function VehicleDelivery({ projects, vehicles, getVehiculosPendientes, onDeliverVehicle, getVehicleProgress }: VehicleDeliveryProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  // Delivery info
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [kmExit, setKmExit] = useState("");
  const [notes, setNotes] = useState("");
  
  // Check items
  const [checkItems, setCheckItems] = useState<VehicleCheckItem[]>(() => 
    vehicleCheckTemplate.map(item => ({ ...item }))
  );
  
  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Get pending vehicles for selected project
  const pendingVehicles = useMemo(() => {
    return getVehiculosPendientes(selectedProjectId || undefined);
  }, [getVehiculosPendientes, selectedProjectId]);

  // Filter vehicles by search query
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return pendingVehicles;
    const query = searchQuery.toUpperCase().trim();
    return pendingVehicles.filter(v => 
      v.vin.toUpperCase().includes(query) || 
      (v.plate && v.plate.toUpperCase().includes(query))
    );
  }, [pendingVehicles, searchQuery]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const updateCheckItem = (index: number, value: boolean | null) => {
    setCheckItems(prev => prev.map((item, i) => 
      i === index ? { ...item, hasIt: value } : item
    ));
  };

  const updateCheckItemObservation = (index: number, observation: string) => {
    setCheckItems(prev => prev.map((item, i) => 
      i === index ? { ...item, observation } : item
    ));
  };

  const groupedCheckItems = checkItems.reduce((acc, item, index) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push({ ...item, index });
    return acc;
  }, {} as Record<string, (VehicleCheckItem & { index: number })[]>);

  const handleSaveClick = () => {
    if (!selectedVehicleId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un vehículo",
        variant: "destructive",
      });
      return;
    }

    // Validate vehicle has 100% equipment installed
    const progress = getVehicleProgress(selectedVehicleId);
    if (progress < 100) {
      toast({
        title: "Equipamiento incompleto",
        description: `El vehículo no tiene el equipamiento completo (${progress}%). Debe estar al 100% para poder entregarlo.`,
        variant: "destructive",
      });
      return;
    }

    if (!deliveryDate || !deliveryTime) {
      toast({
        title: "Error",
        description: "Debe completar fecha y hora de entrega",
        variant: "destructive",
      });
      return;
    }

    if (photos.length < 4) {
      toast({
        title: "Fotos requeridas",
        description: `Debe tomar ${4 - photos.length} foto(s) más`,
        variant: "destructive",
      });
      return;
    }

    setShowSignatureModal(true);
  };

  const handleSignatureConfirm = async (deliveryData: DeliveryPersonData) => {
    setShowSignatureModal(false);

    const vehicleToDeliver = pendingVehicles.find(v => v.id === selectedVehicleId);
    if (!vehicleToDeliver) return;

    const result = await onDeliverVehicle({
      vehicle_id: selectedVehicleId,
      project_id: vehicleToDeliver.project_id,
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      km_exit: kmExit,
      check_items: checkItems as unknown as Json,
      photos,
      receiver_name: deliveryData.fullName,
      receiver_position: deliveryData.position,
      receiver_signature: deliveryData.signature,
      notes: notes || undefined,
    });

    if (!result) {
      toast({
        title: "No se pudo guardar",
        description: "No se registró la entrega (ni online ni offline). Revisa el contador 'Offline' del header.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Vehículo entregado",
      description: `${vehicleToDeliver.vin} ha sido entregado exitosamente`,
    });

    // Reset form
    setSelectedVehicleId("");
    setSearchQuery("");
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryTime(new Date().toTimeString().slice(0, 5));
    setKmExit("");
    setNotes("");
    setCheckItems(vehicleCheckTemplate.map(item => ({ ...item })));
    setPhotos([]);
    setActiveTab("info");
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setKmExit(vehicle.kmEntry); // Pre-fill with entry km as starting point
    }
  };

  const completedItems = checkItems.filter(item => item.hasIt !== null).length;
  const totalItems = checkItems.length;
  const checkProgress = Math.round((completedItems / totalItems) * 100);

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No hay proyectos disponibles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Project and Vehicle Selection */}
      <div className="p-4 border-b border-border bg-card space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Proyecto</Label>
          <Select value={selectedProjectId} onValueChange={(value) => {
            setSelectedProjectId(value);
            setSelectedVehicleId("");
            setSearchQuery("");
          }}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Seleccionar proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProject && (
          <>
            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar Vehículo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por VIN o placa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-10 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Vehículo a Entregar 
                <Badge variant="secondary" className="ml-2">{pendingVehicles.length} pendientes</Badge>
              </Label>
              <Select value={selectedVehicleId} onValueChange={handleVehicleSelect}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVehicles.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {searchQuery ? "No se encontraron vehículos" : "No hay vehículos pendientes"}
                    </div>
                  ) : (
                    filteredVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <span className="font-mono">{vehicle.vin}</span>
                        {vehicle.plate && <span className="ml-2 text-muted-foreground">/ {vehicle.plate}</span>}
                        <span className="ml-2 text-muted-foreground">- {vehicle.model}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {selectedVehicle ? (
        <>
          {/* Vehicle Info Summary */}
          <div className="p-4 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold">{selectedVehicle.vin}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVehicle.model} • {selectedVehicle.color}
                  {selectedVehicle.plate && ` • ${selectedVehicle.plate}`}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <TabsContent value="info" className="p-4 space-y-4 mt-0">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate">Fecha Entrega *</Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryTime">Hora *</Label>
                      <Input
                        id="deliveryTime"
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kmExit">Kilometraje de Salida</Label>
                    <Input
                      id="kmExit"
                      type="number"
                      placeholder="0"
                      value={kmExit}
                      onChange={(e) => setKmExit(e.target.value)}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Km de entrada: {selectedVehicle.kmEntry}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observaciones</Label>
                    <Input
                      id="notes"
                      placeholder="Observaciones adicionales..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="check" className="p-4 space-y-4 mt-0">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Completado: {completedItems}/{totalItems}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="success" className="gap-1">
                      <Check className="w-3 h-3" /> SÍ
                    </Badge>
                    <Badge variant="destructive" className="gap-1">
                      <X className="w-3 h-3" /> NO
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Minus className="w-3 h-3" /> N/A
                    </Badge>
                  </div>
                </div>

                {Object.entries(groupedCheckItems).map(([category, items]) => (
                  <Card key={category} className="glass-card">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm font-semibold">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {items.map((item) => (
                        <div key={item.index} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm flex-1">{item.item}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateCheckItem(item.index, true)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                  item.hasIt === true 
                                    ? 'bg-success text-success-foreground' 
                                    : 'bg-muted text-muted-foreground hover:bg-success/20'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCheckItem(item.index, false)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                  item.hasIt === false 
                                    ? 'bg-destructive text-destructive-foreground' 
                                    : 'bg-muted text-muted-foreground hover:bg-destructive/20'
                                }`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCheckItem(item.index, null)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                  item.hasIt === null && checkItems[item.index].observation === ''
                                    ? 'bg-secondary text-secondary-foreground' 
                                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                                }`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <Input
                            placeholder="Observación..."
                            value={item.observation}
                            onChange={(e) => updateCheckItemObservation(item.index, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="photos" className="p-4 mt-0">
                <PhotoCapture
                  photos={photos}
                  maxPhotos={4}
                  onPhotosChange={setPhotos}
                />
              </TabsContent>
            </ScrollArea>

            <div className="border-t border-border bg-card">
              <TabsList className="grid grid-cols-3 w-full rounded-none border-b border-border">
                <TabsTrigger value="info" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <Send className="w-4 h-4" />
                  <span>Info</span>
                </TabsTrigger>
                <TabsTrigger value="check" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <FileText className="w-4 h-4" />
                  <span>Ficha</span>
                  <Badge variant="secondary" className="ml-1 text-xs">{checkProgress}%</Badge>
                </TabsTrigger>
                <TabsTrigger value="photos" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <Camera className="w-4 h-4" />
                  <span>Fotos</span>
                  <Badge variant={photos.length >= 4 ? "success" : "secondary"} className="ml-1 text-xs">
                    {photos.length}/4
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <div className="p-4">
                <Button 
                  onClick={handleSaveClick}
                  className="w-full h-12 font-semibold"
                  disabled={!selectedVehicleId || photos.length < 4 || !deliveryDate || !deliveryTime}
                >
                  Confirmar Entrega
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Tabs>

          {showSignatureModal && (
            <SignatureModal
              onConfirm={handleSignatureConfirm}
              onCancel={() => setShowSignatureModal(false)}
            />
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {selectedProject 
                  ? "Seleccione un vehículo para entregar"
                  : "Seleccione un proyecto para ver los vehículos pendientes"
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
