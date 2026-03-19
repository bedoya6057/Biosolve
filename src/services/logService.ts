// Log service for tracking app events

export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type LogCategory = 'auth' | 'sync' | 'save' | 'network' | 'offline' | 'general';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string;
}

const MAX_HOURS = 24;
const STORAGE_KEY = 'app_logs';

class LogService {
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private purgeOldLogs() {
    const cutoff = new Date(Date.now() - MAX_HOURS * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp >= cutoff);
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
        this.purgeOldLogs();
      }
    } catch (e) {
      console.error('Error loading logs from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      this.purgeOldLogs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Error saving logs to storage:', e);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  log(level: LogLevel, category: LogCategory, message: string, details?: string) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      details,
    };

    this.logs.unshift(entry);
    this.purgeOldLogs();

    this.saveToStorage();
    this.notifyListeners();

    // Also log to console for debugging
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${category.toUpperCase()}] ${message}`, details || '');
  }

  // Convenience methods
  info(category: LogCategory, message: string, details?: string) {
    this.log('info', category, message, details);
  }

  success(category: LogCategory, message: string, details?: string) {
    this.log('success', category, message, details);
  }

  warning(category: LogCategory, message: string, details?: string) {
    this.log('warning', category, message, details);
  }

  error(category: LogCategory, message: string, details?: string) {
    this.log('error', category, message, details);
  }

  // Auth specific
  logLogin(email: string) {
    this.success('auth', 'Inicio de sesión exitoso', `Usuario: ${email}`);
  }

  logLogout() {
    this.info('auth', 'Sesión cerrada');
  }

  logAuthError(error: string) {
    this.error('auth', 'Error de autenticación', error);
  }

  // Sync specific
  logSyncStart(itemCount: number) {
    this.info('sync', 'Sincronización iniciada', `${itemCount} operaciones pendientes`);
  }

  logSyncProgress(current: number, total: number) {
    this.info('sync', `Sincronizando ${current}/${total}`, `Progreso: ${Math.round((current / total) * 100)}%`);
  }

  logSyncComplete(successCount: number, errorCount: number) {
    if (errorCount > 0) {
      this.warning('sync', 'Sincronización completada con errores', `Exitosos: ${successCount}, Errores: ${errorCount}`);
    } else {
      this.success('sync', 'Sincronización completada', `${successCount} operaciones sincronizadas`);
    }
  }

  logSyncError(error: string) {
    this.error('sync', 'Error de sincronización', error);
  }

  // Save specific
  logSaveStart(type: string) {
    this.info('save', `Guardando ${type}...`);
  }

  logSaveSuccess(type: string, id?: string) {
    this.success('save', `${type} guardado correctamente`, id ? `ID: ${id}` : undefined);
  }

  logSaveError(type: string, error: string) {
    this.error('save', `Error al guardar ${type}`, error);
  }

  // Network specific
  logOnline() {
    this.success('network', 'Conexión restaurada');
  }

  logOffline() {
    this.warning('network', 'Sin conexión a internet');
  }

  // Offline specific
  logOfflineOperation(type: string) {
    this.info('offline', `Operación guardada offline: ${type}`);
  }

  // Get all logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs by category
  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  // Subscribe to log updates
  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const logService = new LogService();
