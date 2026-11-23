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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_locations: {
        Row: {
          accuracy: number
          admin_user_id: string
          battery_level: number | null
          id: string
          latitude: number
          longitude: number
          timestamp: string
        }
        Insert: {
          accuracy: number
          admin_user_id: string
          battery_level?: number | null
          id?: string
          latitude: number
          longitude: number
          timestamp?: string
        }
        Update: {
          accuracy?: number
          admin_user_id?: string
          battery_level?: number | null
          id?: string
          latitude?: number
          longitude?: number
          timestamp?: string
        }
        Relationships: []
      }
      chaos_settings: {
        Row: {
          user_id: string
          logout_loop: boolean
          flicker_page: boolean
          virus_load: boolean
          slow_mode: boolean
          clear_logs: boolean
          crazy_bugs: boolean
          not_responder: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          logout_loop?: boolean
          flicker_page?: boolean
          virus_load?: boolean
          slow_mode?: boolean
          clear_logs?: boolean
          crazy_bugs?: boolean
          not_responder?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          logout_loop?: boolean
          flicker_page?: boolean
          virus_load?: boolean
          slow_mode?: boolean
          clear_logs?: boolean
          crazy_bugs?: boolean
          not_responder?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaos_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      association_bills: {
        Row: {
          association_user_id: string
          bill_date: string
          bill_no: string
          created_at: string
          field_officer_employee_id: string
          id: string
          sealing_tag_number: string
          items: Json
          purchaser_name: string | null
          rejection_reason: string | null
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reservoir_id: string
          status: string
          supplier_address: string | null
          supplier_email: string | null
          supplier_name: string
          supplier_tel: string | null
          total: number
          box_number: string | null
        }
        Insert: {
          association_user_id: string
          bill_date: string
          bill_no: string
          created_at?: string
          field_officer_employee_id: string
          id?: string
          sealing_tag_number: string
          items?: Json
          purchaser_name?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reservoir_id: string
          status?: string
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_name: string
          supplier_tel?: string | null
          total: number
          box_number?: string | null
        }
        Update: {
          association_user_id?: string
          bill_date?: string
          bill_no?: string
          created_at?: string
          field_officer_employee_id?: string
          id?: string
          sealing_tag_number?: string
          items?: Json
          purchaser_name?: string | null
          rejection_reason?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reservoir_id?: string
          status?: string
          supplier_address?: string | null
          supplier_email?: string | null
          supplier_name?: string
          supplier_tel?: string | null
          total?: number
          box_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "association_bills_field_officer_employee_id_fkey"
            columns: ["field_officer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "association_bills_reservoir_id_fkey"
            columns: ["reservoir_id"]
            isOneToOne: false
            referencedRelation: "reservoirs"
            referencedColumns: ["id"]
          },
        ]
      }
      data_entries: {
        Row: {
          accuracy: number
          created_at: string
          dissolved_oxygen: number
          employee_id: string
          flow_rate: number
          id: string
          latitude: number
          longitude: number
          notes: string | null
          ph: number
          recorded_at: string
          reservoir_id: string
          temperature: number
          turbidity: number
          water_level: number
        }
        Insert: {
          accuracy: number
          created_at?: string
          dissolved_oxygen: number
          employee_id: string
          flow_rate: number
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          ph: number
          recorded_at?: string
          reservoir_id: string
          temperature: number
          turbidity: number
          water_level: number
        }
        Update: {
          accuracy?: number
          created_at?: string
          dissolved_oxygen?: number
          employee_id?: string
          flow_rate?: number
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          ph?: number
          recorded_at?: string
          reservoir_id?: string
          temperature?: number
          turbidity?: number
          water_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_entries_reservoir_id_fkey"
            columns: ["reservoir_id"]
            isOneToOne: false
            referencedRelation: "reservoirs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_locations: {
        Row: {
          accuracy: number
          battery_level: number | null
          employee_id: string
          id: string
          latitude: number
          longitude: number
          timestamp: string
        }
        Insert: {
          accuracy: number
          battery_level?: number | null
          employee_id: string
          id?: string
          latitude: number
          longitude: number
          timestamp?: string
        }
        Update: {
          accuracy?: number
          battery_level?: number | null
          employee_id?: string
          id?: string
          latitude?: number
          longitude?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          assigned_reservoirs: string[] | null
          assigned_locations: string[] | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_reservoirs?: string[] | null
          assigned_locations?: string[] | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_reservoirs?: string[] | null
          assigned_locations?: string[] | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservoirs: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          geofence_radius: number
          id: string
          latitude: number
          location_id: string | null
          longitude: number
          name: string
          status: Database["public"]["Enums"]["reservoir_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          geofence_radius?: number
          id?: string
          latitude: number
          location_id?: string | null
          longitude: number
          name: string
          status?: Database["public"]["Enums"]["reservoir_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          geofence_radius?: number
          id?: string
          latitude?: number
          location_id?: string | null
          longitude?: number
          name?: string
          status?: Database["public"]["Enums"]["reservoir_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservoirs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservoir_pl_stockings: {
        Row: {
          id: string
          reservoir_id: string
          stocked_date: string
          pl_quantity: number
          batch_reference: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reservoir_id: string
          stocked_date: string
          pl_quantity: number
          batch_reference?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reservoir_id?: string
          stocked_date?: string
          pl_quantity?: number
          batch_reference?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservoir_pl_stockings_reservoir_id_fkey"
            columns: ["reservoir_id"]
            isOneToOne: false
            referencedRelation: "reservoirs"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_dispatches: {
        Row: {
          id: string
          prefix: string
          start_number: number
          end_number: number
          pad_length: number
          sent_date: string
          reservoir_id: string | null
          location_id: string | null
          field_officer_employee_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prefix?: string
          start_number: number
          end_number: number
          pad_length?: number
          sent_date: string
          reservoir_id?: string | null
          location_id?: string | null
          field_officer_employee_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prefix?: string
          start_number?: number
          end_number?: number
          pad_length?: number
          sent_date?: string
          reservoir_id?: string | null
          location_id?: string | null
          field_officer_employee_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_dispatches_reservoir_id_fkey"
            columns: ["reservoir_id"]
            isOneToOne: false
            referencedRelation: "reservoirs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_dispatches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_dispatches_field_officer_employee_id_fkey"
            columns: ["field_officer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sheet_sync_configs: {
        Row: {
          id: string
          config_key: string
          sheet_url: string
          apps_script_url: string
          auto_sync_enabled: boolean
          last_synced_at: string | null
          last_synced_count: number | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          config_key?: string
          sheet_url?: string
          apps_script_url?: string
          auto_sync_enabled?: boolean
          last_synced_at?: string | null
          last_synced_count?: number | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          config_key?: string
          sheet_url?: string
          apps_script_url?: string
          auto_sync_enabled?: boolean
          last_synced_at?: string | null
          last_synced_count?: number | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ice_details: {
        Row: {
          id: string
          entry_date: string
          boxes: number
          ice_cubes: number
          unit_rate: number
          bill_no: string
          bill_amount: number
          payment_ref: string | null
          paid_amount: number
          paid_date: string | null
          driver_name: string | null
          location_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entry_date: string
          boxes?: number
          ice_cubes?: number
          unit_rate?: number
          bill_no?: string
          bill_amount?: number
          payment_ref?: string | null
          paid_amount?: number
          paid_date?: string | null
          driver_name?: string | null
          location_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entry_date?: string
          boxes?: number
          ice_cubes?: number
          unit_rate?: number
          bill_no?: string
          bill_amount?: number
          payment_ref?: string | null
          paid_amount?: number
          paid_date?: string | null
          driver_name?: string | null
          location_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ice_details_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_employee_id: { Args: { _user_id: string }; Returns: string }
      haversine_meters: {
        Args: { lat1: number; lon1: number; lat2: number; lon2: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin_within_reservoir_geofence: {
        Args: { _reservoir_id: string }
        Returns: boolean
      }
      super_admin_proximity_to_reservoir: {
        Args: { _reservoir_id: string }
        Returns: {
          is_within: boolean
          distance_m: number | null
          last_seen: string | null
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "employee" | "fisheries_association"
      reservoir_status: "active" | "maintenance" | "inactive"
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
      app_role: ["super_admin", "employee", "fisheries_association"],
      reservoir_status: ["active", "maintenance", "inactive"],
    },
  },
} as const
