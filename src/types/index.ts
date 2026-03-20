export interface Company {
  id: string;
  name: string;
  ruc?: string;
  contact?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category?: string;
}

export interface Project {
  id: string;
  name: string;
  companyId: string;
  company?: Company;
  equipment: string[]; // Equipment IDs
  createdAt: Date;
  status: 'active' | 'completed' | 'pending' | 'paused';
}

export interface VehicleCheckItem {
  category: string;
  item: string;
  hasIt: boolean | null;
  observation: string;
}

export interface Vehicle {
  id: string;
  projectId: string;
  project?: Project;
  vin: string;
  plate: string;
  color: string;
  model: string;
  deliveryDate: string;
  deliveryTime: string;
  kmEntry: string;
  checkItems: VehicleCheckItem[];
  photos: string[];
  createdAt: Date;
  status: 'pending' | 'in-progress' | 'completed';
  deliveryPersonName?: string;
  deliveryPersonPosition?: string;
  deliveryPersonDni?: string;
  deliverySignature?: string;
  cochera?: string;
  observations?: string;
  dealerSheetPhoto?: string;
}

export interface EquipmentInstallation {
  vehicleId: string;
  equipmentId: string;
  installed: boolean;
  installedAt?: Date;
  notes?: string;
}

export type TabType = 'dashboard' | 'admin' | 'users' | 'register' | 'equipment' | 'delivery' | 'extra' | 'audit';
