import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Company } from "@/types";

interface CompanyFormProps {
  onSubmit: (company: Omit<Company, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function CompanyForm({ onSubmit, onCancel }: CompanyFormProps) {
  const [name, setName] = useState("");
  const [ruc, setRuc] = useState("");
  const [contact, setContact] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      ruc: ruc.trim() || undefined,
      contact: contact.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-display font-bold">Nueva Empresa</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nombre de la Empresa *</Label>
            <Input
              id="companyName"
              placeholder="Ej: Minera del Sur S.A."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ruc">RUC</Label>
            <Input
              id="ruc"
              placeholder="20123456789"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              className="h-12"
              maxLength={11}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contacto</Label>
            <Input
              id="contact"
              placeholder="Nombre o teléfono de contacto"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-12" disabled={!name.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
