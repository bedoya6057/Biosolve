import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trash2, 
  LogIn, 
  RefreshCcw, 
  Save, 
  Wifi, 
  WifiOff,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
  ArrowLeft,
  CloudUpload,
  Database,
  Loader2
} from "lucide-react";
import { logService, LogEntry, LogLevel, LogCategory } from "@/services/logService";
import { offlineStorage } from "@/services/offlineStorage";
import { useOfflineSafe } from "@/contexts/OfflineContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const levelConfig: Record<LogLevel, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  success: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  warning: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
  error: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
};

const categoryConfig: Record<LogCategory, { label: string; icon: React.ElementType }> = {
  auth: { label: "Auth", icon: LogIn },
  sync: { label: "Sync", icon: RefreshCcw },
  save: { label: "Guardado", icon: Save },
  network: { label: "Red", icon: Wifi },
  offline: { label: "Offline", icon: WifiOff },
  general: { label: "General", icon: Info },
};

const Logs = () => {
  const navigate = useNavigate();
  const offlineContext = useOfflineSafe();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  useEffect(() => {
    setLogs(logService.getLogs());
    const unsubscribe = logService.subscribe(setLogs);
    return unsubscribe;
  }, []);

  // Load pending operations
  const loadPendingOperations = async () => {
    setIsLoadingPending(true);
    try {
      const ops = await offlineStorage.getPendingOperations();
      setPendingOps(ops);
    } catch (error) {
      console.error('Error loading pending operations:', error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPendingOperations();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
      return true;
    });
  }, [logs, selectedCategory]);

  const stats = useMemo(() => ({
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
  }), [logs]);

  const handleForceSync = async () => {
    if (!offlineContext) return;
    logService.info('sync', 'Sincronización manual iniciada desde Logs');
    await offlineContext.triggerManualSync();
    await loadPendingOperations();
  };

  return (
    <div className="min-h-screen bg-background safe-area-top">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#3A3A3A] text-white px-4 py-3 safe-area-top">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Registros del Sistema</h1>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Pending Operations Card */}
        <Card className="border-accent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Operaciones Pendientes
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadPendingOperations} disabled={isLoadingPending}>
                  {isLoadingPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={handleForceSync} disabled={pendingOps.length === 0}>
                  <CloudUpload className="w-4 h-4 mr-1" />
                  Sincronizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingOps.length === 0 ? (
              <div className="text-center text-muted-foreground py-2">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                No hay operaciones pendientes
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-amber-600 mb-2">
                  {pendingOps.length} operación(es) por sincronizar
                </div>
                {pendingOps.map((op, index) => (
                  <div key={op.id || index} className="p-2 bg-muted rounded text-sm">
                    <div className="font-medium">{op.type} - {op.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(op.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-xs text-red-600/70">Errores</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <div className="text-xs text-yellow-600/70">Alertas</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
              <Button variant="destructive" size="sm" onClick={() => logService.clearLogs()}>
                <Trash2 className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant={selectedCategory === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory('all')}>Todas</Badge>
              {(Object.keys(categoryConfig) as LogCategory[]).map(cat => (
                <Badge key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(cat)}>
                  {categoryConfig[cat].label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Registros ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-580px)]">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No hay registros</div>
              ) : (
                <div className="divide-y">
                  {filteredLogs.map(log => {
                    const levelConf = levelConfig[log.level];
                    const catConf = categoryConfig[log.category];
                    const LevelIcon = levelConf.icon;
                    return (
                      <div key={log.id} className="p-3 hover:bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded ${levelConf.bg}`}>
                            <LevelIcon className={`w-4 h-4 ${levelConf.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">{catConf.label}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(log.timestamp, "dd/MM HH:mm:ss", { locale: es })}
                              </span>
                            </div>
                            <div className="text-sm font-medium">{log.message}</div>
                            {log.details && <div className="text-xs text-muted-foreground mt-1 break-all">{log.details}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Logs;
