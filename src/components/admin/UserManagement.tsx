import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Plus, Loader2, Shield, ClipboardList, Wrench, Trash2, ClipboardCheck, Pencil } from 'lucide-react';
import { z } from 'zod';

type AppRole = 'admin' | 'registrador' | 'tecnico' | 'auditor';

interface Usuario {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
  created_at: string;
  role?: AppRole;
}

const userSchema = z.object({
  nombre: z.string().trim().min(1, { message: 'El nombre es requerido' }).max(100),
  apellido: z.string().trim().min(1, { message: 'El apellido es requerido' }).max(100),
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  role: z.enum(['admin', 'registrador', 'tecnico', 'auditor']),
});

const roleLabels: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Administrador', icon: <Shield className="w-4 h-4" />, color: 'bg-red-500/10 text-red-500' },
  registrador: { label: 'Registrador', icon: <ClipboardList className="w-4 h-4" />, color: 'bg-blue-500/10 text-blue-500' },
  tecnico: { label: 'Técnico', icon: <Wrench className="w-4 h-4" />, color: 'bg-green-500/10 text-green-500' },
  auditor: { label: 'Auditor', icon: <ClipboardCheck className="w-4 h-4" />, color: 'bg-purple-500/10 text-purple-500' },
};

export function UserManagement() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    role: 'registrador' as AppRole,
  });
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    role: 'registrador' as AppRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (usuariosError) throw usuariosError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usuariosWithRoles = (usuariosData || []).map((usuario) => ({
        ...usuario,
        role: rolesData?.find((r) => r.user_id === usuario.user_id)?.role as AppRole | undefined,
      }));

      setUsuarios(usuariosWithRoles);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = userSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Use edge function to create user (doesn't affect current session)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          nombre: formData.nombre,
          apellido: formData.apellido,
          role: formData.role,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error al crear el usuario');

      toast({
        title: 'Usuario creado',
        description: `${formData.nombre} ${formData.apellido} ha sido registrado como ${roleLabels[formData.role].label}`,
      });

      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        role: 'registrador',
      });
      setShowForm(false);
      fetchUsuarios();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear el usuario';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (usuario: Usuario) => {
    setEditingUser(usuario);
    setEditFormData({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      password: '',
      role: usuario.role || 'registrador',
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    setErrors({});

    // Validate
    if (!editFormData.nombre.trim()) {
      setErrors({ nombre: 'El nombre es requerido' });
      setIsSubmitting(false);
      return;
    }
    if (!editFormData.apellido.trim()) {
      setErrors({ apellido: 'El apellido es requerido' });
      setIsSubmitting(false);
      return;
    }
    if (!editFormData.email.trim()) {
      setErrors({ email: 'El email es requerido' });
      setIsSubmitting(false);
      return;
    }
    if (editFormData.password && editFormData.password.length < 6) {
      setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
      setIsSubmitting(false);
      return;
    }

    try {
      // Use edge function to update user (handles auth updates)
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          user_id: editingUser.user_id,
          email: editFormData.email.trim(),
          password: editFormData.password || undefined,
          nombre: editFormData.nombre.trim(),
          apellido: editFormData.apellido.trim(),
          role: editFormData.role,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error al actualizar el usuario');

      toast({
        title: 'Usuario actualizado',
        description: `${editFormData.nombre} ${editFormData.apellido} ha sido actualizado`,
      });

      setShowEditForm(false);
      setEditingUser(null);
      fetchUsuarios();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el usuario';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (usuario: Usuario) => {
    if (!confirm(`¿Estás seguro de eliminar a ${usuario.nombre} ${usuario.apellido}?`)) {
      return;
    }

    try {
      // Delete from usuarios table (cascade will handle user_roles)
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', usuario.id);

      if (error) throw error;

      toast({
        title: 'Usuario eliminado',
        description: 'El usuario ha sido eliminado correctamente',
      });

      fetchUsuarios();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-4 pb-24 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-accent" />
              <h2 className="font-display font-bold text-lg">Gestión de Usuarios</h2>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(roleLabels).map(([role, info]) => {
              const count = usuarios.filter((u) => u.role === role).length;
              return (
                <Card key={role} className="glass-card">
                  <CardContent className="p-3 text-center">
                    <div className={`w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center ${info.color}`}>
                      {info.icon}
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{info.label}s</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {usuarios.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay usuarios registrados</p>
                  <Button onClick={() => setShowForm(true)} variant="link" className="mt-2">
                    Crear primer usuario
                  </Button>
                </CardContent>
              </Card>
            ) : (
              usuarios.map((usuario) => (
                <Card key={usuario.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {usuario.nombre} {usuario.apellido}
                        </p>
                        <p className="text-sm text-muted-foreground">{usuario.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {usuario.role && (
                          <Badge className={roleLabels[usuario.role].color}>
                            {roleLabels[usuario.role].icon}
                            <span className="ml-1">{roleLabels[usuario.role].label}</span>
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(usuario)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteUser(usuario)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* New User Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Registra un nuevo usuario con acceso al sistema
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Juan"
                  className={errors.nombre ? 'border-destructive' : ''}
                />
                {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Pérez"
                  className={errors.apellido ? 'border-destructive' : ''}
                />
                {errors.apellido && <p className="text-sm text-destructive">{errors.apellido}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrador - Acceso total
                    </div>
                  </SelectItem>
                  <SelectItem value="registrador">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Registrador - Registro y entregas
                    </div>
                  </SelectItem>
                  <SelectItem value="tecnico">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Técnico - Equipamiento
                    </div>
                  </SelectItem>
                  <SelectItem value="auditor">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" />
                      Auditor - Auditoría de equipos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Usuario'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input
                  id="edit-nombre"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                  placeholder="Juan"
                  className={errors.nombre ? 'border-destructive' : ''}
                />
                {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apellido">Apellido</Label>
                <Input
                  id="edit-apellido"
                  value={editFormData.apellido}
                  onChange={(e) => setEditFormData({ ...editFormData, apellido: e.target.value })}
                  placeholder="Pérez"
                  className={errors.apellido ? 'border-destructive' : ''}
                />
                {errors.apellido && <p className="text-sm text-destructive">{errors.apellido}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Correo electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">Nueva Contraseña (dejar vacío para mantener)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="••••••••"
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: AppRole) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="registrador">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Registrador
                    </div>
                  </SelectItem>
                  <SelectItem value="tecnico">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Técnico
                    </div>
                  </SelectItem>
                  <SelectItem value="auditor">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" />
                      Auditor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditForm(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
