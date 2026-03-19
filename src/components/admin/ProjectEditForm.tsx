import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Package, Save, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Project } from "@/types";
import { equipmentCategories, equipmentList } from "@/data/equipmentData";
import { useEquipmentDB } from "@/hooks/useEquipmentDB";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProjectEditFormProps {
  project: Project;
  onSubmit: (projectId: string, equipment: string[]) => Promise<void>;
  onCancel: () => void;
}

export function ProjectEditForm({ project, onSubmit, onCancel }: ProjectEditFormProps) {
  const { equipment, isLoading: isLoadingEquipment } = useEquipmentDB();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(project.equipment);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);

  const filteredEquipment = filterCategory === "all" 
    ? equipment 
    : equipment.filter(e => e.category === filterCategory);

  const handleToggleEquipment = (id: string) => {
    setSelectedEquipment(prev => 
      prev.includes(id) 
        ? prev.filter(e => e !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filteredIds = filteredEquipment.map(e => e.id);
    const allSelected = filteredIds.every(id => selectedEquipment.includes(id));
    
    if (allSelected) {
      setSelectedEquipment(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedEquipment(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEquipment.length === 0) return;
    
    setIsSaving(true);
    try {
      await onSubmit(project.id, selectedEquipment);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFromProject = (equipmentId: string) => {
    setSelectedEquipment(prev => prev.filter(id => id !== equipmentId));
  };

  const selectedItemsDetailed = selectedEquipment.map((id) => {
    const dbItem = equipment.find((e) => e.id === id);
    if (dbItem) {
      return { id, name: dbItem.name, category: dbItem.category, source: "db" as const };
    }

    const legacyItem = equipmentList.find((e) => e.id === id);
    if (legacyItem) {
      return { id, name: legacyItem.name, category: legacyItem.category ?? "", source: "legacy" as const };
    }

    return { id, name: `Ítem ${id}`, category: "", source: "unknown" as const };
  });

  const newItemsCount = selectedItemsDetailed.filter(
    (item) => item.source === "db" && !project.equipment.includes(item.id)
  ).length;

  const removedItemsCount = project.equipment.filter((id) => !selectedEquipment.includes(id)).length;

  const hasLegacyIds = selectedItemsDetailed.some((i) => i.source !== "db");

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-up flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h2 className="text-lg font-display font-bold">Editar Proyecto</h2>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Equipment Selection - Available Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Agregar Equipamiento
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

              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={handleSelectAll}
                className="w-full"
                disabled={isLoadingEquipment}
              >
                {filteredEquipment.every(e => selectedEquipment.includes(e.id)) 
                  ? "Deseleccionar todos" 
                  : "Seleccionar todos"}
              </Button>

              {isLoadingEquipment ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {filteredEquipment.map(item => {
                    const isSelected = selectedEquipment.includes(item.id);
                    
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors ${
                          isSelected ? 'bg-accent/10' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleEquipment(item.id)}
                        />
                        <span className="text-sm flex-1">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Equipment - Bottom Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Equipamiento Seleccionado ({selectedEquipment.length})
                {newItemsCount > 0 && (
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                    +{newItemsCount} nuevos
                  </span>
                )}
                {removedItemsCount > 0 && (
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                    -{removedItemsCount} eliminados
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasLegacyIds && (
                <Alert className="mb-3">
                  <AlertDescription>
                    Este proyecto tiene equipamiento creado con el formato anterior; aquí lo verás listado y puedes
                    quitarlo del proyecto. Al guardar, quedará actualizado con los ítems seleccionados.
                  </AlertDescription>
                </Alert>
              )}

              {selectedItemsDetailed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay equipamiento seleccionado
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {selectedItemsDetailed.map((item) => {
                    const isOriginal = project.equipment.includes(item.id);
                    const isLegacy = item.source !== "db";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span className="text-sm flex-1">
                          {item.name}
                          {isLegacy && (
                            <span className="text-xs text-muted-foreground ml-2">(anterior)</span>
                          )}
                          {!isLegacy && isOriginal && (
                            <span className="text-xs text-muted-foreground ml-2">(original)</span>
                          )}
                          {!isLegacy && !isOriginal && (
                            <span className="text-xs text-primary ml-2">(nuevo)</span>
                          )}
                        </span>
                        {item.category ? (
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                          onClick={() => handleRemoveFromProject(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fixed Footer with Button */}
        <div className="shrink-0 p-4 pb-6 border-t border-border bg-card">
          <Button 
            type="submit" 
            className="w-full h-14 font-semibold text-base gap-2"
            disabled={selectedEquipment.length === 0 || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
