import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipmentItemDB {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

export function useEquipmentDB() {
  const [equipment, setEquipment] = useState<EquipmentItemDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEquipment = useCallback(async () => {
    const { data, error } = await supabase
      .from('equipamiento')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Error al cargar equipamiento');
      return;
    }
    setEquipment(data || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchEquipment();
      setIsLoading(false);
    };
    load();
  }, [fetchEquipment]);

  const addEquipment = async (name: string, category: string) => {
    const { data, error } = await supabase
      .from('equipamiento')
      .insert({ name, category })
      .select()
      .single();

    if (error) {
      console.error('Error adding equipment:', error);
      toast.error('Error al guardar equipamiento');
      throw error;
    }

    setEquipment(prev => [...prev, data].sort((a, b) => 
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    ));
    toast.success('Equipamiento agregado correctamente');
    return data;
  };

  const deleteEquipment = async (id: string) => {
    const { error } = await supabase
      .from('equipamiento')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Error al eliminar equipamiento');
      throw error;
    }

    setEquipment(prev => prev.filter(e => e.id !== id));
    toast.success('Equipamiento eliminado');
  };

  const categories = [...new Set(equipment.map(e => e.category))].sort();

  return {
    equipment,
    categories,
    isLoading,
    addEquipment,
    deleteEquipment,
    refetchEquipment: fetchEquipment,
  };
}
