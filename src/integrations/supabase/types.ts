export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auditorias: {
        Row: {
          auditor_id: string | null
          created_at: string
          equipment_id: string
          id: string
          is_correct: boolean
          observation: string | null
          vehicle_id: string
        }
        Insert: {
          auditor_id?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          is_correct?: boolean
          observation?: string | null
          vehicle_id: string
        }
        Update: {
          auditor_id?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          is_correct?: boolean
          observation?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditorias_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          ruc: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          ruc?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          ruc?: string | null
        }
        Relationships: []
      }
      equipamiento: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      instalaciones: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          installed: boolean
          installed_at: string | null
          notes: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          installed?: boolean
          installed_at?: string | null
          notes?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          installed?: boolean
          installed_at?: string | null
          notes?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instalaciones_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          company_id: string
          created_at: string
          equipment: string[]
          id: string
          name: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          equipment?: string[]
          id?: string
          name: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          equipment?: string[]
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_proyectos_empresa"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          apellido: string
          created_at: string
          email: string
          id: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apellido: string
          created_at?: string
          email: string
          id?: string
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apellido?: string
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          check_items: Json
          cochera: string | null
          color: string
          created_at: string
          dealer_sheet_photo: string | null
          delivery_date: string
          delivery_person_dni: string | null
          delivery_person_name: string | null
          delivery_person_position: string | null
          delivery_signature: string | null
          delivery_time: string
          id: string
          km_entry: string
          model: string
          observations: string | null
          foto_1: string | null
          foto_2: string | null
          foto_3: string | null
          foto_4: string | null
          plate: string | null
          project_id: string
          status: string
          vin: string
        }
        Insert: {
          check_items?: Json
          cochera?: string | null
          color: string
          created_at?: string
          dealer_sheet_photo?: string | null
          delivery_date: string
          delivery_person_dni?: string | null
          delivery_person_name?: string | null
          delivery_person_position?: string | null
          delivery_signature?: string | null
          delivery_time: string
          id?: string
          km_entry: string
          model: string
          observations?: string | null
          foto_1?: string | null
          foto_2?: string | null
          foto_3?: string | null
          foto_4?: string | null
          plate?: string | null
          project_id: string
          status?: string
          vin: string
        }
        Update: {
          check_items?: Json
          cochera?: string | null
          color?: string
          created_at?: string
          dealer_sheet_photo?: string | null
          delivery_date?: string
          delivery_person_dni?: string | null
          delivery_person_name?: string | null
          delivery_person_position?: string | null
          delivery_signature?: string | null
          delivery_time?: string
          id?: string
          km_entry?: string
          model?: string
          observations?: string | null
          foto_1?: string | null
          foto_2?: string | null
          foto_3?: string | null
          foto_4?: string | null
          plate?: string | null
          project_id?: string
          status?: string
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos_entregados: {
        Row: {
          check_items: Json
          created_at: string
          delivery_date: string
          delivery_time: string
          id: string
          km_exit: string
          notes: string | null
          foto_1: string | null
          foto_2: string | null
          foto_3: string | null
          foto_4: string | null
          project_id: string
          receiver_name: string
          receiver_position: string
          receiver_signature: string
          vehicle_id: string
        }
        Insert: {
          check_items?: Json
          created_at?: string
          delivery_date: string
          delivery_time: string
          id?: string
          km_exit: string
          notes?: string | null
          foto_1?: string | null
          foto_2?: string | null
          foto_3?: string | null
          foto_4?: string | null
          project_id: string
          receiver_name: string
          receiver_position: string
          receiver_signature: string
          vehicle_id: string
        }
        Update: {
          check_items?: Json
          created_at?: string
          delivery_date?: string
          delivery_time?: string
          id?: string
          km_exit?: string
          notes?: string | null
          foto_1?: string | null
          foto_2?: string | null
          foto_3?: string | null
          foto_4?: string | null
          project_id?: string
          receiver_name?: string
          receiver_position?: string
          receiver_signature?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_entregados_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_entregados_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_users: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "registrador" | "tecnico" | "auditor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "registrador", "tecnico", "auditor"],
    },
  },
} as const
