import { Settings, Car, Wrench, Users, Send, MoreHorizontal, ClipboardCheck } from "lucide-react";
import { TabType } from "@/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const allTabs: { id: TabType; label: string; icon: React.ElementType; roles: ('admin' | 'registrador' | 'tecnico' | 'auditor')[] }[] = [
  { id: "admin", label: "Admin", icon: Settings, roles: ['admin'] },
  { id: "users", label: "Usuarios", icon: Users, roles: ['admin'] },
  { id: "register", label: "Registro", icon: Car, roles: ['admin', 'registrador', 'tecnico', 'auditor'] },
  { id: "equipment", label: "Equipamiento", icon: Wrench, roles: ['admin', 'tecnico', 'auditor'] },
  { id: "delivery", label: "Entrega", icon: Send, roles: ['admin', 'registrador', 'tecnico', 'auditor'] },
  { id: "extra", label: "Extra", icon: MoreHorizontal, roles: ['admin', 'registrador', 'tecnico', 'auditor'] },
  { id: "audit", label: "Auditoría", icon: ClipboardCheck, roles: ['admin', 'auditor'] },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { userRole } = useAuth();

  // Filter tabs based on user role
  const visibleTabs = allTabs.filter(tab => {
    if (!userRole) return false;
    return tab.roles.includes(userRole);
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe">
      <div className="safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200",
                  isActive 
                    ? "text-accent" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                    isActive && "bg-accent/10 animate-scale-in"
                  )}
                >
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-transform",
                      isActive && "scale-110"
                    )} 
                  />
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all",
                  isActive && "font-semibold"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        
      </div>
    </nav>
  );
}
