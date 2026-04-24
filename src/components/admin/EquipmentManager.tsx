import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Package, Loader2, Trash2, Edit2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { useEquipmentDB, EquipmentItemDB } from "@/hooks/useEquipmentDB";
import { equipmentCategories as staticCategories } from "@/data/equipmentData";

interface EquipmentManagerProps {
  onClose: () => void;
}

export function EquipmentManager({ onClose }: EquipmentManagerProps) {
  const { equipment, categories: dbCategories, isLoading, addEquipment, updateEquipment, deleteEquipment } = useEquipmentDB();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const allCategories = [...new Set([...staticCategories, ...dbCategories])].sort();

  const filteredEquipment = filterCategory === "all" 
    ? equipment 
    : equipment.filter(e => e.category === filterCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = showNewCategoryInput ? newCategoryName.trim() : category;
    const finalName = name.trim() || (showNewCategoryInput ? "General" : "");
    
    if (!finalName || !finalCategory) {
      toast.error("Complete todos los campos");
      return;
    }
    
    setIsSaving(true);
    try {
      await addEquipment(finalName, finalCategory);
      setName("");
      setCategory("");
      setNewCategoryName("");
      setShowNewCategoryInput(false);
    } catch {
      // Error already handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (item: EquipmentItemDB) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
  };

  const handleSaveEdit = async (item: EquipmentItemDB) => {
    if (!editName.trim() || !editCategory) {
      toast.error("Complete todos los campos");
      return;
    }

    setIsSaving(true);
    try {
      await updateEquipment(item.id, editName.trim(), editCategory);
      setEditingId(null);
    } catch {
      // Error handled in hook
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
                <div className="flex items-center justify-between">
                  <Label>Categoría</Label>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="h-auto p-0 text-xs"
                    onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  >
                    {showNewCategoryInput ? "Seleccionar existente" : "+ Nueva categoría"}
                  </Button>
                </div>
                
                {showNewCategoryInput ? (
                  <Input
                    placeholder="Nombre de la nueva categoría"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-12"
                  />
                ) : (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={isSaving || (showNewCategoryInput ? !newCategoryName.trim() : (!name.trim() || !category))}
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
                {allCategories.map(cat => (
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
                      className="flex flex-col p-2 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
                    >
                      {editingId === item.id ? (
                        <div className="space-y-2 py-1">
                          <Input 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Nombre del ítem"
                          />
                          <div className="flex gap-2">
                            <Select value={editCategory} onValueChange={setEditCategory}>
                              <SelectTrigger className="h-8 flex-1 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allCategories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-primary"
                              onClick={() => handleSaveEdit(item)}
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStartEdit(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
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
                        </div>
                      )}
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
