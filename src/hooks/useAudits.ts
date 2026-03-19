import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuditRecord {
  id: string;
  vehicle_id: string;
  equipment_id: string;
  is_correct: boolean;
  observation: string | null;
  created_at: string;
}

export interface VehicleAuditStatus {
  vehicleId: string;
  hasAudit: boolean;
  hasObservations: boolean;
  observations: { equipmentId: string; observation: string }[];
}

export function useAudits() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAudits = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudits(data || []);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const getVehicleAuditStatus = useCallback((vehicleId: string): VehicleAuditStatus => {
    const vehicleAudits = audits.filter(a => a.vehicle_id === vehicleId);
    
    if (vehicleAudits.length === 0) {
      return {
        vehicleId,
        hasAudit: false,
        hasObservations: false,
        observations: [],
      };
    }

    const observations = vehicleAudits
      .filter(a => !a.is_correct && a.observation)
      .map(a => ({
        equipmentId: a.equipment_id,
        observation: a.observation || '',
      }));

    return {
      vehicleId,
      hasAudit: true,
      hasObservations: observations.length > 0,
      observations,
    };
  }, [audits]);

  const getEquipmentAuditObservation = useCallback((vehicleId: string, equipmentId: string): string | null => {
    const audit = audits.find(
      a => a.vehicle_id === vehicleId && a.equipment_id === equipmentId && !a.is_correct
    );
    return audit?.observation || null;
  }, [audits]);

  return {
    audits,
    isLoading,
    fetchAudits,
    getVehicleAuditStatus,
    getEquipmentAuditObservation,
  };
}
