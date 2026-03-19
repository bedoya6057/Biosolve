import { useEffect, useState } from "react";
import { offlineStorage } from "@/services/offlineStorage";

export type OfflineCounts = {
  vehiculos: number;
  instalaciones: number;
  vehiculosEntregados: number;
  pendingOperations: number;
};

const DEFAULT_COUNTS: OfflineCounts = {
  vehiculos: 0,
  instalaciones: 0,
  vehiculosEntregados: 0,
  pendingOperations: 0,
};

export function useOfflineCounts(pollMs: number = 2000) {
  const [counts, setCounts] = useState<OfflineCounts>(DEFAULT_COUNTS);

  useEffect(() => {
    let alive = true;

    const read = async () => {
      try {
        const [data, ops] = await Promise.all([
          offlineStorage.getOfflineData(),
          offlineStorage.getPendingOperations(),
        ]);

        if (!alive) return;

        setCounts({
          vehiculos: data?.vehiculos?.length ?? 0,
          instalaciones: data?.instalaciones?.length ?? 0,
          vehiculosEntregados: data?.vehiculosEntregados?.length ?? 0,
          pendingOperations: ops?.length ?? 0,
        });
      } catch {
        // Silent: this hook is informational only
      }
    };

    read();
    const id = window.setInterval(read, pollMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return counts;
}
