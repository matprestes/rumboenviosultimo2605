
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          apellido: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_general_enum"] | null
          id: string
          latitud: number | null
          longitud: number | null
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          apellido?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_id?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          apellido?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa_id?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string | null
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_general_enum"] | null
          id: string
          latitud: number | null
          longitud: number | null
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      envios: {
        Row: {
          cliente_id: string | null
          cliente_temporal_nombre: string | null
          cliente_temporal_telefono: string | null
          created_at: string | null
          direccion_destino: string
          direccion_origen: string
          empresa_destino_id: string | null
          empresa_origen_id: string | null
          estado: Database["public"]["Enums"]["estado_envio_enum"] | null
          fecha_estimada_entrega: string | null
          id: string
          latitud_destino: number | null
          latitud_origen: number | null
          longitud_destino: number | null
          longitud_origen: number | null
          notas_conductor: string | null
          peso_kg: number | null
          precio: number
          repartidor_asignado_id: string | null
          tipo_paquete_id: string | null
          tipo_servicio_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_temporal_nombre?: string | null
          cliente_temporal_telefono?: string | null
          created_at?: string | null
          direccion_destino: string
          direccion_origen: string
          empresa_destino_id?: string | null
          empresa_origen_id?: string | null
          estado?: Database["public"]["Enums"]["estado_envio_enum"] | null
          fecha_estimada_entrega?: string | null
          id?: string
          latitud_destino?: number | null
          latitud_origen?: number | null
          longitud_destino?: number | null
          longitud_origen?: number | null
          notas_conductor?: string | null
          peso_kg?: number | null
          precio: number
          repartidor_asignado_id?: string | null
          tipo_paquete_id?: string | null
          tipo_servicio_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          cliente_temporal_nombre?: string | null
          cliente_temporal_telefono?: string | null
          created_at?: string | null
          direccion_destino?: string
          direccion_origen?: string
          empresa_destino_id?: string | null
          empresa_origen_id?: string | null
          estado?: Database["public"]["Enums"]["estado_envio_enum"] | null
          fecha_estimada_entrega?: string | null
          id?: string
          latitud_destino?: number | null
          latitud_origen?: number | null
          longitud_destino?: number | null
          longitud_origen?: number | null
          notas_conductor?: string | null
          peso_kg?: number | null
          precio?: number
          repartidor_asignado_id?: string | null
          tipo_paquete_id?: string | null
          tipo_servicio_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_empresa_destino_id_fkey"
            columns: ["empresa_destino_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_empresa_origen_id_fkey"
            columns: ["empresa_origen_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_repartidor_asignado_id_fkey"
            columns: ["repartidor_asignado_id"]
            isOneToOne: false
            referencedRelation: "repartidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_tipo_paquete_id_fkey"
            columns: ["tipo_paquete_id"]
            isOneToOne: false
            referencedRelation: "tipos_paquete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_tipo_servicio_id_fkey"
            columns: ["tipo_servicio_id"]
            isOneToOne: false
            referencedRelation: "tipos_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas_reparto: {
        Row: {
          created_at: string | null
          envio_id: string
          estado_parada: Database["public"]["Enums"]["estado_envio_enum"] | null
          hora_estimada_llegada: string | null
          hora_real_llegada: string | null
          id: string
          notas_parada: string | null
          orden_visita: number | null
          reparto_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          envio_id: string
          estado_parada?:
            | Database["public"]["Enums"]["estado_envio_enum"]
            | null
          hora_estimada_llegada?: string | null
          hora_real_llegada?: string | null
          id?: string
          notas_parada?: string | null
          orden_visita?: number | null
          reparto_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          envio_id?: string
          estado_parada?:
            | Database["public"]["Enums"]["estado_envio_enum"]
            | null
          hora_estimada_llegada?: string | null
          hora_real_llegada?: string | null
          id?: string
          notas_parada?: string | null
          orden_visita?: number | null
          reparto_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paradas_reparto_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_reparto_reparto_id_fkey"
            columns: ["reparto_id"]
            isOneToOne: false
            referencedRelation: "repartos"
            referencedColumns: ["id"]
          },
        ]
      }
      repartidores: {
        Row: {
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_general_enum"] | null
          id: string
          nombre: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          id?: string
          nombre: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          id?: string
          nombre?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      repartos: {
        Row: {
          created_at: string | null
          empresa_asociada_id: string | null
          estado: Database["public"]["Enums"]["estado_general_enum"] | null
          fecha_reparto: string
          id: string
          notas: string | null
          repartidor_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_asociada_id?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          fecha_reparto?: string
          id?: string
          notas?: string | null
          repartidor_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_asociada_id?: string | null
          estado?: Database["public"]["Enums"]["estado_general_enum"] | null
          fecha_reparto?: string
          id?: string
          notas?: string | null
          repartidor_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repartos_empresa_asociada_id_fkey"
            columns: ["empresa_asociada_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartos_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "repartidores"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_distancia_calculadora: {
        Row: {
          created_at: string | null
          distancia_max_km: number
          distancia_min_km: number
          id: string
          precio_base: number | null
          precio_por_km: number
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio_calculadora_enum"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          distancia_max_km: number
          distancia_min_km: number
          id?: string
          precio_base?: number | null
          precio_por_km: number
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio_calculadora_enum"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          distancia_max_km?: number
          distancia_min_km?: number
          id?: string
          precio_base?: number | null
          precio_por_km?: number
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio_calculadora_enum"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tipos_paquete: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tipos_servicio: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          precio_base: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          precio_base?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          precio_base?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_envio_enum:
        | "pendiente_asignacion"
        | "asignado"
        | "en_camino"
        | "entregado"
        | "no_entregado"
        | "cancelado"
      estado_envio_opciones:
        | "pendiente"
        | "asignado"
        | "en_camino"
        | "entregado"
        | "cancelado"
        | "fallido"
      estado_general_enum: "activo" | "inactivo" | "pendiente"
      estado_opciones: "activo" | "inactivo"
      estado_parada_opciones:
        | "pendiente"
        | "visitada_exitosa"
        | "visitada_fallida"
      estado_repartidor_opciones: "activo" | "inactivo" | "en_descanso"
      estado_reparto_opciones:
        | "planificado"
        | "en_curso"
        | "completado"
        | "cancelado"
      tipo_servicio_calculadora_enum: "express" | "lowcost"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_envio_enum: [
        "pendiente_asignacion",
        "asignado",
        "en_camino",
        "entregado",
        "no_entregado",
        "cancelado",
      ],
      estado_envio_opciones: [
        "pendiente",
        "asignado",
        "en_camino",
        "entregado",
        "cancelado",
        "fallido",
      ],
      estado_general_enum: ["activo", "inactivo", "pendiente"],
      estado_opciones: ["activo", "inactivo"],
      estado_parada_opciones: [
        "pendiente",
        "visitada_exitosa",
        "visitada_fallida",
      ],
      estado_repartidor_opciones: ["activo", "inactivo", "en_descanso"],
      estado_reparto_opciones: [
        "planificado",
        "en_curso",
        "completado",
        "cancelado",
      ],
      tipo_servicio_calculadora_enum: ["express", "lowcost"],
    },
  },
} as const
