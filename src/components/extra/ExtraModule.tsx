import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Car, MapPin, Save, CheckCircle, FolderSync } from "lucide-react";
import { Vehicle, Project } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ExtraModuleProps {
  vehicles: Vehicle[];
  projects: Project[];
  onUpdatePlate: (vehicleId: string, plate: string) => Promise<void>;
  onUpdateCochera: (vehicleId: string, cochera: string) => Promise<void>;
  onUpdateProject: (vehicleId: string, projectId: string) => Promise<void>;
  onSearchVehicle: (query: string) => Vehicle | undefined;
}

export function ExtraModule({
  vehicles,
  projects,
  onUpdatePlate,
  onUpdateCochera,
  onUpdateProject,
  onSearchVehicle,
}: ExtraModuleProps) {
  const { toast } = useToast();
  
  // Add Plate state
  const [plateSearchQuery, setPlateSearchQuery] = useState("");
  const [plateVehicle, setPlateVehicle] = useState<Vehicle | null>(null);
  const [newPlate, setNewPlate] = useState("");
  const [isUpdatingPlate, setIsUpdatingPlate] = useState(false);
  
  // Change Cochera state
  const [searchQuery, setSearchQuery] = useState("");
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null);
  const [newCochera, setNewCochera] = useState("");
  const [isUpdatingCochera, setIsUpdatingCochera] = useState(false);

  // Change Project state
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectVehicle, setProjectVehicle] = useState<Vehicle | null>(null);
  const [newProjectId, setNewProjectId] = useState("");
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const handleSearchProjectVehicle = () => {
    if (!projectSearchQuery.trim()) return;
    
    const vehicle = onSearchVehicle(projectSearchQuery);
    if (vehicle) {
      setProjectVehicle(vehicle);
      setNewProjectId("");
    } else {
      toast({
        title: "Vehículo no encontrado",
        description: "No se encontró un vehículo con ese VIN o placa",
        variant: "destructive",
      });
      setProjectVehicle(null);
      setNewProjectId("");
    }
  };

  const handleUpdateProject = async () => {
    if (!projectVehicle) {
      toast({
        title: "Error",
        description: "Debe buscar y seleccionar un vehículo primero",
        variant: "destructive",
      });
      return;
    }

    if (!newProjectId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un proyecto",
        variant: "destructive",
      });
      return;
    }

    if (newProjectId === projectVehicle.projectId) {
      toast({
        title: "Error",
        description: "El vehículo ya pertenece a este proyecto",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProject(true);
    try {
      await onUpdateProject(projectVehicle.id, newProjectId);
      const newProject = projects.find(p => p.id === newProjectId);
      toast({
        title: "Proyecto actualizado",
        description: `El vehículo ha sido transferido a ${newProject?.name || 'nuevo proyecto'}`,
      });
      // Update the found vehicle with new project
      setProjectVehicle({ ...projectVehicle, projectId: newProjectId });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el proyecto",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Proyecto desconocido';
  };

  const handleSearchPlateVehicle = () => {
    if (!plateSearchQuery.trim()) return;
    
    const vehicle = onSearchVehicle(plateSearchQuery);
    if (vehicle) {
      setPlateVehicle(vehicle);
      setNewPlate(vehicle.plate || "");
    } else {
      toast({
        title: "Vehículo no encontrado",
        description: "No se encontró un vehículo con ese VIN",
        variant: "destructive",
      });
      setPlateVehicle(null);
      setNewPlate("");
    }
  };

  const handleUpdatePlate = async () => {
    if (!plateVehicle) {
      toast({
        title: "Error",
        description: "Debe buscar y seleccionar un vehículo primero",
        variant: "destructive",
      });
      return;
    }

    if (!newPlate.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar un número de placa",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPlate(true);
    try {
      await onUpdatePlate(plateVehicle.id, newPlate.toUpperCase());
      toast({
        title: "Placa actualizada",
        description: `La placa ${newPlate.toUpperCase()} ha sido asignada correctamente`,
      });
      // Update the found vehicle with new plate
      setPlateVehicle({ ...plateVehicle, plate: newPlate.toUpperCase() });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la placa",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPlate(false);
    }
  };

  const handleSearchVehicle = () => {
    if (!searchQuery.trim()) return;
    
    const vehicle = onSearchVehicle(searchQuery);
    if (vehicle) {
      setFoundVehicle(vehicle);
      setNewCochera(vehicle.cochera || "");
    } else {
      toast({
        title: "Vehículo no encontrado",
        description: "No se encontró un vehículo con ese VIN o placa",
        variant: "destructive",
      });
      setFoundVehicle(null);
      setNewCochera("");
    }
  };

  const handleUpdateCochera = async () => {
    if (!foundVehicle) {
      toast({
        title: "Error",
        description: "Debe buscar y seleccionar un vehículo primero",
        variant: "destructive",
      });
      return;
    }

    if (!newCochera) {
      toast({
        title: "Error",
        description: "Debe seleccionar una cochera",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingCochera(true);
    try {
      await onUpdateCochera(foundVehicle.id, newCochera);
      toast({
        title: "Cochera actualizada",
        description: `El vehículo ha sido movido a ${newCochera}`,
      });
      // Update the found vehicle with new cochera
      setFoundVehicle({ ...foundVehicle, cochera: newCochera });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la cochera",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCochera(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      <Tabs defaultValue="plate" className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card">
          <TabsList className="grid grid-cols-3 w-full rounded-none">
            <TabsTrigger value="plate" className="gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2">
              <Car className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar</span> Placa
            </TabsTrigger>
            <TabsTrigger value="cochera" className="gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Cambiar</span> Cochera
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2">
              <FolderSync className="w-4 h-4" />
              <span className="hidden sm:inline">Cambiar</span> Proyecto
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="plate" className="flex-1 p-4 mt-0">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="w-5 h-5 text-accent" />
                Agregar Placa a Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar por VIN</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar vehículo por VIN..."
                      value={plateSearchQuery}
                      onChange={(e) => setPlateSearchQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchPlateVehicle()}
                      className="h-12 pl-10 font-mono"
                    />
                  </div>
                  <Button onClick={handleSearchPlateVehicle} className="h-12 px-6">
                    Buscar
                  </Button>
                </div>
              </div>

              {plateVehicle && (
                <>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      <p className="text-sm font-medium">Vehículo encontrado:</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      VIN: <span className="font-mono">{plateVehicle.vin}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {plateVehicle.model} • {plateVehicle.color}
                    </p>
                    {plateVehicle.plate && (
                      <p className="text-sm text-muted-foreground">
                        Placa actual: <span className="font-mono font-semibold">{plateVehicle.plate}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPlate">Número de Placa</Label>
                    <Input
                      id="newPlate"
                      placeholder="ABC-123"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                      className="h-12 font-mono"
                    />
                  </div>

                  <Button 
                    onClick={handleUpdatePlate}
                    className="w-full h-12"
                    disabled={!newPlate.trim() || isUpdatingPlate}
                  >
                    {isUpdatingPlate ? (
                      <>Actualizando...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Placa
                      </>
                    )}
                  </Button>
                </>
              )}

              {!plateVehicle && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Busque un vehículo por VIN para agregar o actualizar su placa</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cochera" className="flex-1 p-4 mt-0">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                Cambiar Cochera de Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar por VIN o Placa</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar vehículo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicle()}
                      className="h-12 pl-10 font-mono"
                    />
                  </div>
                  <Button onClick={handleSearchVehicle} className="h-12 px-6">
                    Buscar
                  </Button>
                </div>
              </div>

              {foundVehicle && (
                <>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      <p className="text-sm font-medium">Vehículo encontrado:</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      VIN: <span className="font-mono">{foundVehicle.vin}</span>
                    </p>
                    {foundVehicle.plate && (
                      <p className="text-sm text-muted-foreground">
                        Placa: <span className="font-mono">{foundVehicle.plate}</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {foundVehicle.model} • {foundVehicle.color}
                    </p>
                    {foundVehicle.cochera && (
                      <p className="text-sm text-muted-foreground">
                        Cochera actual: <span className="font-semibold">{foundVehicle.cochera}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nueva Cochera</Label>
                    <Select value={newCochera} onValueChange={setNewCochera}>
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

                  <Button 
                    onClick={handleUpdateCochera}
                    className="w-full h-12"
                    disabled={!newCochera || isUpdatingCochera}
                  >
                    {isUpdatingCochera ? (
                      <>Actualizando...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Actualizar Cochera
                      </>
                    )}
                  </Button>
                </>
              )}

              {!foundVehicle && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Busque un vehículo por VIN o placa para cambiar su cochera</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="flex-1 p-4 mt-0">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderSync className="w-5 h-5 text-accent" />
                Cambiar Proyecto de Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar por VIN o Placa</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar vehículo..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchProjectVehicle()}
                      className="h-12 pl-10 font-mono"
                    />
                  </div>
                  <Button onClick={handleSearchProjectVehicle} className="h-12 px-6">
                    Buscar
                  </Button>
                </div>
              </div>

              {projectVehicle && (
                <>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      <p className="text-sm font-medium">Vehículo encontrado:</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      VIN: <span className="font-mono">{projectVehicle.vin}</span>
                    </p>
                    {projectVehicle.plate && (
                      <p className="text-sm text-muted-foreground">
                        Placa: <span className="font-mono">{projectVehicle.plate}</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {projectVehicle.model} • {projectVehicle.color}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Proyecto actual: <span className="font-semibold">{getProjectName(projectVehicle.projectId)}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Nuevo Proyecto</Label>
                    <Select value={newProjectId} onValueChange={setNewProjectId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects
                          .filter(p => p.id !== projectVehicle.projectId)
                          .map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleUpdateProject}
                    className="w-full h-12"
                    disabled={!newProjectId || isUpdatingProject}
                  >
                    {isUpdatingProject ? (
                      <>Transfiriendo...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Transferir a Proyecto
                      </>
                    )}
                  </Button>
                </>
              )}

              {!projectVehicle && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Busque un vehículo por VIN o placa para cambiar su proyecto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}