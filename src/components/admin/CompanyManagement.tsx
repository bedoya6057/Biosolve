import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Building2, Pencil, Trash2, Loader2, Save } from "lucide-react";
import { Company } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyManagementProps {
  companies: Company[];
  onClose: () => void;
  onUpdateCompany: (id: string, data: { name: string; ruc?: string; contact?: string }) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
}

export function CompanyManagement({ companies, onClose, onUpdateCompany, onDeleteCompany }: CompanyManagementProps) {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRuc, setEditRuc] = useState("");
  const [editContact, setEditContact] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditClick = (company: Company) => {
    setEditingCompany(company);
    setEditName(company.name);
    setEditRuc(company.ruc || "");
    setEditContact(company.contact || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCompany || !editName.trim()) return;
    
    setIsSaving(true);
    try {
      await onUpdateCompany(editingCompany.id, {
        name: editName.trim(),
        ruc: editRuc.trim() || undefined,
        contact: editContact.trim() || undefined,
      });
      setEditingCompany(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!companyId || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDeleteCompany(companyId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting company:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-up flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <h2 className="text-lg font-display font-bold">Gestionar Empresas</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No hay empresas registradas</p>
              </CardContent>
            </Card>
          ) : (
            companies.map(company => (
              <Card key={company.id} className="glass-card">
                {editingCompany?.id === company.id ? (
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editName">Nombre</Label>
                      <Input
                        id="editName"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editRuc">RUC</Label>
                      <Input
                        id="editRuc"
                        value={editRuc}
                        onChange={(e) => setEditRuc(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editContact">Contacto</Label>
                      <Input
                        id="editContact"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditingCompany(null)}
                        disabled={isSaving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{company.name}</h3>
                        {company.ruc && (
                          <p className="text-sm text-muted-foreground">RUC: {company.ruc}</p>
                        )}
                        {company.contact && (
                          <p className="text-sm text-muted-foreground">Contacto: {company.contact}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(company)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeleteConfirmId(company.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la empresa permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault();
                  const companyId = deleteConfirmId;
                  if (!companyId) return;
                  void handleDelete(companyId);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
