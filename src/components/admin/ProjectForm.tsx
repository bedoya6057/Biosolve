import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Building2, Package, Save, Loader2 } from "lucide-react";
import { Company, Project } from "@/types";
import { equipmentCategories } from "@/data/equipmentData";
import { useEquipmentDB } from "@/hooks/useEquipmentDB";

interface ProjectFormProps {
  companies: Company[];
  onSubmit: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void> | void;
  onCancel: () => void;
  onAddCompany: () => void;
}

export function ProjectForm({ companies, onSubmit, onCancel, onAddCompany }: ProjectFormProps) {
  const { equipment, categories: dbCategories, isLoading: isLoadingEquipment } = useEquipmentDB();
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  
  const allCategories = [...new Set([...equipmentCategories, ...dbCategories])].sort();

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
    if (!name.trim() || !companyId || selectedEquipment.length === 0) return;
    
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        companyId,
        equipment: selectedEquipment,
        status: 'active',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = name.trim() && companyId && selectedEquipment.length > 0;

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-up flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="text-lg font-display font-bold">Nuevo Proyecto</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Form Content - scrollable */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName" className="text-sm font-medium">
              Nombre del Proyecto
            </Label>
            <Input
              id="projectName"
              placeholder="Ej: Equipamiento Flota 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Company Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Empresa
            </Label>
            <div className="flex gap-2">
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="flex-1 h-12">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={onAddCompany} className="h-12 w-12">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Equipment Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Equipamiento ({selectedEquipment.length} seleccionados)
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
                  {filteredEquipment.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedEquipment.includes(item.id)}
                        onCheckedChange={() => handleToggleEquipment(item.id)}
                      />
                      <span className="text-sm flex-1">{item.name}</span>
                    </label>
                  ))}
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
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar Proyecto
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
