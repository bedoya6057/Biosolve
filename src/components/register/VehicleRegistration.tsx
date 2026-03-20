import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Minus, Car, FileText, Camera, ChevronRight } from "lucide-react";
import { Project, VehicleCheckItem } from "@/types";
import { vehicleCheckTemplate } from "@/data/equipmentData";
import { PhotoCapture } from "./PhotoCapture";
import { SignatureModal, DeliveryPersonData } from "./SignatureModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface VehicleRegistrationProps {
  projects: Project[];
  onAddVehicle: (vehicle: {
    project_id: string;
    vin: string;
    plate?: string;
    color: string;
    model: string;
    delivery_date: string;
    delivery_time: string;
    km_entry: string;
    check_items: unknown;
    photos: string[];
    status?: string;
    delivery_person_name?: string;
    delivery_person_position?: string;
    delivery_person_dni?: string;
    delivery_signature?: string;
    cochera?: string;
    observations?: string;
    dealer_sheet_photo?: string;
  }) => Promise<unknown>;
  checkVinExists?: (vin: string, excludeVehicleId?: string) => boolean;
  checkPlateExists?: (plate: string, excludeVehicleId?: string) => boolean;
}

export function VehicleRegistration({ projects, onAddVehicle, checkVinExists, checkPlateExists }: VehicleRegistrationProps) {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  // Vehicle info
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [model, setModel] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [kmEntry, setKmEntry] = useState("");
  const [cochera, setCochera] = useState("");
  const [observations, setObservations] = useState("");
  
  // Check items
  const [checkItems, setCheckItems] = useState<VehicleCheckItem[]>(() => 
    vehicleCheckTemplate.map(item => ({ ...item }))
  );
  
  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [dealerSheetPhoto, setDealerSheetPhoto] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

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

  // Handle next button - navigate through tabs sequentially
  const handleNextClick = () => {
    if (activeTab === 'info') {
      // Validate info tab before moving to check
      if (!vin) {
        toast({
          title: "Campo requerido",
          description: "Debe ingresar el VIN del vehículo",
          variant: "destructive",
        });
        return;
      }
      
      // Check for duplicate VIN
      if (checkVinExists && checkVinExists(vin)) {
        toast({
          title: "VIN duplicado",
          description: "Ya existe un vehículo registrado con este VIN",
          variant: "destructive",
        });
        return;
      }
      
      // Check for duplicate plate (only if plate is provided)
      if (plate && plate.trim() && checkPlateExists && checkPlateExists(plate)) {
        toast({
          title: "Placa duplicada",
          description: "Ya existe un vehículo registrado con esta placa",
          variant: "destructive",
        });
        return;
      }
      
      setActiveTab('check');
    } else if (activeTab === 'check') {
      // Move from check to photos
      setActiveTab('photos');
    } else if (activeTab === 'photos') {
      // Validate photos before showing signature modal
      if (!selectedProjectId) {
        toast({
          title: "Error",
          description: "Debe seleccionar un proyecto",
          variant: "destructive",
        });
        return;
      }

      // Photos required only for non-admin users
      if (!isAdmin && photos.length < 4) {
        toast({
          title: "Fotos requeridas",
          description: `Debe tomar ${4 - photos.length} foto(s) más`,
          variant: "destructive",
        });
        return;
      }

      // Show signature modal
      setShowSignatureModal(true);
    }
  };

  // Get button text based on current tab
  const getNextButtonText = () => {
    if (activeTab === 'photos') {
      return 'Finalizar';
    }
    return 'Siguiente';
  };

  // Check if next button should be disabled
  const isNextDisabled = () => {
    if (activeTab === 'info') {
      return !vin;
    }
    if (activeTab === 'photos') {
      return !isAdmin && photos.length < 4;
    }
    return false;
  };

  const handleSignatureConfirm = async (deliveryData: DeliveryPersonData) => {
    setShowSignatureModal(false);

    const result = await onAddVehicle({
      project_id: selectedProjectId,
      vin: vin.toUpperCase(),
      plate: plate ? plate.toUpperCase() : undefined,
      color,
      model,
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      km_entry: kmEntry,
      check_items: checkItems,
      photos,
      status: 'pending',
      delivery_person_name: deliveryData.fullName,
      delivery_person_position: deliveryData.position,
      delivery_person_dni: deliveryData.dni,
      delivery_signature: deliveryData.signature,
      cochera: cochera || undefined,
      observations: observations || undefined,
      dealer_sheet_photo: dealerSheetPhoto || undefined,
    });

    if (!result) {
      toast({
        title: "No se pudo guardar",
        description: "No se guardó el vehículo (ni online ni offline). Revisa el contador 'Offline' del header.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Vehículo registrado",
      description: `${vin} ha sido registrado exitosamente`,
    });

    // Reset form
    setVin("");
    setPlate("");
    setColor("");
    setModel("");
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryTime(new Date().toTimeString().slice(0, 5));
    setKmEntry("");
    setCochera("");
    setObservations("");
    setCheckItems(vehicleCheckTemplate.map(item => ({ ...item })));
    setPhotos([]);
    setDealerSheetPhoto(null);
    setActiveTab("info");
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
              No hay proyectos disponibles. Cree un proyecto en la pestaña Admin primero.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Project Selection */}
      <div className="p-4 border-b border-border bg-card">
        <Label className="text-sm font-medium mb-2 block">Proyecto</Label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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

      {selectedProject ? (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">

            <ScrollArea className="flex-1">
              <TabsContent value="info" className="p-4 space-y-4 mt-0">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN *</Label>
                    <Input
                      id="vin"
                      placeholder="Número de identificación vehicular"
                      value={vin}
                      onChange={(e) => setVin(e.target.value.toUpperCase())}
                      className="h-12 font-mono"
                      maxLength={17}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plate">Placa</Label>
                    <Input
                      id="plate"
                      placeholder="ABC-123 (opcional)"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      className="h-12 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        placeholder="Blanco"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Modelo</Label>
                      <Input
                        id="model"
                        placeholder="Hilux 2024"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="deliveryDate">Fecha de Recepción</Label>
                       <Input
                         id="deliveryDate"
                         type="date"
                         value={deliveryDate}
                         onChange={(e) => setDeliveryDate(e.target.value)}
                         className="h-12"
                       />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryTime">Hora</Label>
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
                    <Label htmlFor="kmEntry">Kilometraje de Entrada</Label>
                    <Input
                      id="kmEntry"
                      type="number"
                      placeholder="0"
                      value={kmEntry}
                      onChange={(e) => setKmEntry(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cochera">Cochera *</Label>
                    <Select value={cochera} onValueChange={setCochera}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Seleccionar cochera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cochera principal">Cochera principal</SelectItem>
                        <SelectItem value="Cochera 2">Cochera 2</SelectItem>
                        <SelectItem value="Cochera Club">Cochera Club</SelectItem>
                        <SelectItem value="Local externo">Local externo</SelectItem>
                      </SelectContent>
                    </Select>
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

                {/* Observaciones Generales - al final del checklist */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="observations">Observaciones Generales</Label>
                  <textarea
                    id="observations"
                    placeholder="Ingrese observaciones generales del vehículo..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </TabsContent>

              <TabsContent value="photos" className="p-4 mt-0 space-y-6">
                <PhotoCapture
                  photos={photos}
                  maxPhotos={4}
                  onPhotosChange={setPhotos}
                />
                
                {/* Foto de Ficha de Concesionario - Opcional */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Foto de Ficha de Concesionario</Label>
                    <Badge variant="secondary" className="text-xs">Opcional</Badge>
                  </div>
                  
                  {dealerSheetPhoto ? (
                    <div className="relative">
                      <img 
                        src={dealerSheetPhoto} 
                        alt="Ficha de concesionario" 
                        className="w-full h-48 object-contain bg-black rounded-lg border border-border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setDealerSheetPhoto(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-muted/30">
                      <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Capturar foto de la ficha del concesionario</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const maxSize = 1280;
                                  let { width, height } = img;
                                  if (width > height && width > maxSize) {
                                    height = (height * maxSize) / width;
                                    width = maxSize;
                                  } else if (height > maxSize) {
                                    width = (width * maxSize) / height;
                                    height = maxSize;
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  ctx?.drawImage(img, 0, 0, width, height);
                                  const compressed = canvas.toDataURL('image/jpeg', 0.72);
                                  setDealerSheetPhoto(compressed);
                                };
                                img.src = reader.result as string;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Button variant="outline" asChild>
                          <span>
                            <Camera className="w-4 h-4 mr-2" />
                            Tomar Foto
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>

            <div className="border-t border-border bg-card">
              <TabsList className="grid grid-cols-3 w-full rounded-none border-b border-border">
                <TabsTrigger value="info" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  <Car className="w-4 h-4" />
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
                  onClick={handleNextClick}
                  className="w-full h-12 font-semibold"
                  disabled={isNextDisabled()}
                >
                  {getNextButtonText()}
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
              <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Seleccione un proyecto para comenzar a registrar vehículos
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
