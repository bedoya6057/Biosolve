import { useState, useEffect } from 'react';
import { Company, Project, Vehicle, EquipmentInstallation, TabType } from '@/types';
import { createId } from '@/lib/utils';

const STORAGE_KEYS = {
  companies: 'fleet-companies',
  projects: 'fleet-projects',
  vehicles: 'fleet-vehicles',
  installations: 'fleet-installations',
};

export function useAppStore() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [installations, setInstallations] = useState<EquipmentInstallation[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('admin');
  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const storedCompanies = localStorage.getItem(STORAGE_KEYS.companies);
        const storedProjects = localStorage.getItem(STORAGE_KEYS.projects);
        const storedVehicles = localStorage.getItem(STORAGE_KEYS.vehicles);
        const storedInstallations = localStorage.getItem(STORAGE_KEYS.installations);

        if (storedCompanies) setCompanies(JSON.parse(storedCompanies));
        if (storedProjects) setProjects(JSON.parse(storedProjects));
        if (storedVehicles) setVehicles(JSON.parse(storedVehicles));
        if (storedInstallations) setInstallations(JSON.parse(storedInstallations));
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save companies to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(companies));
    }
  }, [companies, isLoading]);

  // Save projects to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
    }
  }, [projects, isLoading]);

  // Save vehicles to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(vehicles));
    }
  }, [vehicles, isLoading]);

  // Save installations to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEYS.installations, JSON.stringify(installations));
    }
  }, [installations, isLoading]);

  // Company operations
  const addCompany = (company: Omit<Company, 'id' | 'createdAt'>) => {
    const newCompany: Company = {
      ...company,
      id: createId(),
      createdAt: new Date(),
    };
    setCompanies(prev => [...prev, newCompany]);
    return newCompany;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  // Project operations
  const addProject = (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: createId(),
      createdAt: new Date(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // Vehicle operations
  const addVehicle = (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: createId(),
      createdAt: new Date(),
    };
    setVehicles(prev => [...prev, newVehicle]);
    
    // Create installation records for the project's equipment
    const project = projects.find(p => p.id === vehicle.projectId);
    if (project) {
      const newInstallations: EquipmentInstallation[] = project.equipment.map(equipmentId => ({
        vehicleId: newVehicle.id,
        equipmentId,
        installed: false,
      }));
      setInstallations(prev => [...prev, ...newInstallations]);
    }
    
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    setInstallations(prev => prev.filter(i => i.vehicleId !== id));
  };

  // Installation operations
  const updateInstallation = (vehicleId: string, equipmentId: string, installed: boolean, notes?: string) => {
    setInstallations(prev => prev.map(i => 
      i.vehicleId === vehicleId && i.equipmentId === equipmentId
        ? { ...i, installed, installedAt: installed ? new Date() : undefined, notes }
        : i
    ));
  };

  const getVehicleInstallations = (vehicleId: string) => {
    return installations.filter(i => i.vehicleId === vehicleId);
  };

  // Search vehicle by VIN or plate
  const searchVehicle = (query: string) => {
    const normalizedQuery = query.toUpperCase().trim();
    return vehicles.find(v => 
      v.vin.toUpperCase().includes(normalizedQuery) || 
      v.plate.toUpperCase().includes(normalizedQuery)
    );
  };

  // Get project with company info
  const getProjectWithCompany = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const company = companies.find(c => c.id === project.companyId);
      return { ...project, company };
    }
    return null;
  };

  // Get vehicle progress
  const getVehicleProgress = (vehicleId: string) => {
    const vehicleInstallations = installations.filter(i => i.vehicleId === vehicleId);
    if (vehicleInstallations.length === 0) return 0;
    const installed = vehicleInstallations.filter(i => i.installed).length;
    return Math.round((installed / vehicleInstallations.length) * 100);
  };

  return {
    // Data
    companies,
    projects,
    vehicles,
    installations,
    isLoading,
    activeTab,
    setActiveTab,
    
    // Company operations
    addCompany,
    updateCompany,
    deleteCompany,
    
    // Project operations
    addProject,
    updateProject,
    deleteProject,
    getProjectWithCompany,
    
    // Vehicle operations
    addVehicle,
    updateVehicle,
    deleteVehicle,
    searchVehicle,
    getVehicleProgress,
    
    // Installation operations
    updateInstallation,
    getVehicleInstallations,
  };
}
