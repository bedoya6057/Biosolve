// IndexedDB wrapper for offline data storage

const DB_NAME = 'biosolve_offline_db';
const DB_VERSION = 1;

export interface PendingOperation {
  id: string;
  type: 'vehicle' | 'installation' | 'delivery' | 'audit' | 'vehicle_equipment_observation';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export interface OfflineData {
  empresas: any[];
  proyectos: any[];
  vehiculos: any[];
  instalaciones: any[];
  equipamiento: any[];
  vehiculosEntregados: any[];
  lastSyncTimestamp: number;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for cached data
        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' });
        }
        
        // Store for pending operations (queue)
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const store = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveOfflineData(data: Partial<OfflineData>): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('offlineData', 'readwrite');
      const store = transaction.objectStore('offlineData');

      for (const [key, value] of Object.entries(data)) {
        store.put({ key, value });
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getOfflineData(): Promise<OfflineData | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('offlineData', 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        if (result.length === 0) {
          resolve(null);
          return;
        }

        const data: any = {};
        result.forEach((item: { key: string; value: any }) => {
          data[item.key] = item.value;
        });
        resolve(data as OfflineData);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp'>): Promise<string> {
    if (!this.db) await this.init();
    
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pendingOperations', 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.add(fullOperation);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pendingOperations', 'readonly');
      const store = transaction.objectStore('pendingOperations');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pendingOperations', 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingOperations(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pendingOperations', 'readwrite');
      const store = transaction.objectStore('pendingOperations');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateLocalVehiculo(vehiculo: any): Promise<void> {
    const existing = await this.getOfflineData();
    const data: OfflineData =
      existing ??
      ({
        empresas: [],
        proyectos: [],
        vehiculos: [],
        instalaciones: [],
        equipamiento: [],
        vehiculosEntregados: [],
        lastSyncTimestamp: 0,
      } as OfflineData);

    const vehiculos = data.vehiculos || [];
    const existingIndex = vehiculos.findIndex((v: any) => v.id === vehiculo.id);

    if (existingIndex >= 0) {
      vehiculos[existingIndex] = vehiculo;
    } else {
      vehiculos.push(vehiculo);
    }

    await this.saveOfflineData({ vehiculos });
  }

  async updateLocalInstalacion(vehicleId: string, equipmentId: string, installed: boolean, notes?: string, user_id?: string | null): Promise<void> {
    const existing = await this.getOfflineData();
    const data: OfflineData =
      existing ??
      ({
        empresas: [],
        proyectos: [],
        vehiculos: [],
        instalaciones: [],
        equipamiento: [],
        vehiculosEntregados: [],
        lastSyncTimestamp: 0,
      } as OfflineData);

    const instalaciones = data.instalaciones || [];
    const existingIndex = instalaciones.findIndex(
      (i: any) => i.vehicle_id === vehicleId && i.equipment_id === equipmentId
    );

    const next = {
      vehicle_id: vehicleId,
      equipment_id: equipmentId,
      installed,
      installed_at: installed ? new Date().toISOString() : null,
      notes: notes || null,
      user_id: user_id || null,
      created_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      instalaciones[existingIndex] = { ...instalaciones[existingIndex], ...next };
    } else {
      instalaciones.push({ id: `offline_inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...next });
    }

    await this.saveOfflineData({ instalaciones });
  }

  async addLocalVehiculoEntregado(entrega: any): Promise<void> {
    const existing = await this.getOfflineData();
    const data: OfflineData =
      existing ??
      ({
        empresas: [],
        proyectos: [],
        vehiculos: [],
        instalaciones: [],
        equipamiento: [],
        vehiculosEntregados: [],
        lastSyncTimestamp: 0,
      } as OfflineData);

    const vehiculosEntregados = data.vehiculosEntregados || [];
    vehiculosEntregados.push({
      ...entrega,
      id: entrega.id ?? `offline_${Date.now()}`,
      created_at: entrega.created_at ?? new Date().toISOString(),
    });

    // Also update vehicle status locally
    const vehiculos = data.vehiculos || [];
    const vehiculoIndex = vehiculos.findIndex((v: any) => v.id === entrega.vehicle_id);
    if (vehiculoIndex >= 0) {
      vehiculos[vehiculoIndex].status = 'completed';
    }

    await this.saveOfflineData({ vehiculosEntregados, vehiculos });
  }
}

export const offlineStorage = new OfflineStorageService();
