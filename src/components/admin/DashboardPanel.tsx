import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderOpen,
  Car,
  Send,
  Wrench,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  X,
  Filter,
  ExternalLink
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Company, Project, Vehicle, EquipmentInstallation } from "@/types";
import { useEquipmentDB } from "@/hooks/useEquipmentDB";
import type { VehiculoEntregadoDB } from "@/hooks/useProjectsDB";

interface DashboardPanelProps {
  companies: Company[];
  projects: Project[];
  vehicles: Vehicle[];
  installations: EquipmentInstallation[];
  vehiculosEntregados: VehiculoEntregadoDB[];
  getVehicleProgress: (vehicleId: string) => number;
}

// Premium color palette
const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a78bfa", // light violet
  "#818cf8", // light indigo
  "#c084fc", // purple
  "#e879f9", // fuchsia
  "#f472b6", // pink
  "#fb923c", // orange
];

const GRADIENT_PAIRS = [
  { start: "#6366f1", end: "#8b5cf6" },
  { start: "#3b82f6", end: "#6366f1" },
  { start: "#8b5cf6", end: "#c084fc" },
  { start: "#06b6d4", end: "#3b82f6" },
];

export function DashboardPanel({
  companies,
  projects,
  vehicles,
  installations,
  vehiculosEntregados,
  getVehicleProgress,
}: DashboardPanelProps) {
  const [globalCompanyFilter, setGlobalCompanyFilter] = useState<string>("all");
  const [globalProjectFilter, setGlobalProjectFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "installed" | "pending">("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const { equipment: equipmentDB } = useEquipmentDB();

  // ── Global Filtering ──────────────────────────────────────────

  // Determine available projects based on company filter
  const availableProjects = useMemo(() => {
    if (globalCompanyFilter === "all") return projects;
    return projects.filter((p) => p.companyId === globalCompanyFilter);
  }, [projects, globalCompanyFilter]);

  // When company filter changes, reset project filter if the selected project doesn't belong to the new company
  useMemo(() => {
    if (
      globalProjectFilter !== "all" &&
      globalCompanyFilter !== "all"
    ) {
      const proj = projects.find((p) => p.id === globalProjectFilter);
      if (proj && proj.companyId !== globalCompanyFilter) {
        setGlobalProjectFilter("all");
      }
    }
  }, [globalCompanyFilter, globalProjectFilter, projects]);

  // Filter core data sets based on global filters
  const filteredProjects = useMemo(() => {
    let list = projects;
    if (globalCompanyFilter !== "all") {
      list = list.filter((p) => p.companyId === globalCompanyFilter);
    }
    if (globalProjectFilter !== "all") {
      list = list.filter((p) => p.id === globalProjectFilter);
    }
    return list;
  }, [projects, globalCompanyFilter, globalProjectFilter]);

  const filteredVehicles = useMemo(() => {
    const validProjectIds = new Set(filteredProjects.map((p) => p.id));
    return vehicles.filter((v) => validProjectIds.has(v.projectId));
  }, [vehicles, filteredProjects]);

  const filteredDeliveredIds = useMemo(() => {
    const validVehicleIds = new Set(filteredVehicles.map((v) => v.id));
    return new Set(
      vehiculosEntregados
        .filter((ve) => validVehicleIds.has(ve.vehicle_id))
        .map((ve) => ve.vehicle_id)
    );
  }, [vehiculosEntregados, filteredVehicles]);

  const filteredInstallations = useMemo(() => {
    const validVehicleIds = new Set(filteredVehicles.map((v) => v.id));
    return installations.filter((i) => validVehicleIds.has(i.vehicleId));
  }, [installations, filteredVehicles]);

  // ── Derived data (Using Filtered Data) ─────────────────────────

  const totalVehicles = filteredVehicles.length;
  const deliveredCount = filteredDeliveredIds.size;
  const pendingCount = totalVehicles - deliveredCount;

  const globalProgress = useMemo(() => {
    if (filteredVehicles.length === 0) return 0;
    const sum = filteredVehicles.reduce((acc, v) => acc + getVehicleProgress(v.id), 0);
    return Math.round(sum / filteredVehicles.length);
  }, [filteredVehicles, getVehicleProgress]);

  // ── Project progress (Using Filtered Data) ─────────────────────

  const projectProgressData = useMemo(() => {
    return filteredProjects.map((project) => {
      const projectVehicles = filteredVehicles.filter((v) => v.projectId === project.id);
      const vehicleCount = projectVehicles.length;
      const avgProgress =
        vehicleCount > 0
          ? Math.round(
              projectVehicles.reduce((sum, v) => sum + getVehicleProgress(v.id), 0) /
                vehicleCount
            )
          : 0;
      const deliveredInProject = projectVehicles.filter((v) =>
        filteredDeliveredIds.has(v.id)
      ).length;
      return {
        name: project.name.length > 18 ? project.name.slice(0, 18) + "…" : project.name,
        fullName: project.name,
        avance: avgProgress,
        vehiculos: vehicleCount,
        entregados: deliveredInProject,
      };
    });
  }, [filteredProjects, filteredVehicles, getVehicleProgress, filteredDeliveredIds]);

  // ── Vehicle table (Using Filtered Data) ────────────────────────

  const tableVehicles = useMemo(() => {
    let list = filteredVehicles;

    // Filter by equipment if active
    if (equipmentFilter) {
      const vehiclesWithEq = new Set(
        filteredInstallations
          .filter(
            (i) =>
              ((equipmentDB.find((e) => e.id === i.equipmentId)?.name ??
                i.equipmentId) === equipmentFilter) && i.installed
          )
          .map((i) => i.vehicleId)
      );
      list = list.filter((v) => vehiclesWithEq.has(v.id));
    }

    // Filter by general status if active
    if (statusFilter !== "all") {
      if (statusFilter === "installed") {
        // Show only vehicles with 100% progress (or delivered)
        list = list.filter((v) => getVehicleProgress(v.id) === 100 || filteredDeliveredIds.has(v.id));
      } else {
        // Show only pending vehicles (< 100%)
        list = list.filter((v) => getVehicleProgress(v.id) < 100 && !filteredDeliveredIds.has(v.id));
      }
    }

    return list.map((v) => {
      const project = projects.find((p) => p.id === v.projectId);
      const progress = getVehicleProgress(v.id);
      const delivered = filteredDeliveredIds.has(v.id);
      
      // Aggregate all possible photos for this vehicle
      const allPhotos = [...(v.photos || [])];
      
      if (v.dealerSheetPhoto) {
        allPhotos.push(v.dealerSheetPhoto);
      }
      
      if (delivered) {
        const deliveryData = vehiculosEntregados.find(ve => ve.vehicle_id === v.id);
        if (deliveryData) {
          const dPhotos = [deliveryData.foto_1, deliveryData.foto_2, deliveryData.foto_3, deliveryData.foto_4].filter(Boolean) as string[];
          allPhotos.push(...dPhotos);
        }
      }

      const company = companies.find(c => c.id === project?.companyId);

      return {
        id: v.id,
        vin: v.vin,
        plate: v.plate,
        model: v.model,
        projectName: project?.name ?? "—",
        companyName: company?.name ?? "—",
        progress,
        delivered,
        photos: allPhotos,
      };
    }).sort((a, b) => b.progress - a.progress);
  }, [
    filteredVehicles,
    projects,
    companies,
    getVehicleProgress,
    filteredDeliveredIds,
    equipmentFilter,
    filteredInstallations,
    equipmentDB,
    statusFilter,
    vehiculosEntregados,
  ]);

  // ── Equipment distribution (Using Filtered Data) ────────────────

  const equipmentData = useMemo(() => {
    // If a specific vehicle is selected in the table, the chart only applies to that vehicle
    const baseVehicles = selectedVehicleId 
      ? filteredVehicles.filter(v => v.id === selectedVehicleId) 
      : filteredVehicles;

    const eqMap = new Map<
      string,
      { totalRequiredCount: number; installedCount: number; equipmentName: string }
    >();

    // 1. Gather requirements from all projects of the base vehicles
    baseVehicles.forEach((v) => {
      const proj = projects.find((p) => p.id === v.projectId);
      if (proj && proj.equipment) {
        proj.equipment.forEach((eqId) => {
          if (!eqMap.has(eqId)) {
            const eqDef = equipmentDB.find((edb) => edb.id === eqId);
            eqMap.set(eqId, {
              totalRequiredCount: 0,
              installedCount: 0,
              equipmentName: eqDef ? eqDef.name : eqId,
            });
          }
          eqMap.get(eqId)!.totalRequiredCount += 1;
        });
      }
    });

    // 2. Count installations ONLY for the base vehicles
    const relevantInstallations = filteredInstallations.filter(i => 
      baseVehicles.some(v => v.id === i.vehicleId)
    );

    relevantInstallations.forEach((i) => {
      if (i.installed && eqMap.has(i.equipmentId)) {
        eqMap.get(i.equipmentId)!.installedCount += 1;
      }
    });

    const arr = Array.from(eqMap.entries()).map(([id, val]) => {
      const nameToUse = val.equipmentName.length > 14 ? val.equipmentName.slice(0, 14) + "…" : val.equipmentName;
      const percentage = val.totalRequiredCount > 0 ? Math.round((val.installedCount / val.totalRequiredCount) * 100) : 0;
      return {
        name: nameToUse,
        fullName: val.equipmentName,
        idRef: val.equipmentName, // Reference for filtering
        instalado: val.installedCount,
        pendiente: val.totalRequiredCount - val.installedCount,
        total: val.totalRequiredCount,
        pct: percentage,
      };
    });

    // Sort by percentage descending for clear visibility
    arr.sort((a, b) => b.pct - a.pct);
    return arr;
  }, [filteredVehicles, filteredInstallations, projects, equipmentDB, selectedVehicleId]);

  const equipmentPieData = useMemo(() => {
    const installed = filteredInstallations.filter((i) => i.installed).length;
    const pending = filteredInstallations.length - installed;
    return [
      { name: "Instalado", value: installed, color: "#6366f1", filterVal: "installed" },
      { name: "Pendiente", value: pending, color: "#e2e8f0", filterVal: "pending" },
    ];
  }, [filteredInstallations]);

  // ── Custom tooltips ───────────────────────────────────────────

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-4 py-3 shadow-xl">
        <p className="font-semibold text-sm mb-1">{d.fullName}</p>
        <p className="text-xs text-muted-foreground">
          Avance: <span className="font-bold text-accent">{d.avance}%</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Vehículos: {d.vehiculos} · Entregados: {d.entregados}
        </p>
      </div>
    );
  };

  const CustomEqPctTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg px-4 py-3 shadow-xl">
        <p className="font-semibold text-sm mb-1">{d.fullName}</p>
        <p className="text-xs text-muted-foreground mb-1">
          Completado: <span className="font-bold text-accent">{d.pct}%</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {d.instalado} de {d.total} instalados
        </p>
      </div>
    );
  };

  // ── Progress bar helper ───────────────────────────────────────

  const ProgressBar = ({ value, className = "" }: { value: number; className?: string }) => (
    <div className={`h-2.5 rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${GRADIENT_PAIRS[0].start}, ${GRADIENT_PAIRS[0].end})`,
        }}
      />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <ScrollArea className="flex-1">
      <div 
        className="p-4 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        onDoubleClick={() => {
          // Clear all filters on double click (PowerBI style)
          setGlobalCompanyFilter("all");
          setGlobalProjectFilter("all");
          setEquipmentFilter(null);
          setStatusFilter("all");
          setSelectedVehicleId(null);
        }}
      >
        
        {/* ─── Global Filters Row ───────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">
              Filtro por Cliente
            </label>
            <Select value={globalCompanyFilter} onValueChange={setGlobalCompanyFilter}>
              <SelectTrigger className="h-9 glass-card border-none bg-background/50">
                <SelectValue placeholder="Todas las empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">
              Filtro por Proyecto
            </label>
            <Select value={globalProjectFilter} onValueChange={setGlobalProjectFilter}>
              <SelectTrigger className="h-9 glass-card border-none bg-background/50">
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {availableProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ─── KPI Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Proyectos */}
          <Card className="glass-card relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 text-center relative z-10">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                {filteredProjects.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Proyectos</p>
            </CardContent>
          </Card>

          {/* Total Vehículos */}
          <Card className="glass-card relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 text-center relative z-10">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                {totalVehicles}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Vehículos</p>
            </CardContent>
          </Card>

          {/* Entregados */}
          <Card className="glass-card relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 text-center relative z-10">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Send className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                {deliveredCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Entregados</p>
            </CardContent>
          </Card>

          {/* Avance Global */}
          <Card className="glass-card relative overflow-hidden group hover:shadow-lg transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 text-center relative z-10">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-500" />
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                {globalProgress}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avance Global</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Secondary stats row ──────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="glass-card">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{filteredInstallations.filter((i) => i.installed).length}</p>
                <p className="text-xs text-muted-foreground">Equipos Inst.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hidden md:block">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {new Set(filteredProjects.map((p) => p.companyId)).size}
                </p>
                <p className="text-xs text-muted-foreground">Clientes Visibles</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Avance por Proyecto ──────────────────────── */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              Avance por Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {projectProgressData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay proyectos que coincidan con los filtros
              </p>
            ) : (
              <div className="w-full" style={{ height: Math.max(120, projectProgressData.length * 45) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={projectProgressData}
                    layout="vertical"
                    margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
                    barCategoryGap={projectProgressData.length <= 2 ? "40%" : "20%"}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar
                      dataKey="avance"
                      fill="url(#barGradient)"
                      radius={[0, 6, 6, 0]}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      maxBarSize={40}
                      cursor="pointer"
                      onClick={(data) => {
                        const proj = filteredProjects.find(p => p.name === data.fullName);
                        if (proj) setGlobalProjectFilter(proj.id);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Equipamiento Overview ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie chart */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-violet-500" />
                Equipamiento General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {filteredInstallations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin equipos instalados en estos proyectos
                </p>
              ) : (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={equipmentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        animationDuration={1000}
                        animationEasing="ease-out"
                        strokeWidth={0}
                      >
                        {equipmentPieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            cursor="pointer"
                            onClick={() => setStatusFilter(entry.filterVal as "installed" | "pending")}
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} items`,
                          name,
                        ]}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="relative -mt-[152px] flex flex-col items-center justify-center pointer-events-none select-none" style={{ height: 0 }}>
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                      {filteredInstallations.length > 0
                        ? Math.round(
                            (filteredInstallations.filter((i) => i.installed).length /
                              filteredInstallations.length) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment breakdown bar chart - REDESIGNED */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-violet-500" />
                Avance por Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {equipmentData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin datos de equipamiento
                </p>
              ) : (
                <div className="w-full" style={{ height: Math.max(220, equipmentData.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={equipmentData}
                      layout="vertical"
                      margin={{ top: 4, right: 30, left: 0, bottom: 4 }}
                      barCategoryGap="25%"
                    >
                      <defs>
                        <linearGradient id="eqPctGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="hsl(var(--border))"
                        opacity={0.4}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<CustomEqPctTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                      <Bar
                        dataKey="pct"
                        fill="url(#eqPctGrad)"
                        radius={[0, 4, 4, 0]}
                        animationDuration={1000}
                        maxBarSize={24}
                        cursor="pointer"
                        onClick={(data) => setEquipmentFilter(data.idRef)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Vehicle Progress Table ──────────────────── */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-primary">
                <Car className="w-5 h-5 text-accent" />
                <CardTitle className="text-[14px]">Detalle por Vehículo</CardTitle>
              </div>
              
              {/* Active Sub-Filters Badges */}
              {(equipmentFilter || statusFilter !== "all" || selectedVehicleId) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filters selectivos:
                  </span>
                  
                  {selectedVehicleId && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] px-2 py-0 gap-1 rounded-full cursor-pointer" onClick={() => setSelectedVehicleId(null)}>
                      {(()=>{
                        const vRef = vehicles.find(v => v.id === selectedVehicleId);
                        return vRef ? `Veh: ${vRef.plate || vRef.vin.slice(-6)}` : 'Vehículo seleccionado';
                      })()}
                      <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                    </Badge>
                  )}

                  {equipmentFilter && (
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] px-2 py-0 gap-1 rounded-full cursor-pointer" onClick={() => setEquipmentFilter(null)}>
                      Eq: {equipmentFilter} <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                    </Badge>
                  )}
                  
                  {statusFilter !== "all" && (
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] px-2 py-0 gap-1 rounded-full cursor-pointer" onClick={() => setStatusFilter("all")}>
                      Estado: {statusFilter === "installed" ? "Instalado" : "Pendiente"} <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                    </Badge>
                  )}
                  
                  <button 
                    onClick={() => {
                      setEquipmentFilter(null);
                      setStatusFilter("all");
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1 underline underline-offset-2"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tableVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay vehículos en la selección actual
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">
                        Cliente
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">
                        Proyecto
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">
                        VIN / Placa
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[140px]">
                        Progreso
                      </th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs">
                        Estado
                      </th>
                      <th className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs">
                        Fotos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableVehicles.map((v, idx) => {
                      const isSelected = selectedVehicleId === v.id;
                      return (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedVehicleId(prev => prev === v.id ? null : v.id)}
                        className={`border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer ${
                          isSelected ? "bg-indigo-500/10 shadow-[inset_3px_0_0_0_rgba(99,102,241,1)]" : idx % 2 === 0 ? "" : "bg-muted/5"
                        }`}
                      >
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                          {v.companyName.length > 20 ? v.companyName.substring(0, 20) + "..." : v.companyName}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                          {v.projectName.length > 20 ? v.projectName.substring(0, 20) + "..." : v.projectName}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-xs">
                            {v.plate ? `${v.vin.slice(-6)} / ${v.plate}` : v.vin.slice(-8)}
                          </p>
                          <p className="text-[10px] text-muted-foreground sm:hidden">
                            {v.companyName} - {v.projectName}
                          </p>
                          <p className="text-[10px] text-muted-foreground hidden sm:block md:hidden">
                            {v.projectName}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={v.progress} className="flex-1" />
                            <span className="text-xs font-semibold w-9 text-right tabular-nums">
                              {v.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {v.delivered ? (
                            <Badge variant="default" className="bg-emerald-500/90 hover:bg-emerald-500 text-[10px] px-2 min-w-[76px]">
                              Entregado
                            </Badge>
                          ) : v.progress === 100 ? (
                            <Badge variant="default" className="bg-indigo-500/90 hover:bg-indigo-500 text-[10px] px-2 min-w-[76px]">
                              Listo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-2 min-w-[76px]">
                              En proceso
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {v.photos.length > 0 ? (
                            <div 
                              className="flex items-center justify-center gap-2 flex-wrap max-w-[120px] mx-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {v.photos.length === 1 ? (
                                <a 
                                  href={v.photos[0]} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center justify-center gap-1"
                                >
                                  Ver Foto
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                v.photos.map((photo, pIdx) => (
                                  <a 
                                    key={pIdx}
                                    href={photo} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1"
                                    title={`Foto ${pIdx + 1}`}
                                  >
                                    F{pIdx + 1}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
