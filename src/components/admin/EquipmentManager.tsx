import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Package, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEquipmentDB, EquipmentItemDB } from "@/hooks/useEquipmentDB";
import { equipmentCategories } from "@/data/equipmentData";

interface EquipmentManagerProps {
  onClose: () => void;
}

export function EquipmentManager({ onClose }: EquipmentManagerProps) {
  const { equipment, isLoading, addEquipment, deleteEquipment } = useEquipmentDB();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEquipment = filterCategory === "all" 
    ? equipment 
    : equipment.filter(e => e.category === filterCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) {
      toast.error("Complete todos los campos");
      return;
    }
    
    setIsSaving(true);
    try {
      await addEquipment(name.trim(), category);
      setName("");
      setCategory("");
    } catch {
      // Error already handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: EquipmentItemDB) => {
    setDeletingId(item.id);
    try {
      await deleteEquipment(item.id);
    } catch {
      // Error already handled in hook
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-up flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="text-lg font-display font-bold">Gestionar Equipamiento</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Add New Equipment Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Agregar Nuevo Ítem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="equipmentName">Nombre del Equipamiento</Label>
                <Input
                  id="equipmentName"
                  placeholder="Ej: Cámara de seguridad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={!name.trim() || !category || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Equipamiento
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Equipment List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Lista de Equipamiento ({equipment.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {equipmentCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {filteredEquipment.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
