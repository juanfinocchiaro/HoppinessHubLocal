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
      afip_config: {
        Row: {
          branch_id: string
          certificado_crt: string | null
          clave_privada_enc: string | null
          created_at: string
          csr_pem: string | null
          cuit: string | null
          direccion_fiscal: string | null
          estado_certificado: string
          estado_conexion: string
          id: string
          inicio_actividades: string | null
          is_production: boolean
          punto_venta: number | null
          razon_social: string | null
          reglas_facturacion: Json
          ultima_verificacion: string | null
          ultimo_error: string | null
          ultimo_nro_factura_a: number | null
          ultimo_nro_factura_b: number | null
          ultimo_nro_factura_c: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          certificado_crt?: string | null
          clave_privada_enc?: string | null
          created_at?: string
          csr_pem?: string | null
          cuit?: string | null
          direccion_fiscal?: string | null
          estado_certificado?: string
          estado_conexion?: string
          id?: string
          inicio_actividades?: string | null
          is_production?: boolean
          punto_venta?: number | null
          razon_social?: string | null
          reglas_facturacion?: Json
          ultima_verificacion?: string | null
          ultimo_error?: string | null
          ultimo_nro_factura_a?: number | null
          ultimo_nro_factura_b?: number | null
          ultimo_nro_factura_c?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          certificado_crt?: string | null
          clave_privada_enc?: string | null
          created_at?: string
          csr_pem?: string | null
          cuit?: string | null
          direccion_fiscal?: string | null
          estado_certificado?: string
          estado_conexion?: string
          id?: string
          inicio_actividades?: string | null
          is_production?: boolean
          punto_venta?: number | null
          razon_social?: string | null
          reglas_facturacion?: Json
          ultima_verificacion?: string | null
          ultimo_error?: string | null
          ultimo_nro_factura_a?: number | null
          ultimo_nro_factura_b?: number | null
          ultimo_nro_factura_c?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "afip_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afip_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      afip_errores_log: {
        Row: {
          branch_id: string
          codigo_afip: string | null
          created_at: string
          id: string
          mensaje: string | null
          request_data: Json | null
          response_data: Json | null
          tipo_error: string
        }
        Insert: {
          branch_id: string
          codigo_afip?: string | null
          created_at?: string
          id?: string
          mensaje?: string | null
          request_data?: Json | null
          response_data?: Json | null
          tipo_error: string
        }
        Update: {
          branch_id?: string
          codigo_afip?: string | null
          created_at?: string
          id?: string
          mensaje?: string | null
          request_data?: Json | null
          response_data?: Json | null
          tipo_error?: string
        }
        Relationships: [
          {
            foreignKeyName: "afip_errores_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afip_errores_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      branch_closure_config: {
        Row: {
          branch_id: string
          config_id: string
          habilitado: boolean | null
          id: string
        }
        Insert: {
          branch_id: string
          config_id: string
          habilitado?: boolean | null
          id?: string
        }
        Update: {
          branch_id?: string
          config_id?: string
          habilitado?: boolean | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_closure_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_closure_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_closure_config_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "brand_closure_config"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_delivery_config: {
        Row: {
          branch_id: string
          created_at: string | null
          default_radius_km: number
          delivery_enabled: boolean
          id: string
          radius_override_by: string | null
          radius_override_km: number | null
          radius_override_until: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          default_radius_km?: number
          delivery_enabled?: boolean
          id?: string
          radius_override_by?: string | null
          radius_override_km?: number | null
          radius_override_until?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          default_radius_km?: number
          delivery_enabled?: boolean
          id?: string
          radius_override_by?: string | null
          radius_override_km?: number | null
          radius_override_until?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_delivery_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_delivery_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_delivery_neighborhoods: {
        Row: {
          block_reason: string | null
          branch_id: string
          created_at: string | null
          decided_by: string
          distance_km: number | null
          id: string
          neighborhood_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          block_reason?: string | null
          branch_id: string
          created_at?: string | null
          decided_by?: string
          distance_km?: number | null
          id?: string
          neighborhood_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          block_reason?: string | null
          branch_id?: string
          created_at?: string | null
          decided_by?: string
          distance_km?: number | null
          id?: string
          neighborhood_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_delivery_neighborhoods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_delivery_neighborhoods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_delivery_neighborhoods_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "city_neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inspections: {
        Row: {
          action_items: Json | null
          branch_id: string
          completed_at: string | null
          created_at: string
          critical_findings: string | null
          general_notes: string | null
          id: string
          inspection_type: string
          inspector_id: string
          present_manager_id: string | null
          score_total: number | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          branch_id: string
          completed_at?: string | null
          created_at?: string
          critical_findings?: string | null
          general_notes?: string | null
          id?: string
          inspection_type: string
          inspector_id: string
          present_manager_id?: string | null
          score_total?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          critical_findings?: string | null
          general_notes?: string | null
          id?: string
          inspection_type?: string
          inspector_id?: string
          present_manager_id?: string | null
          score_total?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inspections_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inspections_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_item_availability: {
        Row: {
          available: boolean
          available_salon: boolean
          available_webapp: boolean
          branch_id: string
          created_at: string
          id: string
          item_carta_id: string
          out_of_stock: boolean
          updated_at: string
        }
        Insert: {
          available?: boolean
          available_salon?: boolean
          available_webapp?: boolean
          branch_id: string
          created_at?: string
          id?: string
          item_carta_id: string
          out_of_stock?: boolean
          updated_at?: string
        }
        Update: {
          available?: boolean
          available_salon?: boolean
          available_webapp?: boolean
          branch_id?: string
          created_at?: string
          id?: string
          item_carta_id?: string
          out_of_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_item_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_item_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_item_availability_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_item_availability_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_printers: {
        Row: {
          branch_id: string
          configured_from_network: string | null
          connection_type: string
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          name: string
          paper_width: number
          port: number
        }
        Insert: {
          branch_id: string
          configured_from_network?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          name: string
          paper_width?: number
          port?: number
        }
        Update: {
          branch_id?: string
          configured_from_network?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          name?: string
          paper_width?: number
          port?: number
        }
        Relationships: [
          {
            foreignKeyName: "branch_printers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_printers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_shifts: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          admin_force_channels: Json | null
          admin_force_message: string | null
          admin_force_state: string | null
          city: string
          clock_code: string | null
          clock_window_after_min: number
          clock_window_before_min: number
          closing_time: string | null
          cover_image_url: string | null
          created_at: string
          email: string | null
          enforce_labor_law: boolean
          expense_pin_threshold: number | null
          google_place_id: string | null
          id: string
          is_active: boolean
          is_open: boolean | null
          latitude: number | null
          local_open_state: boolean | null
          longitude: number | null
          name: string
          opening_time: string | null
          phone: string | null
          public_hours: Json | null
          public_status: string | null
          shifts_morning_enabled: boolean | null
          shifts_overnight_enabled: boolean | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          address: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          city: string
          clock_code?: string | null
          clock_window_after_min?: number
          clock_window_before_min?: number
          closing_time?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          enforce_labor_law?: boolean
          expense_pin_threshold?: number | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          name: string
          opening_time?: string | null
          phone?: string | null
          public_hours?: Json | null
          public_status?: string | null
          shifts_morning_enabled?: boolean | null
          shifts_overnight_enabled?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          city?: string
          clock_code?: string | null
          clock_window_after_min?: number
          clock_window_before_min?: number
          closing_time?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string | null
          enforce_labor_law?: boolean
          expense_pin_threshold?: number | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          name?: string
          opening_time?: string | null
          phone?: string | null
          public_hours?: Json | null
          public_status?: string | null
          shifts_morning_enabled?: boolean | null
          shifts_overnight_enabled?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brand_closure_config: {
        Row: {
          categoria_padre: string | null
          clave: string
          created_at: string | null
          etiqueta: string
          id: string
          is_active: boolean | null
          orden: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          categoria_padre?: string | null
          clave: string
          created_at?: string | null
          etiqueta: string
          id?: string
          is_active?: boolean | null
          orden?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          categoria_padre?: string | null
          clave?: string
          created_at?: string | null
          etiqueta?: string
          id?: string
          is_active?: boolean | null
          orden?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      brand_sidebar_order: {
        Row: {
          id: string
          section_id: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          section_id: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          section_id?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cadetes: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          nombre: string
          pedidos_hoy: number | null
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          nombre: string
          pedidos_hoy?: number | null
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          nombre?: string
          pedidos_hoy?: number | null
          telefono?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cadetes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadetes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      canales_venta: {
        Row: {
          ajuste_valor: number | null
          codigo: string
          created_at: string | null
          es_base: boolean | null
          id: string
          is_active: boolean | null
          nombre: string
          orden: number | null
          tipo_ajuste: string
          updated_at: string | null
        }
        Insert: {
          ajuste_valor?: number | null
          codigo: string
          created_at?: string | null
          es_base?: boolean | null
          id?: string
          is_active?: boolean | null
          nombre: string
          orden?: number | null
          tipo_ajuste?: string
          updated_at?: string | null
        }
        Update: {
          ajuste_valor?: number | null
          codigo?: string
          created_at?: string | null
          es_base?: boolean | null
          id?: string
          is_active?: boolean | null
          nombre?: string
          orden?: number | null
          tipo_ajuste?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      canon_liquidaciones: {
        Row: {
          branch_id: string
          canon_monto: number
          canon_porcentaje: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          estado: string | null
          fc_total: number
          fecha_vencimiento: string | null
          ft_total: number
          id: string
          marketing_monto: number
          marketing_porcentaje: number | null
          observaciones: string | null
          pago_ft_sugerido: number | null
          pago_vt_sugerido: number | null
          periodo: string
          porcentaje_ft: number | null
          saldo_pendiente: number | null
          total_canon: number
          updated_at: string | null
          ventas_id: string | null
        }
        Insert: {
          branch_id: string
          canon_monto: number
          canon_porcentaje?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          estado?: string | null
          fc_total: number
          fecha_vencimiento?: string | null
          ft_total: number
          id?: string
          marketing_monto: number
          marketing_porcentaje?: number | null
          observaciones?: string | null
          pago_ft_sugerido?: number | null
          pago_vt_sugerido?: number | null
          periodo: string
          porcentaje_ft?: number | null
          saldo_pendiente?: number | null
          total_canon: number
          updated_at?: string | null
          ventas_id?: string | null
        }
        Update: {
          branch_id?: string
          canon_monto?: number
          canon_porcentaje?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          estado?: string | null
          fc_total?: number
          fecha_vencimiento?: string | null
          ft_total?: number
          id?: string
          marketing_monto?: number
          marketing_porcentaje?: number | null
          observaciones?: string | null
          pago_ft_sugerido?: number | null
          pago_vt_sugerido?: number | null
          periodo?: string
          porcentaje_ft?: number | null
          saldo_pendiente?: number | null
          total_canon?: number
          updated_at?: string | null
          ventas_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canon_liquidaciones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_liquidaciones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_liquidaciones_ventas_id_fkey"
            columns: ["ventas_id"]
            isOneToOne: false
            referencedRelation: "ventas_mensuales_local"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_movements: {
        Row: {
          amount: number
          branch_id: string
          categoria_gasto: string | null
          concept: string
          created_at: string | null
          estado_aprobacion: string | null
          id: string
          observaciones: string | null
          order_id: string | null
          payment_method: string
          rdo_category_code: string | null
          recorded_by: string | null
          shift_id: string
          source_register_id: string | null
          type: string
        }
        Insert: {
          amount: number
          branch_id: string
          categoria_gasto?: string | null
          concept: string
          created_at?: string | null
          estado_aprobacion?: string | null
          id?: string
          observaciones?: string | null
          order_id?: string | null
          payment_method?: string
          rdo_category_code?: string | null
          recorded_by?: string | null
          shift_id: string
          source_register_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          branch_id?: string
          categoria_gasto?: string | null
          concept?: string
          created_at?: string | null
          estado_aprobacion?: string | null
          id?: string
          observaciones?: string | null
          order_id?: string | null
          payment_method?: string
          rdo_category_code?: string | null
          recorded_by?: string | null
          shift_id?: string
          source_register_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "cash_register_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_source_register_id_fkey"
            columns: ["source_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_shifts: {
        Row: {
          branch_id: string
          cash_register_id: string
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          closing_report: Json | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          printed_at: string | null
          status: string
        }
        Insert: {
          branch_id: string
          cash_register_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_report?: Json | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          printed_at?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          cash_register_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          closing_report?: Json | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          printed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_shifts_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          branch_id: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          register_type: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          register_type?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          register_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_discrepancy_history: {
        Row: {
          actual_amount: number
          branch_id: string
          cash_register_id: string | null
          created_at: string | null
          discrepancy: number
          expected_amount: number
          id: string
          notes: string | null
          shift_date: string
          shift_id: string
          user_id: string
        }
        Insert: {
          actual_amount: number
          branch_id: string
          cash_register_id?: string | null
          created_at?: string | null
          discrepancy: number
          expected_amount: number
          id?: string
          notes?: string | null
          shift_date: string
          shift_id: string
          user_id: string
        }
        Update: {
          actual_amount?: number
          branch_id?: string
          cash_register_id?: string | null
          created_at?: string | null
          discrepancy?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          shift_date?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_discrepancy_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_insumo: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          id: string
          is_active: boolean | null
          nombre: string
          orden: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          is_active?: boolean | null
          nombre: string
          orden?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          is_active?: boolean | null
          nombre?: string
          orden?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categorias_preparacion: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      city_neighborhoods: {
        Row: {
          centroid_lat: number
          centroid_lng: number
          city: string
          created_at: string | null
          id: string
          name: string
          source: string | null
        }
        Insert: {
          centroid_lat: number
          centroid_lng: number
          city?: string
          created_at?: string | null
          id?: string
          name: string
          source?: string | null
        }
        Update: {
          centroid_lat?: number
          centroid_lng?: number
          city?: string
          created_at?: string | null
          id?: string
          name?: string
          source?: string | null
        }
        Relationships: []
      }
      cliente_direcciones: {
        Row: {
          ciudad: string | null
          created_at: string | null
          direccion: string
          etiqueta: string
          id: string
          is_primary: boolean | null
          latitud: number | null
          longitud: number | null
          piso: string | null
          referencia: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string | null
          direccion: string
          etiqueta?: string
          id?: string
          is_primary?: boolean | null
          latitud?: number | null
          longitud?: number | null
          piso?: string | null
          referencia?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string | null
          direccion?: string
          etiqueta?: string
          id?: string
          is_primary?: boolean | null
          latitud?: number | null
          longitud?: number | null
          piso?: string | null
          referencia?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clock_entries: {
        Row: {
          anomaly_type: string | null
          branch_id: string
          created_at: string | null
          early_leave_authorized: boolean
          entry_type: string
          gps_message: string | null
          gps_status: string | null
          id: string
          ip_address: unknown
          is_manual: boolean
          latitude: number | null
          longitude: number | null
          manual_by: string | null
          manual_reason: string | null
          original_created_at: string | null
          photo_url: string | null
          resolved_type: string | null
          schedule_id: string | null
          user_agent: string | null
          user_id: string
          work_date: string | null
        }
        Insert: {
          anomaly_type?: string | null
          branch_id: string
          created_at?: string | null
          early_leave_authorized?: boolean
          entry_type: string
          gps_message?: string | null
          gps_status?: string | null
          id?: string
          ip_address?: unknown
          is_manual?: boolean
          latitude?: number | null
          longitude?: number | null
          manual_by?: string | null
          manual_reason?: string | null
          original_created_at?: string | null
          photo_url?: string | null
          resolved_type?: string | null
          schedule_id?: string | null
          user_agent?: string | null
          user_id: string
          work_date?: string | null
        }
        Update: {
          anomaly_type?: string | null
          branch_id?: string
          created_at?: string | null
          early_leave_authorized?: boolean
          entry_type?: string
          gps_message?: string | null
          gps_status?: string | null
          id?: string
          ip_address?: unknown
          is_manual?: boolean
          latitude?: number | null
          longitude?: number | null
          manual_by?: string | null
          manual_reason?: string | null
          original_created_at?: string | null
          photo_url?: string | null
          resolved_type?: string | null
          schedule_id?: string | null
          user_agent?: string | null
          user_id?: string
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clock_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_entries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "employee_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_competency_scores: {
        Row: {
          coaching_id: string
          competency_id: string
          competency_type: string
          created_at: string
          id: string
          notes: string | null
          score: number
        }
        Insert: {
          coaching_id: string
          competency_id: string
          competency_type: string
          created_at?: string
          id?: string
          notes?: string | null
          score: number
        }
        Update: {
          coaching_id?: string
          competency_id?: string
          competency_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_competency_scores_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_station_scores: {
        Row: {
          coaching_id: string
          created_at: string
          id: string
          notes: string | null
          score: number
          station_id: string
        }
        Insert: {
          coaching_id: string
          created_at?: string
          id?: string
          notes?: string | null
          score: number
          station_id: string
        }
        Update: {
          coaching_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_station_scores_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_station_scores_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "work_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      coachings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_notes: string | null
          action_plan: string | null
          areas_to_improve: string | null
          branch_id: string
          coaching_date: string
          coaching_month: number
          coaching_type: string | null
          coaching_year: number
          created_at: string
          evaluated_by: string
          general_score: number | null
          id: string
          manager_notes: string | null
          overall_score: number | null
          previous_action_review: string | null
          station_score: number | null
          strengths: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_notes?: string | null
          action_plan?: string | null
          areas_to_improve?: string | null
          branch_id: string
          coaching_date?: string
          coaching_month: number
          coaching_type?: string | null
          coaching_year: number
          created_at?: string
          evaluated_by: string
          general_score?: number | null
          id?: string
          manager_notes?: string | null
          overall_score?: number | null
          previous_action_review?: string | null
          station_score?: number | null
          strengths?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_notes?: string | null
          action_plan?: string | null
          areas_to_improve?: string | null
          branch_id?: string
          coaching_date?: string
          coaching_month?: number
          coaching_type?: string | null
          coaching_year?: number
          created_at?: string
          evaluated_by?: string
          general_score?: number | null
          id?: string
          manager_notes?: string | null
          overall_score?: number | null
          previous_action_review?: string | null
          station_score?: number | null
          strengths?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coachings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coachings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_descuento: {
        Row: {
          branch_ids: string[] | null
          brand_id: string | null
          codigo: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          is_active: boolean
          monto_minimo_pedido: number | null
          tipo: string
          updated_at: string | null
          uso_unico_por_usuario: boolean
          usos_actuales: number
          usos_maximos: number | null
          valor: number
        }
        Insert: {
          branch_ids?: string[] | null
          brand_id?: string | null
          codigo: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          is_active?: boolean
          monto_minimo_pedido?: number | null
          tipo: string
          updated_at?: string | null
          uso_unico_por_usuario?: boolean
          usos_actuales?: number
          usos_maximos?: number | null
          valor?: number
        }
        Update: {
          branch_ids?: string[] | null
          brand_id?: string | null
          codigo?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          is_active?: boolean
          monto_minimo_pedido?: number | null
          tipo?: string
          updated_at?: string | null
          uso_unico_por_usuario?: boolean
          usos_actuales?: number
          usos_maximos?: number | null
          valor?: number
        }
        Relationships: []
      }
      codigos_descuento_usos: {
        Row: {
          codigo_id: string
          created_at: string | null
          id: string
          monto_descontado: number
          pedido_id: string | null
          user_id: string | null
        }
        Insert: {
          codigo_id: string
          created_at?: string | null
          id?: string
          monto_descontado?: number
          pedido_id?: string | null
          user_id?: string | null
        }
        Update: {
          codigo_id?: string
          created_at?: string | null
          id?: string
          monto_descontado?: number
          pedido_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codigos_descuento_usos_codigo_id_fkey"
            columns: ["codigo_id"]
            isOneToOne: false
            referencedRelation: "codigos_descuento"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_reads: {
        Row: {
          communication_id: string
          confirmed_at: string | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          communication_id: string
          confirmed_at?: string | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          communication_id?: string
          confirmed_at?: string | null
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_reads_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          body: string
          created_at: string | null
          created_by: string
          custom_label: string | null
          expires_at: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          requires_confirmation: boolean | null
          source_branch_id: string | null
          source_type: string | null
          tag: string | null
          target_branch_ids: string[] | null
          target_roles: string[] | null
          title: string
          type: Database["public"]["Enums"]["communication_type"] | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by: string
          custom_label?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          requires_confirmation?: boolean | null
          source_branch_id?: string | null
          source_type?: string | null
          tag?: string | null
          target_branch_ids?: string[] | null
          target_roles?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["communication_type"] | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string
          custom_label?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          requires_confirmation?: boolean | null
          source_branch_id?: string | null
          source_type?: string | null
          tag?: string | null
          target_branch_ids?: string[] | null
          target_roles?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["communication_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conceptos_servicio: {
        Row: {
          categoria_gasto: string | null
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          formula_calculo: Json | null
          id: string
          is_active: boolean | null
          is_calculated: boolean | null
          nombre: string
          periodicidad: string | null
          proveedor_id: string | null
          rdo_category_code: string | null
          subcategoria: string | null
          tipo: string
          updated_at: string | null
          visible_local: boolean
        }
        Insert: {
          categoria_gasto?: string | null
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          formula_calculo?: Json | null
          id?: string
          is_active?: boolean | null
          is_calculated?: boolean | null
          nombre: string
          periodicidad?: string | null
          proveedor_id?: string | null
          rdo_category_code?: string | null
          subcategoria?: string | null
          tipo?: string
          updated_at?: string | null
          visible_local?: boolean
        }
        Update: {
          categoria_gasto?: string | null
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          formula_calculo?: Json | null
          id?: string
          is_active?: boolean | null
          is_calculated?: boolean | null
          nombre?: string
          periodicidad?: string | null
          proveedor_id?: string | null
          rdo_category_code?: string | null
          subcategoria?: string | null
          tipo?: string
          updated_at?: string | null
          visible_local?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "conceptos_servicio_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "conceptos_servicio_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conceptos_servicio_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      configuracion_impuestos: {
        Row: {
          branch_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          iibb_alicuota: number
          observaciones: string | null
          otros_impuestos: Json | null
          tasas_municipales: number | null
          updated_at: string | null
          vigencia_desde: string
          vigencia_hasta: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          iibb_alicuota: number
          observaciones?: string | null
          otros_impuestos?: Json | null
          tasas_municipales?: number | null
          updated_at?: string | null
          vigencia_desde: string
          vigencia_hasta?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          iibb_alicuota?: number
          observaciones?: string | null
          otros_impuestos?: Json | null
          tasas_municipales?: number | null
          updated_at?: string | null
          vigencia_desde?: string
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_impuestos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_impuestos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      consumos_manuales: {
        Row: {
          branch_id: string
          categoria_pl: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          detalle: Json | null
          id: string
          monto_consumido: number
          observaciones: string | null
          periodo: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          categoria_pl: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          detalle?: Json | null
          id?: string
          monto_consumido: number
          observaciones?: string | null
          periodo: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          categoria_pl?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          detalle?: Json | null
          id?: string
          monto_consumido?: number
          observaciones?: string | null
          periodo?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumos_manuales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumos_manuales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          attachment_name: string | null
          attachment_url: string | null
          created_at: string | null
          email: string
          employment_branch_id: string | null
          employment_cv_link: string | null
          employment_motivation: string | null
          employment_position: string | null
          franchise_has_location: string | null
          franchise_has_zone: string | null
          franchise_investment_capital: string | null
          id: string
          investment_range: string | null
          message: string | null
          name: string
          notes: string | null
          order_branch_id: string | null
          order_date: string | null
          order_issue: string | null
          order_number: string | null
          phone: string
          priority: string | null
          read_at: string | null
          replied_at: string | null
          replied_by: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string | null
          email: string
          employment_branch_id?: string | null
          employment_cv_link?: string | null
          employment_motivation?: string | null
          employment_position?: string | null
          franchise_has_location?: string | null
          franchise_has_zone?: string | null
          franchise_investment_capital?: string | null
          id?: string
          investment_range?: string | null
          message?: string | null
          name: string
          notes?: string | null
          order_branch_id?: string | null
          order_date?: string | null
          order_issue?: string | null
          order_number?: string | null
          phone: string
          priority?: string | null
          read_at?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string | null
          email?: string
          employment_branch_id?: string | null
          employment_cv_link?: string | null
          employment_motivation?: string | null
          employment_position?: string | null
          franchise_has_location?: string | null
          franchise_has_zone?: string | null
          franchise_investment_capital?: string | null
          id?: string
          investment_range?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          order_branch_id?: string | null
          order_date?: string | null
          order_issue?: string | null
          order_number?: string | null
          phone?: string
          priority?: string | null
          read_at?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_employment_branch_id_fkey"
            columns: ["employment_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_employment_branch_id_fkey"
            columns: ["employment_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_order_branch_id_fkey"
            columns: ["order_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_order_branch_id_fkey"
            columns: ["order_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pricing_config: {
        Row: {
          base_distance_km: number
          base_price: number
          brand_id: string
          created_at: string | null
          estimated_speed_kmh: number
          google_api_key_encrypted: string | null
          id: string
          max_allowed_radius_km: number
          prep_time_minutes: number
          price_per_extra_km: number
          time_disclaimer: string | null
          updated_at: string | null
        }
        Insert: {
          base_distance_km?: number
          base_price?: number
          brand_id?: string
          created_at?: string | null
          estimated_speed_kmh?: number
          google_api_key_encrypted?: string | null
          id?: string
          max_allowed_radius_km?: number
          prep_time_minutes?: number
          price_per_extra_km?: number
          time_disclaimer?: string | null
          updated_at?: string | null
        }
        Update: {
          base_distance_km?: number
          base_price?: number
          brand_id?: string
          created_at?: string | null
          estimated_speed_kmh?: number
          google_api_key_encrypted?: string | null
          id?: string
          max_allowed_radius_km?: number
          prep_time_minutes?: number
          price_per_extra_km?: number
          time_disclaimer?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_radius_overrides_log: {
        Row: {
          action: string
          branch_id: string
          created_at: string | null
          id: string
          new_km: number | null
          performed_by: string | null
          previous_km: number | null
        }
        Insert: {
          action: string
          branch_id: string
          created_at?: string | null
          id?: string
          new_km?: number | null
          performed_by?: string | null
          previous_km?: number | null
        }
        Update: {
          action?: string
          branch_id?: string
          created_at?: string | null
          id?: string
          new_km?: number | null
          performed_by?: string | null
          previous_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_radius_overrides_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_radius_overrides_log_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          barrios: string[] | null
          branch_id: string
          costo_envio: number
          created_at: string | null
          descripcion: string | null
          id: string
          is_active: boolean | null
          nombre: string
          orden: number | null
          pedido_minimo: number | null
          tiempo_estimado_min: number | null
          updated_at: string | null
        }
        Insert: {
          barrios?: string[] | null
          branch_id: string
          costo_envio?: number
          created_at?: string | null
          descripcion?: string | null
          id?: string
          is_active?: boolean | null
          nombre: string
          orden?: number | null
          pedido_minimo?: number | null
          tiempo_estimado_min?: number | null
          updated_at?: string | null
        }
        Update: {
          barrios?: string[] | null
          branch_id?: string
          costo_envio?: number
          created_at?: string | null
          descripcion?: string | null
          id?: string
          is_active?: boolean | null
          nombre?: string
          orden?: number | null
          pedido_minimo?: number | null
          tiempo_estimado_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuciones_utilidades: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          distribuciones: Json
          fecha_distribucion: string
          fecha_proceso: string | null
          id: string
          monto_distribuible: number
          observaciones: string | null
          otras_reservas: number | null
          periodo: string
          procesado: boolean | null
          reserva_legal: number | null
          resultado_neto: number
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          distribuciones: Json
          fecha_distribucion: string
          fecha_proceso?: string | null
          id?: string
          monto_distribuible: number
          observaciones?: string | null
          otras_reservas?: number | null
          periodo: string
          procesado?: boolean | null
          reserva_legal?: number | null
          resultado_neto: number
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          distribuciones?: Json
          fecha_distribucion?: string
          fecha_proceso?: string | null
          id?: string
          monto_distribuible?: number
          observaciones?: string | null
          otras_reservas?: number | null
          periodo?: string
          procesado?: boolean | null
          reserva_legal?: number | null
          resultado_neto?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribuciones_utilidades_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuciones_utilidades_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          branch_id: string
          certified_at: string | null
          certified_by: string | null
          created_at: string
          id: string
          level: number
          notes: string | null
          station_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          station_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          station_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "work_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_data: {
        Row: {
          alias: string | null
          bank_name: string | null
          birth_date: string | null
          branch_id: string
          cbu: string | null
          created_at: string | null
          cuil: string | null
          dni: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          internal_notes: Json | null
          monthly_hours_target: number | null
          personal_address: string | null
          registered_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alias?: string | null
          bank_name?: string | null
          birth_date?: string | null
          branch_id: string
          cbu?: string | null
          created_at?: string | null
          cuil?: string | null
          dni?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          internal_notes?: Json | null
          monthly_hours_target?: number | null
          personal_address?: string | null
          registered_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alias?: string | null
          bank_name?: string | null
          birth_date?: string | null
          branch_id?: string
          cbu?: string | null
          created_at?: string | null
          cuil?: string | null
          dni?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          internal_notes?: Json | null
          monthly_hours_target?: number | null
          personal_address?: string | null
          registered_hours?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_data_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_data_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          branch_id: string | null
          break_end: string | null
          break_start: string | null
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          end_time_2: string | null
          id: string
          is_day_off: boolean | null
          modification_reason: string | null
          modified_at: string | null
          modified_by: string | null
          notification_sent_at: string | null
          published_at: string | null
          published_by: string | null
          schedule_date: string | null
          schedule_month: number | null
          schedule_year: number | null
          shift_number: number
          start_time: string
          start_time_2: string | null
          updated_at: string
          user_id: string | null
          work_position: string | null
        }
        Insert: {
          branch_id?: string | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          end_time_2?: string | null
          id?: string
          is_day_off?: boolean | null
          modification_reason?: string | null
          modified_at?: string | null
          modified_by?: string | null
          notification_sent_at?: string | null
          published_at?: string | null
          published_by?: string | null
          schedule_date?: string | null
          schedule_month?: number | null
          schedule_year?: number | null
          shift_number?: number
          start_time: string
          start_time_2?: string | null
          updated_at?: string
          user_id?: string | null
          work_position?: string | null
        }
        Update: {
          branch_id?: string | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          end_time_2?: string | null
          id?: string
          is_day_off?: boolean | null
          modification_reason?: string | null
          modified_at?: string | null
          modified_by?: string | null
          notification_sent_at?: string | null
          published_at?: string | null
          published_by?: string | null
          schedule_date?: string | null
          schedule_month?: number | null
          schedule_year?: number | null
          shift_number?: number
          start_time?: string
          start_time_2?: string | null
          updated_at?: string
          user_id?: string | null
          work_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_state: {
        Row: {
          branch_id: string | null
          current_state: string
          employee_id: string
          last_event_id: string | null
          last_updated: string | null
          open_clock_in_id: string | null
          open_schedule_id: string | null
        }
        Insert: {
          branch_id?: string | null
          current_state?: string
          employee_id: string
          last_event_id?: string | null
          last_updated?: string | null
          open_clock_in_id?: string | null
          open_schedule_id?: string | null
        }
        Update: {
          branch_id?: string | null
          current_state?: string
          employee_id?: string
          last_event_id?: string | null
          last_updated?: string | null
          open_clock_in_id?: string | null
          open_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_state_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_state_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_state_last_event_id_fkey"
            columns: ["last_event_id"]
            isOneToOne: false
            referencedRelation: "clock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_state_open_clock_in_id_fkey"
            columns: ["open_clock_in_id"]
            isOneToOne: false
            referencedRelation: "clock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_state_open_schedule_id_fkey"
            columns: ["open_schedule_id"]
            isOneToOne: false
            referencedRelation: "employee_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_emitidas: {
        Row: {
          afip_request: Json | null
          afip_response: Json | null
          anulada: boolean
          branch_id: string
          cae: string | null
          cae_vencimiento: string | null
          created_at: string
          emitido_por: string | null
          factura_asociada_id: string | null
          fecha_emision: string
          id: string
          iva: number
          moneda: string
          neto: number
          numero_comprobante: number
          pedido_id: string | null
          punto_venta: number
          receptor_condicion_iva: string | null
          receptor_cuit: string | null
          receptor_razon_social: string | null
          tipo_comprobante: string
          total: number
        }
        Insert: {
          afip_request?: Json | null
          afip_response?: Json | null
          anulada?: boolean
          branch_id: string
          cae?: string | null
          cae_vencimiento?: string | null
          created_at?: string
          emitido_por?: string | null
          factura_asociada_id?: string | null
          fecha_emision?: string
          id?: string
          iva?: number
          moneda?: string
          neto?: number
          numero_comprobante: number
          pedido_id?: string | null
          punto_venta: number
          receptor_condicion_iva?: string | null
          receptor_cuit?: string | null
          receptor_razon_social?: string | null
          tipo_comprobante: string
          total?: number
        }
        Update: {
          afip_request?: Json | null
          afip_response?: Json | null
          anulada?: boolean
          branch_id?: string
          cae?: string | null
          cae_vencimiento?: string | null
          created_at?: string
          emitido_por?: string | null
          factura_asociada_id?: string | null
          fecha_emision?: string
          id?: string
          iva?: number
          moneda?: string
          neto?: number
          numero_comprobante?: number
          pedido_id?: string | null
          punto_venta?: number
          receptor_condicion_iva?: string | null
          receptor_cuit?: string | null
          receptor_razon_social?: string | null
          tipo_comprobante?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_emitidas_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_emitidas_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_emitidas_factura_asociada_id_fkey"
            columns: ["factura_asociada_id"]
            isOneToOne: false
            referencedRelation: "facturas_emitidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_emitidas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_emitidas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      facturas_proveedores: {
        Row: {
          branch_id: string
          condicion_pago: string | null
          costo_real: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          estado_pago: string | null
          factura_fecha: string
          factura_numero: string
          factura_tipo: string | null
          factura_url: string | null
          fecha_vencimiento: string | null
          id: string
          imp_internos: number | null
          iva: number | null
          iva_105: number | null
          iva_21: number | null
          motivo_extraordinaria: string | null
          observaciones: string | null
          otros_impuestos: number | null
          perc_iva: number | null
          perc_municipal: number | null
          perc_provincial: number | null
          periodo: string
          proveedor_id: string
          saldo_pendiente: number | null
          subtotal: number
          subtotal_bruto: number | null
          subtotal_neto: number | null
          tipo: string | null
          total: number
          total_descuentos: number | null
          total_factura: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          condicion_pago?: string | null
          costo_real?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          estado_pago?: string | null
          factura_fecha: string
          factura_numero: string
          factura_tipo?: string | null
          factura_url?: string | null
          fecha_vencimiento?: string | null
          id?: string
          imp_internos?: number | null
          iva?: number | null
          iva_105?: number | null
          iva_21?: number | null
          motivo_extraordinaria?: string | null
          observaciones?: string | null
          otros_impuestos?: number | null
          perc_iva?: number | null
          perc_municipal?: number | null
          perc_provincial?: number | null
          periodo: string
          proveedor_id: string
          saldo_pendiente?: number | null
          subtotal?: number
          subtotal_bruto?: number | null
          subtotal_neto?: number | null
          tipo?: string | null
          total?: number
          total_descuentos?: number | null
          total_factura?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          condicion_pago?: string | null
          costo_real?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          estado_pago?: string | null
          factura_fecha?: string
          factura_numero?: string
          factura_tipo?: string | null
          factura_url?: string | null
          fecha_vencimiento?: string | null
          id?: string
          imp_internos?: number | null
          iva?: number | null
          iva_105?: number | null
          iva_21?: number | null
          motivo_extraordinaria?: string | null
          observaciones?: string | null
          otros_impuestos?: number | null
          perc_iva?: number | null
          perc_municipal?: number | null
          perc_provincial?: number | null
          periodo?: string
          proveedor_id?: string
          saldo_pendiente?: number | null
          subtotal?: number
          subtotal_bruto?: number | null
          subtotal_neto?: number | null
          tipo?: string | null
          total?: number
          total_descuentos?: number | null
          total_factura?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proveedores_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "facturas_proveedores_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          campos_modificados: string[] | null
          datos_antes: Json | null
          datos_despues: Json | null
          id: string
          ip_address: unknown
          observaciones: string | null
          operacion: string
          registro_id: string
          tabla: string
          timestamp: string | null
          user_agent: string | null
          usuario_email: string | null
          usuario_id: string | null
        }
        Insert: {
          campos_modificados?: string[] | null
          datos_antes?: Json | null
          datos_despues?: Json | null
          id?: string
          ip_address?: unknown
          observaciones?: string | null
          operacion: string
          registro_id: string
          tabla: string
          timestamp?: string | null
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Update: {
          campos_modificados?: string[] | null
          datos_antes?: Json | null
          datos_despues?: Json | null
          id?: string
          ip_address?: unknown
          observaciones?: string | null
          operacion?: string
          registro_id?: string
          tabla?: string
          timestamp?: string | null
          user_agent?: string | null
          usuario_email?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      fiscal_z_closings: {
        Row: {
          branch_id: string
          created_at: string
          date: string
          exempt: number
          first_voucher_number: string | null
          first_voucher_type: string | null
          generated_at: string
          generated_by: string | null
          id: string
          is_locked: boolean
          last_voucher_number: string | null
          last_voucher_type: string | null
          net_total: number
          non_taxable: number
          other_taxes: number
          payment_cash: number
          payment_credit: number
          payment_debit: number
          payment_qr: number
          payment_transfer: number
          period_from: string
          period_to: string
          pos_point_of_sale: number
          subtotal_net: number
          taxable_105: number
          taxable_21: number
          total_credit_notes_amount: number
          total_credit_notes_b: number
          total_credit_notes_c: number
          total_invoices: number
          total_invoices_b: number
          total_invoices_c: number
          total_sales: number
          total_tickets: number
          total_vat: number
          vat_105: number
          vat_21: number
          z_number: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          date: string
          exempt?: number
          first_voucher_number?: string | null
          first_voucher_type?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_locked?: boolean
          last_voucher_number?: string | null
          last_voucher_type?: string | null
          net_total?: number
          non_taxable?: number
          other_taxes?: number
          payment_cash?: number
          payment_credit?: number
          payment_debit?: number
          payment_qr?: number
          payment_transfer?: number
          period_from: string
          period_to: string
          pos_point_of_sale: number
          subtotal_net?: number
          taxable_105?: number
          taxable_21?: number
          total_credit_notes_amount?: number
          total_credit_notes_b?: number
          total_credit_notes_c?: number
          total_invoices?: number
          total_invoices_b?: number
          total_invoices_c?: number
          total_sales?: number
          total_tickets?: number
          total_vat?: number
          vat_105?: number
          vat_21?: number
          z_number: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          date?: string
          exempt?: number
          first_voucher_number?: string | null
          first_voucher_type?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_locked?: boolean
          last_voucher_number?: string | null
          last_voucher_type?: string | null
          net_total?: number
          non_taxable?: number
          other_taxes?: number
          payment_cash?: number
          payment_credit?: number
          payment_debit?: number
          payment_qr?: number
          payment_transfer?: number
          period_from?: string
          period_to?: string
          pos_point_of_sale?: number
          subtotal_net?: number
          taxable_105?: number
          taxable_21?: number
          total_credit_notes_amount?: number
          total_credit_notes_b?: number
          total_credit_notes_c?: number
          total_invoices?: number
          total_invoices_b?: number
          total_invoices_c?: number
          total_sales?: number
          total_tickets?: number
          total_vat?: number
          vat_105?: number
          vat_21?: number
          z_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_z_closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_z_closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          adjuntos: Json | null
          afecta_caja: boolean | null
          branch_id: string
          categoria_principal: string
          concepto: string
          costo_transferencia: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          detalle: Json | null
          estado: string | null
          fecha: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          gasto_relacionado_id: string | null
          id: string
          medio_pago: string | null
          monto: number
          observaciones: string | null
          periodo: string
          proveedor_id: string | null
          rdo_category_code: string | null
          rdo_section: string | null
          referencia_pago: string | null
          shift_id: string | null
          subcategoria: string | null
          tipo_pago: string | null
          updated_at: string | null
        }
        Insert: {
          adjuntos?: Json | null
          afecta_caja?: boolean | null
          branch_id: string
          categoria_principal: string
          concepto: string
          costo_transferencia?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          detalle?: Json | null
          estado?: string | null
          fecha: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          gasto_relacionado_id?: string | null
          id?: string
          medio_pago?: string | null
          monto: number
          observaciones?: string | null
          periodo: string
          proveedor_id?: string | null
          rdo_category_code?: string | null
          rdo_section?: string | null
          referencia_pago?: string | null
          shift_id?: string | null
          subcategoria?: string | null
          tipo_pago?: string | null
          updated_at?: string | null
        }
        Update: {
          adjuntos?: Json | null
          afecta_caja?: boolean | null
          branch_id?: string
          categoria_principal?: string
          concepto?: string
          costo_transferencia?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          detalle?: Json | null
          estado?: string | null
          fecha?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          gasto_relacionado_id?: string | null
          id?: string
          medio_pago?: string | null
          monto?: number
          observaciones?: string | null
          periodo?: string
          proveedor_id?: string | null
          rdo_category_code?: string | null
          rdo_section?: string | null
          referencia_pago?: string | null
          shift_id?: string | null
          subcategoria?: string | null
          tipo_pago?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_gasto_relacionado_id_fkey"
            columns: ["gasto_relacionado_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "gastos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "gastos_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      general_competencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      inspection_items: {
        Row: {
          category: string
          complies: boolean | null
          created_at: string
          id: string
          inspection_id: string
          item_key: string
          item_label: string
          observations: string | null
          photo_urls: string[] | null
          sort_order: number
        }
        Insert: {
          category: string
          complies?: boolean | null
          created_at?: string
          id?: string
          inspection_id: string
          item_key: string
          item_label: string
          observations?: string | null
          photo_urls?: string[] | null
          sort_order?: number
        }
        Update: {
          category?: string
          complies?: boolean | null
          created_at?: string
          id?: string
          inspection_id?: string
          item_key?: string
          item_label?: string
          observations?: string | null
          photo_urls?: string[] | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "branch_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_staff_present: {
        Row: {
          created_at: string | null
          id: string
          inspection_id: string
          observations: string | null
          station_clean: boolean | null
          uniform_ok: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspection_id: string
          observations?: string | null
          station_clean?: boolean | null
          uniform_ok?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inspection_id?: string
          observations?: string | null
          station_clean?: boolean | null
          uniform_ok?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_staff_present_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "branch_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          inspection_type: string
          is_active: boolean
          item_key: string
          item_label: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          inspection_type: string
          is_active?: boolean
          item_key: string
          item_label: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          inspection_type?: string
          is_active?: boolean
          item_key?: string
          item_label?: string
          sort_order?: number
        }
        Relationships: []
      }
      insumos: {
        Row: {
          categoria_id: string | null
          categoria_pl: string | null
          costo_por_unidad_base: number | null
          creado_por: string | null
          created_at: string | null
          default_alicuota_iva: number | null
          deleted_at: string | null
          descripcion: string | null
          especificacion: Json | null
          fc_objetivo_extra: number | null
          id: string
          is_active: boolean | null
          margen_bruto: number | null
          margen_porcentaje: number | null
          motivo_control: string | null
          nivel_control: string
          nombre: string
          precio_extra: number | null
          precio_maximo_sugerido: number | null
          precio_referencia: number | null
          precio_venta: number | null
          proveedor_obligatorio_id: string | null
          proveedor_sugerido_id: string | null
          puede_ser_extra: boolean
          rdo_category_code: string | null
          tipo_item: string
          tracks_stock: boolean
          unidad_base: string
          unidad_compra: string | null
          unidad_compra_contenido: number | null
          unidad_compra_precio: number | null
          updated_at: string | null
        }
        Insert: {
          categoria_id?: string | null
          categoria_pl?: string | null
          costo_por_unidad_base?: number | null
          creado_por?: string | null
          created_at?: string | null
          default_alicuota_iva?: number | null
          deleted_at?: string | null
          descripcion?: string | null
          especificacion?: Json | null
          fc_objetivo_extra?: number | null
          id?: string
          is_active?: boolean | null
          margen_bruto?: number | null
          margen_porcentaje?: number | null
          motivo_control?: string | null
          nivel_control?: string
          nombre: string
          precio_extra?: number | null
          precio_maximo_sugerido?: number | null
          precio_referencia?: number | null
          precio_venta?: number | null
          proveedor_obligatorio_id?: string | null
          proveedor_sugerido_id?: string | null
          puede_ser_extra?: boolean
          rdo_category_code?: string | null
          tipo_item?: string
          tracks_stock?: boolean
          unidad_base: string
          unidad_compra?: string | null
          unidad_compra_contenido?: number | null
          unidad_compra_precio?: number | null
          updated_at?: string | null
        }
        Update: {
          categoria_id?: string | null
          categoria_pl?: string | null
          costo_por_unidad_base?: number | null
          creado_por?: string | null
          created_at?: string | null
          default_alicuota_iva?: number | null
          deleted_at?: string | null
          descripcion?: string | null
          especificacion?: Json | null
          fc_objetivo_extra?: number | null
          id?: string
          is_active?: boolean | null
          margen_bruto?: number | null
          margen_porcentaje?: number | null
          motivo_control?: string | null
          nivel_control?: string
          nombre?: string
          precio_extra?: number | null
          precio_maximo_sugerido?: number | null
          precio_referencia?: number | null
          precio_venta?: number | null
          proveedor_obligatorio_id?: string | null
          proveedor_sugerido_id?: string | null
          puede_ser_extra?: boolean
          rdo_category_code?: string | null
          tipo_item?: string
          tracks_stock?: boolean
          unidad_base?: string
          unidad_compra?: string | null
          unidad_compra_contenido?: number | null
          unidad_compra_precio?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_insumo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_proveedor_obligatorio_id_fkey"
            columns: ["proveedor_obligatorio_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "insumos_proveedor_obligatorio_id_fkey"
            columns: ["proveedor_obligatorio_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_proveedor_sugerido_id_fkey"
            columns: ["proveedor_sugerido_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "insumos_proveedor_sugerido_id_fkey"
            columns: ["proveedor_sugerido_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      insumos_costos_historial: {
        Row: {
          branch_id: string | null
          costo_anterior: number | null
          costo_nuevo: number
          created_at: string | null
          factura_id: string | null
          id: string
          insumo_id: string
          motivo: string | null
        }
        Insert: {
          branch_id?: string | null
          costo_anterior?: number | null
          costo_nuevo: number
          created_at?: string | null
          factura_id?: string | null
          id?: string
          insumo_id: string
          motivo?: string | null
        }
        Update: {
          branch_id?: string | null
          costo_anterior?: number | null
          costo_nuevo?: number
          created_at?: string | null
          factura_id?: string | null
          id?: string
          insumo_id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_costos_historial_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_costos_historial_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_costos_historial_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_marca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_costos_historial_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_costos_historial_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      inversiones: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          cuotas_pagadas: number | null
          cuotas_total: number | null
          deleted_at: string | null
          descripcion: string
          estado: string
          fecha: string
          id: string
          monto_total: number
          observaciones: string | null
          periodo: string
          tipo_inversion: string
          updated_at: string
          vida_util_meses: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          cuotas_pagadas?: number | null
          cuotas_total?: number | null
          deleted_at?: string | null
          descripcion: string
          estado?: string
          fecha: string
          id?: string
          monto_total: number
          observaciones?: string | null
          periodo: string
          tipo_inversion: string
          updated_at?: string
          vida_util_meses?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          cuotas_pagadas?: number | null
          cuotas_total?: number | null
          deleted_at?: string | null
          descripcion?: string
          estado?: string
          fecha?: string
          id?: string
          monto_total?: number
          observaciones?: string | null
          periodo?: string
          tipo_inversion?: string
          updated_at?: string
          vida_util_meses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inversiones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inversiones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      item_carta_composicion: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          insumo_id: string | null
          is_removable: boolean
          item_carta_id: string
          orden: number | null
          preparacion_id: string | null
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          is_removable?: boolean
          item_carta_id: string
          orden?: number | null
          preparacion_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          is_removable?: boolean
          item_carta_id?: string
          orden?: number | null
          preparacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_carta_composicion_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_composicion_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_composicion_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_composicion_preparacion_id_fkey"
            columns: ["preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      item_carta_extras: {
        Row: {
          created_at: string
          id: string
          insumo_id: string | null
          item_carta_id: string
          orden: number
          preparacion_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id?: string | null
          item_carta_id: string
          orden?: number
          preparacion_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string | null
          item_carta_id?: string
          orden?: number
          preparacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_carta_extras_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_extras_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_extras_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_extras_preparacion_id_fkey"
            columns: ["preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      item_carta_grupo_opcional: {
        Row: {
          costo_promedio: number | null
          created_at: string
          id: string
          is_required: boolean
          item_carta_id: string
          max_selecciones: number | null
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          costo_promedio?: number | null
          created_at?: string
          id?: string
          is_required?: boolean
          item_carta_id: string
          max_selecciones?: number | null
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          costo_promedio?: number | null
          created_at?: string
          id?: string
          is_required?: boolean
          item_carta_id?: string
          max_selecciones?: number | null
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_carta_grupo_opcional_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_grupo_opcional_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_carta_grupo_opcional_items: {
        Row: {
          cantidad: number
          costo_unitario: number | null
          created_at: string
          grupo_id: string
          id: string
          insumo_id: string | null
          preparacion_id: string | null
        }
        Insert: {
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string
          grupo_id: string
          id?: string
          insumo_id?: string | null
          preparacion_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string
          grupo_id?: string
          id?: string
          insumo_id?: string | null
          preparacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_carta_grupo_opcional_items_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "item_carta_grupo_opcional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_grupo_opcional_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_grupo_opcional_items_preparacion_id_fkey"
            columns: ["preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      item_carta_precios_historial: {
        Row: {
          created_at: string | null
          id: string
          item_carta_id: string
          motivo: string | null
          precio_anterior: number | null
          precio_nuevo: number
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_carta_id: string
          motivo?: string | null
          precio_anterior?: number | null
          precio_nuevo: number
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_carta_id?: string
          motivo?: string | null
          precio_anterior?: number | null
          precio_nuevo?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_carta_precios_historial_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_carta_precios_historial_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_extra_asignaciones: {
        Row: {
          created_at: string | null
          extra_id: string
          id: string
          item_carta_id: string
        }
        Insert: {
          created_at?: string | null
          extra_id: string
          id?: string
          item_carta_id: string
        }
        Update: {
          created_at?: string | null
          extra_id?: string
          id?: string
          item_carta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_extra_asignaciones_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_extra_asignaciones_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_extra_asignaciones_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_extra_asignaciones_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_modificadores: {
        Row: {
          cantidad_ahorro: number | null
          cantidad_extra: number | null
          cantidad_nuevo: number | null
          costo_ahorro: number | null
          costo_extra: number | null
          created_at: string | null
          diferencia_costo: number | null
          diferencia_precio: number | null
          id: string
          ingrediente_extra_id: string | null
          ingrediente_id: string | null
          ingrediente_nuevo_id: string | null
          ingrediente_original_id: string | null
          is_active: boolean | null
          item_carta_id: string
          nombre: string
          orden: number | null
          precio_extra: number | null
          receta_extra_id: string | null
          receta_id: string | null
          tipo: string
          unidad_ahorro: string | null
          unidad_extra: string | null
          unidad_nuevo: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad_ahorro?: number | null
          cantidad_extra?: number | null
          cantidad_nuevo?: number | null
          costo_ahorro?: number | null
          costo_extra?: number | null
          created_at?: string | null
          diferencia_costo?: number | null
          diferencia_precio?: number | null
          id?: string
          ingrediente_extra_id?: string | null
          ingrediente_id?: string | null
          ingrediente_nuevo_id?: string | null
          ingrediente_original_id?: string | null
          is_active?: boolean | null
          item_carta_id: string
          nombre: string
          orden?: number | null
          precio_extra?: number | null
          receta_extra_id?: string | null
          receta_id?: string | null
          tipo: string
          unidad_ahorro?: string | null
          unidad_extra?: string | null
          unidad_nuevo?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad_ahorro?: number | null
          cantidad_extra?: number | null
          cantidad_nuevo?: number | null
          costo_ahorro?: number | null
          costo_extra?: number | null
          created_at?: string | null
          diferencia_costo?: number | null
          diferencia_precio?: number | null
          id?: string
          ingrediente_extra_id?: string | null
          ingrediente_id?: string | null
          ingrediente_nuevo_id?: string | null
          ingrediente_original_id?: string | null
          is_active?: boolean | null
          item_carta_id?: string
          nombre?: string
          orden?: number | null
          precio_extra?: number | null
          receta_extra_id?: string | null
          receta_id?: string | null
          tipo?: string
          unidad_ahorro?: string | null
          unidad_extra?: string | null
          unidad_nuevo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_modificadores_ingrediente_extra_id_fkey"
            columns: ["ingrediente_extra_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_ingrediente_nuevo_id_fkey"
            columns: ["ingrediente_nuevo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_ingrediente_original_id_fkey"
            columns: ["ingrediente_original_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_receta_extra_id_fkey"
            columns: ["receta_extra_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_modificadores_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      item_removibles: {
        Row: {
          created_at: string | null
          id: string
          insumo_id: string | null
          is_active: boolean | null
          item_carta_id: string
          nombre_display: string | null
          preparacion_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          is_active?: boolean | null
          item_carta_id: string
          nombre_display?: string | null
          preparacion_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          is_active?: boolean | null
          item_carta_id?: string
          nombre_display?: string | null
          preparacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_removibles_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_removibles_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_removibles_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_removibles_preparacion_id_fkey"
            columns: ["preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      items_carta: {
        Row: {
          categoria_carta_id: string | null
          closure_category: string | null
          composicion_ref_insumo_id: string | null
          composicion_ref_preparacion_id: string | null
          costo_total: number | null
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          disponible_delivery: boolean | null
          disponible_webapp: boolean | null
          fc_actual: number | null
          fc_objetivo: number | null
          id: string
          imagen_url: string | null
          is_active: boolean | null
          kitchen_station_id: string | null
          nombre: string
          nombre_corto: string | null
          orden: number | null
          precio_base: number
          precio_promo: number | null
          precio_referencia: number | null
          promo_etiqueta: string | null
          rdo_category_code: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          categoria_carta_id?: string | null
          closure_category?: string | null
          composicion_ref_insumo_id?: string | null
          composicion_ref_preparacion_id?: string | null
          costo_total?: number | null
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          disponible_delivery?: boolean | null
          disponible_webapp?: boolean | null
          fc_actual?: number | null
          fc_objetivo?: number | null
          id?: string
          imagen_url?: string | null
          is_active?: boolean | null
          kitchen_station_id?: string | null
          nombre: string
          nombre_corto?: string | null
          orden?: number | null
          precio_base?: number
          precio_promo?: number | null
          precio_referencia?: number | null
          promo_etiqueta?: string | null
          rdo_category_code?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          categoria_carta_id?: string | null
          closure_category?: string | null
          composicion_ref_insumo_id?: string | null
          composicion_ref_preparacion_id?: string | null
          costo_total?: number | null
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          disponible_delivery?: boolean | null
          disponible_webapp?: boolean | null
          fc_actual?: number | null
          fc_objetivo?: number | null
          id?: string
          imagen_url?: string | null
          is_active?: boolean | null
          kitchen_station_id?: string | null
          nombre?: string
          nombre_corto?: string | null
          orden?: number | null
          precio_base?: number
          precio_promo?: number | null
          precio_referencia?: number | null
          promo_etiqueta?: string | null
          rdo_category_code?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_carta_categoria_carta_id_fkey"
            columns: ["categoria_carta_id"]
            isOneToOne: false
            referencedRelation: "menu_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_carta_composicion_ref_insumo_id_fkey"
            columns: ["composicion_ref_insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_carta_composicion_ref_preparacion_id_fkey"
            columns: ["composicion_ref_preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_carta_kitchen_station_id_fkey"
            columns: ["kitchen_station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_carta_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      items_factura: {
        Row: {
          afecta_costo_base: boolean | null
          alicuota_iva: number | null
          cantidad: number
          categoria_pl: string | null
          concepto_servicio_id: string | null
          created_at: string | null
          descuento_monto: number | null
          descuento_porcentaje: number | null
          factura_id: string
          id: string
          insumo_id: string | null
          iva_monto: number | null
          observaciones: string | null
          precio_bruto: number | null
          precio_neto: number | null
          precio_unitario: number
          precio_unitario_bruto: number | null
          rdo_category_code: string | null
          subtotal: number
          tipo_item: string
          unidad: string | null
        }
        Insert: {
          afecta_costo_base?: boolean | null
          alicuota_iva?: number | null
          cantidad?: number
          categoria_pl?: string | null
          concepto_servicio_id?: string | null
          created_at?: string | null
          descuento_monto?: number | null
          descuento_porcentaje?: number | null
          factura_id: string
          id?: string
          insumo_id?: string | null
          iva_monto?: number | null
          observaciones?: string | null
          precio_bruto?: number | null
          precio_neto?: number | null
          precio_unitario: number
          precio_unitario_bruto?: number | null
          rdo_category_code?: string | null
          subtotal: number
          tipo_item?: string
          unidad?: string | null
        }
        Update: {
          afecta_costo_base?: boolean | null
          alicuota_iva?: number | null
          cantidad?: number
          categoria_pl?: string | null
          concepto_servicio_id?: string | null
          created_at?: string | null
          descuento_monto?: number | null
          descuento_porcentaje?: number | null
          factura_id?: string
          id?: string
          insumo_id?: string | null
          iva_monto?: number | null
          observaciones?: string | null
          precio_bruto?: number | null
          precio_neto?: number | null
          precio_unitario?: number
          precio_unitario_bruto?: number | null
          rdo_category_code?: string | null
          subtotal?: number
          tipo_item?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_factura_concepto_servicio_id_fkey"
            columns: ["concepto_servicio_id"]
            isOneToOne: false
            referencedRelation: "conceptos_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_factura_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_marca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_factura_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_factura_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_factura_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      kitchen_stations: {
        Row: {
          branch_id: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          kds_enabled: boolean
          name: string
          print_copies: number
          print_on: string
          printer_id: string | null
          sort_order: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          kds_enabled?: boolean
          name: string
          print_copies?: number
          print_on?: string
          printer_id?: string | null
          sort_order?: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          kds_enabled?: boolean
          name?: string
          print_copies?: number
          print_on?: string
          printer_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_stations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_stations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_stations_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_config: {
        Row: {
          branch_id: string | null
          created_at: string
          daily_hours_limit: number
          holiday_surcharge_pct: number
          id: string
          late_tolerance_per_entry_min: number | null
          late_tolerance_total_min: number
          monthly_hours_limit: number
          overtime_surcharge_pct: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          daily_hours_limit?: number
          holiday_surcharge_pct?: number
          id?: string
          late_tolerance_per_entry_min?: number | null
          late_tolerance_total_min?: number
          monthly_hours_limit?: number
          overtime_surcharge_pct?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          daily_hours_limit?: number
          holiday_surcharge_pct?: number
          id?: string
          late_tolerance_per_entry_min?: number | null
          late_tolerance_total_min?: number
          monthly_hours_limit?: number
          overtime_surcharge_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      llamadores: {
        Row: {
          asignado_at: string | null
          branch_id: string
          en_uso: boolean | null
          id: string
          numero: number
          pedido_id: string | null
        }
        Insert: {
          asignado_at?: string | null
          branch_id: string
          en_uso?: boolean | null
          id?: string
          numero: number
          pedido_id?: string | null
        }
        Update: {
          asignado_at?: string | null
          branch_id?: string
          en_uso?: boolean | null
          id?: string
          numero?: number
          pedido_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llamadores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llamadores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llamadores_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llamadores_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      manager_competencies: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          rubric_1: string | null
          rubric_3: string | null
          rubric_5: string | null
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          rubric_1?: string | null
          rubric_3?: string | null
          rubric_5?: string | null
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          rubric_1?: string | null
          rubric_3?: string | null
          rubric_5?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      meeting_agreement_assignees: {
        Row: {
          agreement_id: string
          id: string
          user_id: string
        }
        Insert: {
          agreement_id: string
          id?: string
          user_id: string
        }
        Update: {
          agreement_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agreement_assignees_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "meeting_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agreements: {
        Row: {
          created_at: string
          description: string
          id: string
          meeting_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          meeting_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          meeting_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agreements_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          meeting_id: string
          notified_at: string | null
          read_at: string | null
          reminder_count: number | null
          user_id: string
          was_present: boolean | null
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          meeting_id: string
          notified_at?: string | null
          read_at?: string | null
          reminder_count?: number | null
          user_id: string
          was_present?: boolean | null
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          meeting_id?: string
          notified_at?: string | null
          read_at?: string | null
          reminder_count?: number | null
          user_id?: string
          was_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          area: string
          branch_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          notes: string | null
          scheduled_at: string | null
          source: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          area?: string
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          date: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          area?: string
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categorias: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          is_active: boolean | null
          nombre: string
          orden: number | null
          tipo_impresion: string
          updated_at: string | null
          visible_en_carta: boolean
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          is_active?: boolean | null
          nombre: string
          orden?: number | null
          tipo_impresion?: string
          updated_at?: string | null
          visible_en_carta?: boolean
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          is_active?: boolean | null
          nombre?: string
          orden?: number | null
          tipo_impresion?: string
          updated_at?: string | null
          visible_en_carta?: boolean
        }
        Relationships: []
      }
      mercadopago_config: {
        Row: {
          access_token: string
          branch_id: string
          collector_id: string | null
          created_at: string
          device_id: string | null
          device_name: string | null
          device_operating_mode: string | null
          estado_conexion: string
          id: string
          public_key: string
          ultimo_test: string | null
          ultimo_test_ok: boolean | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string
          branch_id: string
          collector_id?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          device_operating_mode?: string | null
          estado_conexion?: string
          id?: string
          public_key?: string
          ultimo_test?: string | null
          ultimo_test_ok?: boolean | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string
          branch_id?: string
          collector_id?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          device_operating_mode?: string | null
          estado_conexion?: string
          id?: string
          public_key?: string
          ultimo_test?: string | null
          ultimo_test_ok?: boolean | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercadopago_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_socio: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          detalle: Json | null
          fecha: string
          id: string
          monto: number
          observaciones: string | null
          periodo: string | null
          resultado_periodo: number | null
          saldo_acumulado: number | null
          socio_id: string
          tipo: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          detalle?: Json | null
          fecha: string
          id?: string
          monto: number
          observaciones?: string | null
          periodo?: string | null
          resultado_periodo?: number | null
          saldo_acumulado?: number | null
          socio_id: string
          tipo: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          detalle?: Json | null
          fecha?: string
          id?: string
          monto?: number
          observaciones?: string | null
          periodo?: string | null
          resultado_periodo?: number | null
          saldo_acumulado?: number | null
          socio_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_socio_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_socio_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_socio_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "balance_socios"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "movimientos_socio_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_session_logs: {
        Row: {
          action_type: string
          branch_id: string
          created_at: string | null
          current_user_id: string
          id: string
          previous_user_id: string | null
          triggered_by: string | null
        }
        Insert: {
          action_type: string
          branch_id: string
          created_at?: string | null
          current_user_id: string
          id?: string
          previous_user_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          action_type?: string
          branch_id?: string
          created_at?: string | null
          current_user_id?: string
          id?: string
          previous_user_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_session_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_session_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_factura: {
        Row: {
          factura_id: string
          id: string
          monto_aplicado: number
          pago_id: string
        }
        Insert: {
          factura_id: string
          id?: string
          monto_aplicado: number
          pago_id: string
        }
        Update: {
          factura_id?: string
          id?: string
          monto_aplicado?: number
          pago_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_factura_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_marca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_factura_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_factura_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos_proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_canon: {
        Row: {
          branch_id: string
          canon_liquidacion_id: string
          created_at: string | null
          created_by: string | null
          datos_pago: Json | null
          deleted_at: string | null
          fecha_pago: string
          id: string
          is_verified: boolean
          medio_pago: string
          monto: number
          observaciones: string | null
          referencia: string | null
          verificado_at: string | null
          verificado_notas: string | null
          verificado_por: string | null
        }
        Insert: {
          branch_id: string
          canon_liquidacion_id: string
          created_at?: string | null
          created_by?: string | null
          datos_pago?: Json | null
          deleted_at?: string | null
          fecha_pago: string
          id?: string
          is_verified?: boolean
          medio_pago: string
          monto: number
          observaciones?: string | null
          referencia?: string | null
          verificado_at?: string | null
          verificado_notas?: string | null
          verificado_por?: string | null
        }
        Update: {
          branch_id?: string
          canon_liquidacion_id?: string
          created_at?: string | null
          created_by?: string | null
          datos_pago?: Json | null
          deleted_at?: string | null
          fecha_pago?: string
          id?: string
          is_verified?: boolean
          medio_pago?: string
          monto?: number
          observaciones?: string | null
          referencia?: string | null
          verificado_at?: string | null
          verificado_notas?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_canon_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_canon_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_canon_canon_liquidacion_id_fkey"
            columns: ["canon_liquidacion_id"]
            isOneToOne: false
            referencedRelation: "canon_liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_proveedores: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          datos_pago: Json | null
          deleted_at: string | null
          factura_id: string | null
          fecha_pago: string
          fecha_vencimiento_pago: string | null
          id: string
          is_verified: boolean
          medio_pago: string
          monto: number
          observaciones: string | null
          proveedor_id: string
          referencia: string | null
          verificado_at: string | null
          verificado_notas: string | null
          verificado_por: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          datos_pago?: Json | null
          deleted_at?: string | null
          factura_id?: string | null
          fecha_pago: string
          fecha_vencimiento_pago?: string | null
          id?: string
          is_verified?: boolean
          medio_pago: string
          monto: number
          observaciones?: string | null
          proveedor_id: string
          referencia?: string | null
          verificado_at?: string | null
          verificado_notas?: string | null
          verificado_por?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          datos_pago?: Json | null
          deleted_at?: string | null
          factura_id?: string | null
          fecha_pago?: string
          fecha_vencimiento_pago?: string | null
          id?: string
          is_verified?: boolean
          medio_pago?: string
          monto?: number
          observaciones?: string | null
          proveedor_id?: string
          referencia?: string | null
          verificado_at?: string | null
          verificado_notas?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_marca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedores_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "pagos_proveedores_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_item_modificadores: {
        Row: {
          created_at: string | null
          descripcion: string
          id: string
          pedido_item_id: string
          precio_extra: number | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          id?: string
          pedido_item_id: string
          precio_extra?: number | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          id?: string
          pedido_item_id?: string
          precio_extra?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_item_modificadores_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_item_modificadores_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_items_base"
            referencedColumns: ["item_id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          articulo_id: string | null
          articulo_tipo: string | null
          cantidad: number
          categoria_carta_id: string | null
          created_at: string | null
          estacion: string
          estado: string | null
          id: string
          item_carta_id: string
          nombre: string
          notas: string | null
          pedido_id: string
          precio_referencia: number | null
          precio_unitario: number
          promocion_id: string | null
          promocion_item_id: string | null
          subtotal: number
        }
        Insert: {
          articulo_id?: string | null
          articulo_tipo?: string | null
          cantidad?: number
          categoria_carta_id?: string | null
          created_at?: string | null
          estacion: string
          estado?: string | null
          id?: string
          item_carta_id: string
          nombre: string
          notas?: string | null
          pedido_id: string
          precio_referencia?: number | null
          precio_unitario: number
          promocion_id?: string | null
          promocion_item_id?: string | null
          subtotal: number
        }
        Update: {
          articulo_id?: string | null
          articulo_tipo?: string | null
          cantidad?: number
          categoria_carta_id?: string | null
          created_at?: string | null
          estacion?: string
          estado?: string | null
          id?: string
          item_carta_id?: string
          nombre?: string
          notas?: string | null
          pedido_id?: string
          precio_referencia?: number | null
          precio_unitario?: number
          promocion_id?: string | null
          promocion_item_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_categoria_carta_id_fkey"
            columns: ["categoria_carta_id"]
            isOneToOne: false
            referencedRelation: "menu_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedido_items_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_promocion_item_id_fkey"
            columns: ["promocion_item_id"]
            isOneToOne: false
            referencedRelation: "promocion_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_pagos: {
        Row: {
          conciliado: boolean | null
          conciliado_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          metodo: string
          monto: number
          monto_recibido: number | null
          mp_payment_id: string | null
          pedido_id: string
          tarjeta_marca: string | null
          tarjeta_ultimos_4: string | null
          transferencia_referencia: string | null
          vuelto: number | null
        }
        Insert: {
          conciliado?: boolean | null
          conciliado_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metodo: string
          monto: number
          monto_recibido?: number | null
          mp_payment_id?: string | null
          pedido_id: string
          tarjeta_marca?: string | null
          tarjeta_ultimos_4?: string | null
          transferencia_referencia?: string | null
          vuelto?: number | null
        }
        Update: {
          conciliado?: boolean | null
          conciliado_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metodo?: string
          monto?: number
          monto_recibido?: number | null
          mp_payment_id?: string | null
          pedido_id?: string
          tarjeta_marca?: string | null
          tarjeta_ultimos_4?: string | null
          transferencia_referencia?: string | null
          vuelto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_pagos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_pagos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      pedido_payment_edits: {
        Row: {
          created_at: string
          editado_por: string
          id: string
          motivo: string
          pagos_antes: Json
          pagos_despues: Json
          pedido_id: string
        }
        Insert: {
          created_at?: string
          editado_por: string
          id?: string
          motivo: string
          pagos_antes: Json
          pagos_despues: Json
          pedido_id: string
        }
        Update: {
          created_at?: string
          editado_por?: string
          id?: string
          motivo?: string
          pagos_antes?: Json
          pagos_despues?: Json
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_payment_edits_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_payment_edits_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      pedidos: {
        Row: {
          branch_id: string
          cadete_id: string | null
          canal_app: string | null
          canal_venta: string | null
          cliente_direccion: string | null
          cliente_email: string | null
          cliente_nombre: string | null
          cliente_notas: string | null
          cliente_telefono: string | null
          cliente_user_id: string | null
          costo_delivery: number | null
          created_at: string | null
          created_by: string | null
          delivery_address: string | null
          delivery_distance_km: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_neighborhood: string | null
          delivery_zone_id: string | null
          descuento: number | null
          descuento_motivo: string | null
          direccion_entrega: string | null
          estado: string
          factura_cae: string | null
          factura_cuit: string | null
          factura_numero: string | null
          factura_razon_social: string | null
          factura_vencimiento_cae: string | null
          id: string
          mp_payment_intent_id: string | null
          numero_llamador: number | null
          numero_pedido: number
          origen: string | null
          pago_estado: string | null
          pago_online_id: string | null
          propina: number
          requiere_factura: boolean | null
          subtotal: number
          tiempo_confirmado: string | null
          tiempo_en_camino: string | null
          tiempo_entregado: string | null
          tiempo_inicio_prep: string | null
          tiempo_listo: string | null
          tiempo_prometido: string | null
          tipo: string
          tipo_factura: string | null
          tipo_servicio: string | null
          total: number
          webapp_tracking_code: string | null
        }
        Insert: {
          branch_id: string
          cadete_id?: string | null
          canal_app?: string | null
          canal_venta?: string | null
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_nombre?: string | null
          cliente_notas?: string | null
          cliente_telefono?: string | null
          cliente_user_id?: string | null
          costo_delivery?: number | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          delivery_distance_km?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_neighborhood?: string | null
          delivery_zone_id?: string | null
          descuento?: number | null
          descuento_motivo?: string | null
          direccion_entrega?: string | null
          estado?: string
          factura_cae?: string | null
          factura_cuit?: string | null
          factura_numero?: string | null
          factura_razon_social?: string | null
          factura_vencimiento_cae?: string | null
          id?: string
          mp_payment_intent_id?: string | null
          numero_llamador?: number | null
          numero_pedido: number
          origen?: string | null
          pago_estado?: string | null
          pago_online_id?: string | null
          propina?: number
          requiere_factura?: boolean | null
          subtotal: number
          tiempo_confirmado?: string | null
          tiempo_en_camino?: string | null
          tiempo_entregado?: string | null
          tiempo_inicio_prep?: string | null
          tiempo_listo?: string | null
          tiempo_prometido?: string | null
          tipo: string
          tipo_factura?: string | null
          tipo_servicio?: string | null
          total: number
          webapp_tracking_code?: string | null
        }
        Update: {
          branch_id?: string
          cadete_id?: string | null
          canal_app?: string | null
          canal_venta?: string | null
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_nombre?: string | null
          cliente_notas?: string | null
          cliente_telefono?: string | null
          cliente_user_id?: string | null
          costo_delivery?: number | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          delivery_distance_km?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_neighborhood?: string | null
          delivery_zone_id?: string | null
          descuento?: number | null
          descuento_motivo?: string | null
          direccion_entrega?: string | null
          estado?: string
          factura_cae?: string | null
          factura_cuit?: string | null
          factura_numero?: string | null
          factura_razon_social?: string | null
          factura_vencimiento_cae?: string | null
          id?: string
          mp_payment_intent_id?: string | null
          numero_llamador?: number | null
          numero_pedido?: number
          origen?: string | null
          pago_estado?: string | null
          pago_online_id?: string | null
          propina?: number
          requiere_factura?: boolean | null
          subtotal?: number
          tiempo_confirmado?: string | null
          tiempo_en_camino?: string | null
          tiempo_entregado?: string | null
          tiempo_inicio_prep?: string | null
          tiempo_listo?: string | null
          tiempo_prometido?: string | null
          tipo?: string
          tipo_factura?: string | null
          tipo_servicio?: string | null
          total?: number
          webapp_tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos: {
        Row: {
          aprobado_por: string | null
          branch_id: string
          cerrado_por: string | null
          created_at: string | null
          estado: string | null
          fecha_aprobacion: string | null
          fecha_cierre: string | null
          fecha_reapertura: string | null
          id: string
          motivo_cierre: string | null
          motivo_reapertura: string | null
          observaciones: string | null
          periodo: string
          reabierto_por: string | null
          updated_at: string | null
        }
        Insert: {
          aprobado_por?: string | null
          branch_id: string
          cerrado_por?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_cierre?: string | null
          fecha_reapertura?: string | null
          id?: string
          motivo_cierre?: string | null
          motivo_reapertura?: string | null
          observaciones?: string | null
          periodo: string
          reabierto_por?: string | null
          updated_at?: string | null
        }
        Update: {
          aprobado_por?: string | null
          branch_id?: string
          cerrado_por?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_cierre?: string | null
          fecha_reapertura?: string | null
          id?: string
          motivo_cierre?: string | null
          motivo_reapertura?: string | null
          observaciones?: string | null
          periodo?: string
          reabierto_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_editable: boolean | null
          key: string
          label: string
          scope: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_editable?: boolean | null
          key: string
          label: string
          scope: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_editable?: boolean | null
          key?: string
          label?: string
          scope?: string
        }
        Relationships: []
      }
      pos_config: {
        Row: {
          acepta_credito: boolean | null
          acepta_debito: boolean | null
          acepta_efectivo: boolean | null
          acepta_mercadopago: boolean | null
          acepta_transferencia: boolean | null
          afip_cuit: string | null
          afip_punto_venta: number | null
          alertar_stock_critico: boolean | null
          alertar_stock_minimo: boolean | null
          branch_id: string
          costo_delivery_default: number | null
          delivery_habilitado: boolean | null
          facturacion_habilitada: boolean | null
          id: string
          impresora_caja_ip: string | null
          impresora_cocina_ip: string | null
          llamador_max: number | null
          llamador_min: number | null
          llamadores_habilitados: boolean | null
          pos_enabled: boolean | null
          radio_delivery_km: number | null
          tiempo_preparacion_default: number | null
          updated_at: string | null
        }
        Insert: {
          acepta_credito?: boolean | null
          acepta_debito?: boolean | null
          acepta_efectivo?: boolean | null
          acepta_mercadopago?: boolean | null
          acepta_transferencia?: boolean | null
          afip_cuit?: string | null
          afip_punto_venta?: number | null
          alertar_stock_critico?: boolean | null
          alertar_stock_minimo?: boolean | null
          branch_id: string
          costo_delivery_default?: number | null
          delivery_habilitado?: boolean | null
          facturacion_habilitada?: boolean | null
          id?: string
          impresora_caja_ip?: string | null
          impresora_cocina_ip?: string | null
          llamador_max?: number | null
          llamador_min?: number | null
          llamadores_habilitados?: boolean | null
          pos_enabled?: boolean | null
          radio_delivery_km?: number | null
          tiempo_preparacion_default?: number | null
          updated_at?: string | null
        }
        Update: {
          acepta_credito?: boolean | null
          acepta_debito?: boolean | null
          acepta_efectivo?: boolean | null
          acepta_mercadopago?: boolean | null
          acepta_transferencia?: boolean | null
          afip_cuit?: string | null
          afip_punto_venta?: number | null
          alertar_stock_critico?: boolean | null
          alertar_stock_minimo?: boolean | null
          branch_id?: string
          costo_delivery_default?: number | null
          delivery_habilitado?: boolean | null
          facturacion_habilitada?: boolean | null
          id?: string
          impresora_caja_ip?: string | null
          impresora_cocina_ip?: string | null
          llamador_max?: number | null
          llamador_min?: number | null
          llamadores_habilitados?: boolean | null
          pos_enabled?: boolean | null
          radio_delivery_km?: number | null
          tiempo_preparacion_default?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      preparacion_ingredientes: {
        Row: {
          cantidad: number
          created_at: string | null
          id: string
          insumo_id: string | null
          orden: number | null
          preparacion_id: string
          sub_preparacion_id: string | null
          unidad: string
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          orden?: number | null
          preparacion_id: string
          sub_preparacion_id?: string | null
          unidad?: string
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          orden?: number | null
          preparacion_id?: string
          sub_preparacion_id?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparacion_ingredientes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparacion_ingredientes_preparacion_id_fkey"
            columns: ["preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparacion_ingredientes_sub_preparacion_id_fkey"
            columns: ["sub_preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      preparacion_opciones: {
        Row: {
          created_at: string | null
          id: string
          insumo_id: string
          orden: number | null
          preparacion_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          insumo_id: string
          orden?: number | null
          preparacion_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          insumo_id?: string
          orden?: number | null
          preparacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparacion_opciones_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparacion_opciones_preparacion_id_fkey"
            columns: ["preparacion_id"]
            isOneToOne: false
            referencedRelation: "preparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      preparaciones: {
        Row: {
          categoria_preparacion_id: string | null
          costo_calculado: number | null
          costo_manual: number | null
          created_at: string | null
          deleted_at: string | null
          descripcion: string | null
          fc_objetivo_extra: number | null
          id: string
          is_active: boolean | null
          is_interchangeable: boolean | null
          metodo_costeo: string | null
          nombre: string
          precio_extra: number | null
          puede_ser_extra: boolean
          tipo: string
          updated_at: string | null
        }
        Insert: {
          categoria_preparacion_id?: string | null
          costo_calculado?: number | null
          costo_manual?: number | null
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          fc_objetivo_extra?: number | null
          id?: string
          is_active?: boolean | null
          is_interchangeable?: boolean | null
          metodo_costeo?: string | null
          nombre: string
          precio_extra?: number | null
          puede_ser_extra?: boolean
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          categoria_preparacion_id?: string | null
          costo_calculado?: number | null
          costo_manual?: number | null
          created_at?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          fc_objetivo_extra?: number | null
          id?: string
          is_active?: boolean | null
          is_interchangeable?: boolean | null
          metodo_costeo?: string | null
          nombre?: string
          precio_extra?: number | null
          puede_ser_extra?: boolean
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preparaciones_categoria_preparacion_id_fkey"
            columns: ["categoria_preparacion_id"]
            isOneToOne: false
            referencedRelation: "categorias_preparacion"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string
          id: string
          item_carta_id: string
          precio: number
          price_list_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_carta_id: string
          precio: number
          price_list_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_carta_id?: string
          precio?: number
          price_list_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          mirror_channel: string | null
          name: string
          pricing_mode: string
          pricing_value: number
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          mirror_channel?: string | null
          name: string
          pricing_mode?: string
          pricing_value?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          mirror_channel?: string | null
          name?: string
          pricing_mode?: string
          pricing_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      print_config: {
        Row: {
          backup_enabled: boolean
          backup_printer_id: string | null
          branch_id: string
          comanda_printer_id: string | null
          delivery_enabled: boolean
          delivery_printer_id: string | null
          id: string
          no_salon_todo_en_comanda: boolean
          reprint_requires_pin: boolean
          salon_vales_enabled: boolean
          ticket_enabled: boolean
          ticket_printer_id: string | null
          ticket_trigger: string
          updated_at: string
          vale_printer_id: string | null
        }
        Insert: {
          backup_enabled?: boolean
          backup_printer_id?: string | null
          branch_id: string
          comanda_printer_id?: string | null
          delivery_enabled?: boolean
          delivery_printer_id?: string | null
          id?: string
          no_salon_todo_en_comanda?: boolean
          reprint_requires_pin?: boolean
          salon_vales_enabled?: boolean
          ticket_enabled?: boolean
          ticket_printer_id?: string | null
          ticket_trigger?: string
          updated_at?: string
          vale_printer_id?: string | null
        }
        Update: {
          backup_enabled?: boolean
          backup_printer_id?: string | null
          branch_id?: string
          comanda_printer_id?: string | null
          delivery_enabled?: boolean
          delivery_printer_id?: string | null
          id?: string
          no_salon_todo_en_comanda?: boolean
          reprint_requires_pin?: boolean
          salon_vales_enabled?: boolean
          ticket_enabled?: boolean
          ticket_printer_id?: string | null
          ticket_trigger?: string
          updated_at?: string
          vale_printer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_config_backup_printer_id_fkey"
            columns: ["backup_printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_config_comanda_printer_id_fkey"
            columns: ["comanda_printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_config_delivery_printer_id_fkey"
            columns: ["delivery_printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_config_ticket_printer_id_fkey"
            columns: ["ticket_printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_config_vale_printer_id_fkey"
            columns: ["vale_printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          attempts: number
          branch_id: string
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          payload: Json
          pedido_id: string | null
          printer_id: string
          status: string
        }
        Insert: {
          attempts?: number
          branch_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          payload?: Json
          pedido_id?: string | null
          printer_id: string
          status?: string
        }
        Update: {
          attempts?: number
          branch_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          payload?: Json
          pedido_id?: string | null
          printer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "print_jobs_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "branch_printers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          cbu: string | null
          clock_pin: string | null
          created_at: string
          cuit: string | null
          default_address: string | null
          default_address_lat: number | null
          default_address_lng: number | null
          dni: string | null
          dni_back_url: string | null
          dni_front_url: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          favorite_branch_id: string | null
          full_name: string
          help_dismissed_pages: string[] | null
          id: string
          internal_notes: Json | null
          invitation_token: string | null
          is_active: boolean
          last_order_at: string | null
          loyalty_points: number | null
          onboarding_completed_at: string | null
          phone: string | null
          pin_hash: string | null
          preferencia_pago: string | null
          show_floating_help: boolean | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cbu?: string | null
          clock_pin?: string | null
          created_at?: string
          cuit?: string | null
          default_address?: string | null
          default_address_lat?: number | null
          default_address_lng?: number | null
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          favorite_branch_id?: string | null
          full_name: string
          help_dismissed_pages?: string[] | null
          id?: string
          internal_notes?: Json | null
          invitation_token?: string | null
          is_active?: boolean
          last_order_at?: string | null
          loyalty_points?: number | null
          onboarding_completed_at?: string | null
          phone?: string | null
          pin_hash?: string | null
          preferencia_pago?: string | null
          show_floating_help?: boolean | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cbu?: string | null
          clock_pin?: string | null
          created_at?: string
          cuit?: string | null
          default_address?: string | null
          default_address_lat?: number | null
          default_address_lng?: number | null
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          favorite_branch_id?: string | null
          full_name?: string
          help_dismissed_pages?: string[] | null
          id?: string
          internal_notes?: Json | null
          invitation_token?: string | null
          is_active?: boolean
          last_order_at?: string | null
          loyalty_points?: number | null
          onboarding_completed_at?: string | null
          phone?: string | null
          pin_hash?: string | null
          preferencia_pago?: string | null
          show_floating_help?: boolean | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_favorite_branch_id_fkey"
            columns: ["favorite_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_favorite_branch_id_fkey"
            columns: ["favorite_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      promocion_item_extras: {
        Row: {
          cantidad: number
          created_at: string | null
          extra_item_carta_id: string
          id: string
          promocion_item_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          extra_item_carta_id: string
          id?: string
          promocion_item_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          extra_item_carta_id?: string
          id?: string
          promocion_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocion_item_extras_extra_item_carta_id_fkey"
            columns: ["extra_item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_item_extras_extra_item_carta_id_fkey"
            columns: ["extra_item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_item_extras_promocion_item_id_fkey"
            columns: ["promocion_item_id"]
            isOneToOne: false
            referencedRelation: "promocion_items"
            referencedColumns: ["id"]
          },
        ]
      }
      promocion_items: {
        Row: {
          created_at: string | null
          id: string
          item_carta_id: string
          precio_promo: number
          promocion_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_carta_id: string
          precio_promo: number
          promocion_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_carta_id?: string
          precio_promo?: number
          promocion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocion_items_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_items_item_carta_id_fkey"
            columns: ["item_carta_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocion_items_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["id"]
          },
        ]
      }
      promociones: {
        Row: {
          aplica_a: string
          branch_ids: string[] | null
          brand_id: string | null
          canales: string[] | null
          categoria_ids: string[] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          dias_semana: number[] | null
          fecha_fin: string | null
          fecha_inicio: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          is_active: boolean
          nombre: string
          producto_ids: string[] | null
          restriccion_pago: string
          tipo: string
          tipo_usuario: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          aplica_a?: string
          branch_ids?: string[] | null
          brand_id?: string | null
          canales?: string[] | null
          categoria_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          dias_semana?: number[] | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          is_active?: boolean
          nombre: string
          producto_ids?: string[] | null
          restriccion_pago?: string
          tipo: string
          tipo_usuario?: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          aplica_a?: string
          branch_ids?: string[] | null
          brand_id?: string | null
          canales?: string[] | null
          categoria_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          dias_semana?: number[] | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          is_active?: boolean
          nombre?: string
          producto_ids?: string[] | null
          restriccion_pago?: string
          tipo?: string
          tipo_usuario?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      proveedor_condiciones_local: {
        Row: {
          branch_id: string
          created_at: string
          descuento_pago_contado: number | null
          dias_pago_habitual: number | null
          id: string
          observaciones: string | null
          permite_cuenta_corriente: boolean
          proveedor_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          descuento_pago_contado?: number | null
          dias_pago_habitual?: number | null
          id?: string
          observaciones?: string | null
          permite_cuenta_corriente?: boolean
          proveedor_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          descuento_pago_contado?: number | null
          dias_pago_habitual?: number | null
          id?: string
          observaciones?: string | null
          permite_cuenta_corriente?: boolean
          proveedor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proveedor_condiciones_local_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_condiciones_local_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedor_condiciones_local_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_proveedores"
            referencedColumns: ["proveedor_id"]
          },
          {
            foreignKeyName: "proveedor_condiciones_local_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          alias_cbu: string | null
          ambito: string
          banco: string | null
          branch_id: string | null
          cbu: string | null
          contacto: string | null
          contacto_secundario: string | null
          created_at: string | null
          created_by: string | null
          cuit: string | null
          deleted_at: string | null
          descuento_pago_contado: number | null
          dias_pago_habitual: number | null
          direccion: string | null
          email: string | null
          id: string
          is_active: boolean | null
          medios_pago_aceptados: Json | null
          numero_cuenta: string | null
          observaciones: string | null
          permite_cuenta_corriente: boolean | null
          razon_social: string
          rdo_categories_default: string[] | null
          telefono: string | null
          telefono_secundario: string | null
          tipo_especial: string | null
          tipo_proveedor: string[] | null
          titular_cuenta: string | null
          updated_at: string | null
        }
        Insert: {
          alias_cbu?: string | null
          ambito?: string
          banco?: string | null
          branch_id?: string | null
          cbu?: string | null
          contacto?: string | null
          contacto_secundario?: string | null
          created_at?: string | null
          created_by?: string | null
          cuit?: string | null
          deleted_at?: string | null
          descuento_pago_contado?: number | null
          dias_pago_habitual?: number | null
          direccion?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          medios_pago_aceptados?: Json | null
          numero_cuenta?: string | null
          observaciones?: string | null
          permite_cuenta_corriente?: boolean | null
          razon_social: string
          rdo_categories_default?: string[] | null
          telefono?: string | null
          telefono_secundario?: string | null
          tipo_especial?: string | null
          tipo_proveedor?: string[] | null
          titular_cuenta?: string | null
          updated_at?: string | null
        }
        Update: {
          alias_cbu?: string | null
          ambito?: string
          banco?: string | null
          branch_id?: string | null
          cbu?: string | null
          contacto?: string | null
          contacto_secundario?: string | null
          created_at?: string | null
          created_by?: string | null
          cuit?: string | null
          deleted_at?: string | null
          descuento_pago_contado?: number | null
          dias_pago_habitual?: number | null
          direccion?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          medios_pago_aceptados?: Json | null
          numero_cuenta?: string | null
          observaciones?: string | null
          permite_cuenta_corriente?: boolean | null
          razon_social?: string
          rdo_categories_default?: string[] | null
          telefono?: string | null
          telefono_secundario?: string | null
          tipo_especial?: string | null
          tipo_proveedor?: string[] | null
          titular_cuenta?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: []
      }
      rdo_categories: {
        Row: {
          allowed_item_types: string[] | null
          behavior: string
          code: string
          created_at: string | null
          is_active: boolean
          level: number
          name: string
          parent_code: string | null
          rdo_section: string
          sort_order: number
        }
        Insert: {
          allowed_item_types?: string[] | null
          behavior: string
          code: string
          created_at?: string | null
          is_active?: boolean
          level: number
          name: string
          parent_code?: string | null
          rdo_section: string
          sort_order?: number
        }
        Update: {
          allowed_item_types?: string[] | null
          behavior?: string
          code?: string
          created_at?: string | null
          is_active?: boolean
          level?: number
          name?: string
          parent_code?: string | null
          rdo_section?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rdo_categories_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      rdo_movimientos: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          datos_extra: Json | null
          deleted_at: string | null
          descripcion: string | null
          id: string
          monto: number
          origen: string
          periodo: string
          rdo_category_code: string
          source_id: string | null
          source_table: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          datos_extra?: Json | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          monto?: number
          origen: string
          periodo: string
          rdo_category_code: string
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          datos_extra?: Json | null
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          monto?: number
          origen?: string
          periodo?: string
          rdo_category_code?: string
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rdo_movimientos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_movimientos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_movimientos_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      regulation_signatures: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          regulation_id: string
          regulation_version: number | null
          signed_at: string
          signed_document_url: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          regulation_id: string
          regulation_version?: number | null
          signed_at?: string
          signed_document_url: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          regulation_id?: string
          regulation_version?: number | null
          signed_at?: string
          signed_document_url?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulation_signatures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_signatures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_signatures_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string
          effective_date: string
          id: string
          is_active: boolean
          pdf_url: string | null
          published_at: string | null
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url: string
          effective_date?: string
          id?: string
          is_active?: boolean
          pdf_url?: string | null
          published_at?: string | null
          title?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          pdf_url?: string | null
          published_at?: string | null
          title?: string
          version?: number
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          display_name: string
          hierarchy_level: number
          id: string
          is_system: boolean
          key: string
          scope: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          hierarchy_level?: number
          id?: string
          is_system?: boolean
          key: string
          scope: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          hierarchy_level?: number
          id?: string
          is_system?: boolean
          key?: string
          scope?: string
        }
        Relationships: []
      }
      salary_advances: {
        Row: {
          amount: number
          authorized_at: string | null
          authorized_by: string | null
          branch_id: string
          created_at: string | null
          created_by: string | null
          deducted_at: string | null
          deducted_in_payroll_id: string | null
          employee_id: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string
          reason: string | null
          shift_id: string | null
          status: string
          transfer_reference: string | null
          transferred_at: string | null
          transferred_by: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          authorized_at?: string | null
          authorized_by?: string | null
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          deducted_at?: string | null
          deducted_in_payroll_id?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method: string
          reason?: string | null
          shift_id?: string | null
          status?: string
          transfer_reference?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          authorized_at?: string | null
          authorized_by?: string | null
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          deducted_at?: string | null
          deducted_in_payroll_id?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string
          reason?: string | null
          shift_id?: string | null
          status?: string
          transfer_reference?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_requests: {
        Row: {
          absence_type: string | null
          branch_id: string
          created_at: string | null
          evidence_url: string | null
          id: string
          reason: string | null
          request_date: string
          request_type: string
          responded_at: string | null
          responded_by: string | null
          response_note: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          absence_type?: string | null
          branch_id: string
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          reason?: string | null
          request_date: string
          request_type: string
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          absence_type?: string | null
          branch_id?: string
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          reason?: string | null
          request_date?: string
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_closures: {
        Row: {
          arqueo_caja: Json | null
          branch_id: string
          cerrado_at: string
          cerrado_por: string
          diferencia_apps: number | null
          diferencia_posnet: number | null
          facturacion_diferencia: number
          facturacion_esperada: number
          fecha: string
          fuente: string | null
          hamburguesas: Json
          id: string
          notas: string | null
          tiene_alerta_apps: boolean | null
          tiene_alerta_caja: boolean | null
          tiene_alerta_facturacion: boolean
          tiene_alerta_posnet: boolean | null
          total_digital: number
          total_efectivo: number
          total_facturado: number
          total_hamburguesas: number
          total_vendido: number
          turno: string
          updated_at: string | null
          updated_by: string | null
          ventas_apps: Json
          ventas_local: Json
        }
        Insert: {
          arqueo_caja?: Json | null
          branch_id: string
          cerrado_at?: string
          cerrado_por: string
          diferencia_apps?: number | null
          diferencia_posnet?: number | null
          facturacion_diferencia?: number
          facturacion_esperada?: number
          fecha: string
          fuente?: string | null
          hamburguesas?: Json
          id?: string
          notas?: string | null
          tiene_alerta_apps?: boolean | null
          tiene_alerta_caja?: boolean | null
          tiene_alerta_facturacion?: boolean
          tiene_alerta_posnet?: boolean | null
          total_digital?: number
          total_efectivo?: number
          total_facturado?: number
          total_hamburguesas?: number
          total_vendido?: number
          turno: string
          updated_at?: string | null
          updated_by?: string | null
          ventas_apps?: Json
          ventas_local?: Json
        }
        Update: {
          arqueo_caja?: Json | null
          branch_id?: string
          cerrado_at?: string
          cerrado_por?: string
          diferencia_apps?: number | null
          diferencia_posnet?: number | null
          facturacion_diferencia?: number
          facturacion_esperada?: number
          fecha?: string
          fuente?: string | null
          hamburguesas?: Json
          id?: string
          notas?: string | null
          tiene_alerta_apps?: boolean | null
          tiene_alerta_caja?: boolean | null
          tiene_alerta_facturacion?: boolean
          tiene_alerta_posnet?: boolean | null
          total_digital?: number
          total_efectivo?: number
          total_facturado?: number
          total_hamburguesas?: number
          total_vendido?: number
          turno?: string
          updated_at?: string | null
          updated_by?: string | null
          ventas_apps?: Json
          ventas_local?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shift_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      socios: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          cuit: string | null
          deleted_at: string | null
          email: string | null
          fecha_ingreso: string
          fecha_salida: string | null
          id: string
          is_active: boolean | null
          limite_retiro_mensual: number | null
          nombre: string
          porcentaje_participacion: number
          telefono: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          cuit?: string | null
          deleted_at?: string | null
          email?: string | null
          fecha_ingreso: string
          fecha_salida?: string | null
          id?: string
          is_active?: boolean | null
          limite_retiro_mensual?: number | null
          nombre: string
          porcentaje_participacion: number
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          cuit?: string | null
          deleted_at?: string | null
          email?: string | null
          fecha_ingreso?: string
          fecha_salida?: string | null
          id?: string
          is_active?: boolean | null
          limite_retiro_mensual?: number | null
          nombre?: string
          porcentaje_participacion?: number
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socios_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      special_days: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          day_date: string
          day_type: string
          description: string
          id: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_date: string
          day_type: string
          description: string
          id?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_date?: string
          day_type?: string
          description?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_days_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_days_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          branch_id: string
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id: string
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      station_competencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          station_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          station_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_competencies_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "work_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_actual: {
        Row: {
          branch_id: string
          cantidad: number
          id: string
          insumo_id: string
          stock_critico: number | null
          stock_critico_local: number | null
          stock_minimo: number | null
          stock_minimo_local: number | null
          unidad: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          cantidad?: number
          id?: string
          insumo_id: string
          stock_critico?: number | null
          stock_critico_local?: number | null
          stock_minimo?: number | null
          stock_minimo_local?: number | null
          unidad: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          cantidad?: number
          id?: string
          insumo_id?: string
          stock_critico?: number | null
          stock_critico_local?: number | null
          stock_minimo?: number | null
          stock_minimo_local?: number | null
          unidad?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_actual_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_actual_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_actual_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_cierre_mensual: {
        Row: {
          branch_id: string
          compras: number
          consumo_ventas: number
          created_at: string | null
          created_by: string | null
          id: string
          insumo_id: string
          merma: number
          periodo: string
          stock_apertura: number
          stock_cierre_fisico: number
          stock_esperado: number
        }
        Insert: {
          branch_id: string
          compras?: number
          consumo_ventas?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          insumo_id: string
          merma?: number
          periodo: string
          stock_apertura?: number
          stock_cierre_fisico: number
          stock_esperado?: number
        }
        Update: {
          branch_id?: string
          compras?: number
          consumo_ventas?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          insumo_id?: string
          merma?: number
          periodo?: string
          stock_apertura?: number
          stock_cierre_fisico?: number
          stock_esperado?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_cierre_mensual_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_cierre_mensual_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_cierre_mensual_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_conteo_items: {
        Row: {
          conteo_id: string
          costo_unitario: number
          diferencia: number | null
          id: string
          insumo_id: string
          stock_real: number | null
          stock_teorico: number
          valor_diferencia: number | null
        }
        Insert: {
          conteo_id: string
          costo_unitario?: number
          diferencia?: number | null
          id?: string
          insumo_id: string
          stock_real?: number | null
          stock_teorico?: number
          valor_diferencia?: number | null
        }
        Update: {
          conteo_id?: string
          costo_unitario?: number
          diferencia?: number | null
          id?: string
          insumo_id?: string
          stock_real?: number | null
          stock_teorico?: number
          valor_diferencia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_conteo_items_conteo_id_fkey"
            columns: ["conteo_id"]
            isOneToOne: false
            referencedRelation: "stock_conteos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_conteo_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_conteos: {
        Row: {
          branch_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          nota_general: string | null
          periodo: string | null
          resumen: Json | null
          status: string
        }
        Insert: {
          branch_id: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          fecha: string
          id?: string
          nota_general?: string | null
          periodo?: string | null
          resumen?: Json | null
          status?: string
        }
        Update: {
          branch_id?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          nota_general?: string | null
          periodo?: string | null
          resumen?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_conteos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_conteos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movimientos: {
        Row: {
          branch_id: string
          cantidad: number
          cantidad_anterior: number
          cantidad_nueva: number
          created_at: string | null
          created_by: string | null
          factura_proveedor_id: string | null
          id: string
          insumo_id: string
          motivo: string | null
          nota: string | null
          pedido_id: string | null
          tipo: string
        }
        Insert: {
          branch_id: string
          cantidad: number
          cantidad_anterior: number
          cantidad_nueva: number
          created_at?: string | null
          created_by?: string | null
          factura_proveedor_id?: string | null
          id?: string
          insumo_id: string
          motivo?: string | null
          nota?: string | null
          pedido_id?: string | null
          tipo: string
        }
        Update: {
          branch_id?: string
          cantidad?: number
          cantidad_anterior?: number
          cantidad_nueva?: number
          created_at?: string | null
          created_by?: string | null
          factura_proveedor_id?: string | null
          id?: string
          insumo_id?: string
          motivo?: string | null
          nota?: string | null
          pedido_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movimientos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_factura_proveedor_id_fkey"
            columns: ["factura_proveedor_id"]
            isOneToOne: false
            referencedRelation: "cuenta_corriente_marca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_factura_proveedor_id_fkey"
            columns: ["factura_proveedor_id"]
            isOneToOne: false
            referencedRelation: "facturas_proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movimientos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      turnos_caja: {
        Row: {
          apertura_at: string
          branch_id: string
          cajero_id: string
          cierre_at: string | null
          diferencia: number | null
          diferencia_motivo: string | null
          efectivo_contado: number | null
          estado: string | null
          fondo_apertura: number
          id: string
          retiros_efectivo: number | null
          total_efectivo: number | null
          total_mercadopago: number | null
          total_tarjeta_credito: number | null
          total_tarjeta_debito: number | null
          total_transferencia: number | null
          total_ventas: number | null
        }
        Insert: {
          apertura_at?: string
          branch_id: string
          cajero_id: string
          cierre_at?: string | null
          diferencia?: number | null
          diferencia_motivo?: string | null
          efectivo_contado?: number | null
          estado?: string | null
          fondo_apertura: number
          id?: string
          retiros_efectivo?: number | null
          total_efectivo?: number | null
          total_mercadopago?: number | null
          total_tarjeta_credito?: number | null
          total_tarjeta_debito?: number | null
          total_transferencia?: number | null
          total_ventas?: number | null
        }
        Update: {
          apertura_at?: string
          branch_id?: string
          cajero_id?: string
          cierre_at?: string | null
          diferencia?: number | null
          diferencia_motivo?: string | null
          efectivo_contado?: number | null
          estado?: string | null
          fondo_apertura?: number
          id?: string
          retiros_efectivo?: number | null
          total_efectivo?: number | null
          total_mercadopago?: number | null
          total_tarjeta_credito?: number | null
          total_tarjeta_debito?: number | null
          total_transferencia?: number | null
          total_ventas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_caja_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_caja_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_roles: {
        Row: {
          branch_id: string
          clock_pin: string | null
          created_at: string | null
          default_position: string | null
          id: string
          is_active: boolean | null
          local_role: Database["public"]["Enums"]["local_role_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          clock_pin?: string | null
          created_at?: string | null
          default_position?: string | null
          id?: string
          is_active?: boolean | null
          local_role: Database["public"]["Enums"]["local_role_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          clock_pin?: string | null
          created_at?: string | null
          default_position?: string | null
          id?: string
          is_active?: boolean | null
          local_role?: Database["public"]["Enums"]["local_role_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          branch_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          role_id: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_v2: {
        Row: {
          branch_ids: string[] | null
          brand_role: Database["public"]["Enums"]["brand_role_type"] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          local_role: Database["public"]["Enums"]["local_role_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_ids?: string[] | null
          brand_role?: Database["public"]["Enums"]["brand_role_type"] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          local_role?: Database["public"]["Enums"]["local_role_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_ids?: string[] | null
          brand_role?: Database["public"]["Enums"]["brand_role_type"] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          local_role?: Database["public"]["Enums"]["local_role_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ventas_mensuales_local: {
        Row: {
          branch_id: string
          cargado_por: string | null
          created_at: string | null
          deleted_at: string | null
          efectivo: number | null
          fc_total: number
          fecha_carga: string | null
          ft_total: number
          fuente: string
          id: string
          observaciones: string | null
          periodo: string
          porcentaje_ft: number | null
          updated_at: string | null
          venta_total: number | null
        }
        Insert: {
          branch_id: string
          cargado_por?: string | null
          created_at?: string | null
          deleted_at?: string | null
          efectivo?: number | null
          fc_total: number
          fecha_carga?: string | null
          ft_total: number
          fuente?: string
          id?: string
          observaciones?: string | null
          periodo: string
          porcentaje_ft?: number | null
          updated_at?: string | null
          venta_total?: number | null
        }
        Update: {
          branch_id?: string
          cargado_por?: string | null
          created_at?: string | null
          deleted_at?: string | null
          efectivo?: number | null
          fc_total?: number
          fecha_carga?: string | null
          ft_total?: number
          fuente?: string
          id?: string
          observaciones?: string | null
          periodo?: string
          porcentaje_ft?: number | null
          updated_at?: string | null
          venta_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_mensuales_local_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_mensuales_local_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      warnings: {
        Row: {
          acknowledged_at: string | null
          branch_id: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          issued_by: string | null
          signed_document_url: string | null
          user_id: string
          warning_date: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          branch_id: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          signed_document_url?: string | null
          user_id: string
          warning_date?: string
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          branch_id?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          signed_document_url?: string | null
          user_id?: string
          warning_date?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webapp_config: {
        Row: {
          auto_accept_orders: boolean | null
          auto_print_orders: boolean | null
          branch_id: string
          comer_aca_habilitado: boolean
          created_at: string
          delivery_costo: number | null
          delivery_habilitado: boolean
          delivery_pedido_minimo: number | null
          delivery_radio_km: number | null
          estado: string
          horarios: Json | null
          id: string
          mensaje_pausa: string | null
          prep_time_comer_aca: number | null
          prep_time_delivery: number | null
          prep_time_retiro: number | null
          recepcion_modo: string
          retiro_habilitado: boolean
          service_schedules: Json | null
          tiempo_estimado_delivery_min: number | null
          tiempo_estimado_retiro_min: number | null
          updated_at: string
          webapp_activa: boolean
        }
        Insert: {
          auto_accept_orders?: boolean | null
          auto_print_orders?: boolean | null
          branch_id: string
          comer_aca_habilitado?: boolean
          created_at?: string
          delivery_costo?: number | null
          delivery_habilitado?: boolean
          delivery_pedido_minimo?: number | null
          delivery_radio_km?: number | null
          estado?: string
          horarios?: Json | null
          id?: string
          mensaje_pausa?: string | null
          prep_time_comer_aca?: number | null
          prep_time_delivery?: number | null
          prep_time_retiro?: number | null
          recepcion_modo?: string
          retiro_habilitado?: boolean
          service_schedules?: Json | null
          tiempo_estimado_delivery_min?: number | null
          tiempo_estimado_retiro_min?: number | null
          updated_at?: string
          webapp_activa?: boolean
        }
        Update: {
          auto_accept_orders?: boolean | null
          auto_print_orders?: boolean | null
          branch_id?: string
          comer_aca_habilitado?: boolean
          created_at?: string
          delivery_costo?: number | null
          delivery_habilitado?: boolean
          delivery_pedido_minimo?: number | null
          delivery_radio_km?: number | null
          estado?: string
          horarios?: Json | null
          id?: string
          mensaje_pausa?: string | null
          prep_time_comer_aca?: number | null
          prep_time_delivery?: number | null
          prep_time_retiro?: number | null
          recepcion_modo?: string
          retiro_habilitado?: boolean
          service_schedules?: Json | null
          tiempo_estimado_delivery_min?: number | null
          tiempo_estimado_retiro_min?: number | null
          updated_at?: string
          webapp_activa?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webapp_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webapp_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webapp_pedido_mensajes: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          leido: boolean | null
          mensaje: string
          pedido_id: string
          sender_id: string | null
          sender_nombre: string
          sender_type: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          leido?: boolean | null
          mensaje: string
          pedido_id: string
          sender_id?: string | null
          sender_nombre: string
          sender_type: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          leido?: boolean | null
          mensaje?: string
          pedido_id?: string
          sender_id?: string | null
          sender_nombre?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webapp_pedido_mensajes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webapp_pedido_mensajes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webapp_pedido_mensajes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webapp_pedido_mensajes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          subject_type: string
          template_text: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          subject_type: string
          template_text: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          subject_type?: string
          template_text?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      work_positions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_stations: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      balance_socios: {
        Row: {
          branch_id: string | null
          branch_nombre: string | null
          cantidad_movimientos: number | null
          nombre: string | null
          porcentaje_participacion: number | null
          saldo_actual: number | null
          socio_id: string | null
          total_aportes: number | null
          total_devoluciones: number | null
          total_prestamos_dados: number | null
          total_retiros: number | null
          total_utilidades: number | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socios_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      branches_public: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          cover_image_url: string | null
          google_place_id: string | null
          id: string | null
          is_active: boolean | null
          is_open: boolean | null
          latitude: number | null
          local_open_state: boolean | null
          longitude: number | null
          name: string | null
          opening_time: string | null
          public_hours: Json | null
          public_status: string | null
          slug: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          cover_image_url?: string | null
          google_place_id?: string | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          name?: string | null
          opening_time?: string | null
          public_hours?: Json | null
          public_status?: string | null
          slug?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          cover_image_url?: string | null
          google_place_id?: string | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          name?: string | null
          opening_time?: string | null
          public_hours?: Json | null
          public_status?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      cuenta_corriente_marca: {
        Row: {
          branch_id: string | null
          detalle: string | null
          estado_pago: string | null
          factura_fecha: string | null
          factura_numero: string | null
          fecha_vencimiento: string | null
          id: string | null
          local_nombre: string | null
          monto_canon: number | null
          periodo: string | null
          saldo_pendiente: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_proveedores_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cuenta_corriente_proveedores: {
        Row: {
          branch_id: string | null
          cantidad_facturas: number | null
          cuit: string | null
          facturas_pendientes: number | null
          facturas_vencidas: number | null
          monto_vencido: number | null
          proveedor_id: string | null
          proximo_vencimiento: string | null
          razon_social: string | null
          total_facturado: number | null
          total_pagado: number | null
          total_pendiente: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      rdo_multivista_items_base: {
        Row: {
          branch_id: string | null
          canal: string | null
          cantidad: number | null
          categoria_id: string | null
          categoria_nombre: string | null
          costo_total: number | null
          costo_unitario: number | null
          fecha: string | null
          item_id: string | null
          pedido_id: string | null
          producto_id: string | null
          producto_nombre: string | null
          ventas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_item_carta_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "items_carta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_item_carta_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "webapp_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "rdo_multivista_ventas_base"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedidos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_multivista_ventas_base: {
        Row: {
          branch_id: string | null
          canal: string | null
          created_at: string | null
          fecha: string | null
          pedido_id: string | null
          total: number | null
        }
        Insert: {
          branch_id?: string | null
          canal?: never
          created_at?: string | null
          fecha?: never
          pedido_id?: string | null
          total?: never
        }
        Update: {
          branch_id?: string | null
          canal?: never
          created_at?: string | null
          fecha?: never
          pedido_id?: string | null
          total?: never
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rdo_report_data: {
        Row: {
          branch_id: string | null
          periodo: string | null
          rdo_category_code: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rdo_movimientos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_movimientos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rdo_movimientos_rdo_category_code_fkey"
            columns: ["rdo_category_code"]
            isOneToOne: false
            referencedRelation: "rdo_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      webapp_menu_items: {
        Row: {
          categoria_carta_id: string | null
          categoria_nombre: string | null
          categoria_orden: number | null
          descripcion: string | null
          disponible_delivery: boolean | null
          disponible_webapp: boolean | null
          id: string | null
          imagen_url: string | null
          nombre: string | null
          nombre_corto: string | null
          orden: number | null
          precio_base: number | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_carta_categoria_carta_id_fkey"
            columns: ["categoria_carta_id"]
            isOneToOne: false
            referencedRelation: "menu_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_delete_clock_entry: {
        Args: { _entry_id: string }
        Returns: undefined
      }
      admin_update_clock_entry: {
        Args: {
          _created_at?: string
          _entry_id: string
          _entry_type?: string
          _manual_by?: string
          _manual_reason?: string
          _original_created_at?: string
        }
        Returns: undefined
      }
      asignar_llamador: {
        Args: { p_branch_id: string; p_pedido_id: string }
        Returns: number
      }
      can_access_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_close_shift: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_coaching: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_coaching: {
        Args: { _coaching_id: string; _user_id: string }
        Returns: boolean
      }
      create_inspection_with_items: {
        Args: {
          p_branch_id: string
          p_inspection_type: string
          p_inspector_id: string
          p_present_manager_id?: string
        }
        Returns: string
      }
      generar_numero_pedido: { Args: { p_branch_id: string }; Returns: number }
      generar_shift_closure_desde_pos: {
        Args: { p_branch_id: string; p_fecha: string; p_turno: string }
        Returns: string
      }
      generate_z_closing: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: Json
      }
      get_branch_contact_info: {
        Args: { _branch_id: string }
        Returns: {
          email: string
          latitude: number
          longitude: number
          phone: string
        }[]
      }
      get_branch_for_clock: {
        Args: { _clock_code: string }
        Returns: {
          clock_code: string
          id: string
          latitude: number
          longitude: number
          name: string
        }[]
      }
      get_brand_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["brand_role_type"]
      }
      get_cashier_discrepancy_stats: {
        Args: { _branch_id?: string; _user_id: string }
        Returns: {
          discrepancy_this_month: number
          discrepancy_total: number
          last_discrepancy_amount: number
          last_discrepancy_date: string
          perfect_shifts: number
          precision_pct: number
          total_shifts: number
        }[]
      }
      get_dynamic_prep_time: {
        Args: { p_branch_id: string; p_tipo_servicio?: string }
        Returns: {
          active_orders: number
          base_prep_time: number
          prep_time_min: number
        }[]
      }
      get_fiscal_audit_report: {
        Args: {
          p_branch_id: string
          p_from_date?: string
          p_from_z?: number
          p_to_date?: string
          p_to_z?: number
        }
        Returns: Json
      }
      get_fiscal_x_report: {
        Args: { p_branch_id: string; p_date?: string }
        Returns: Json
      }
      get_iibb_alicuota: {
        Args: { _branch_id: string; _fecha?: string }
        Returns: number
      }
      get_local_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["local_role_type"]
      }
      get_local_role_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["local_role_type"]
      }
      get_rdo_financiero: {
        Args: { _branch_id: string; _periodo: string }
        Returns: Json
      }
      get_rdo_multivista: {
        Args: {
          _branch_id: string
          _canales?: string[]
          _categorias?: string[]
          _fecha_desde: string
          _fecha_hasta: string
          _medios?: string[]
          _productos?: string[]
        }
        Returns: Json
      }
      get_rdo_report: {
        Args: { _branch_id: string; _periodo: string }
        Returns: {
          behavior: string
          category_code: string
          category_name: string
          level: number
          parent_code: string
          percentage: number
          rdo_section: string
          sort_order: number
          total: number
        }[]
      }
      get_rdo_unified_report: {
        Args: {
          _branch_id: string
          _canales?: string[]
          _categorias?: string[]
          _medios?: string[]
          _periodo: string
          _productos?: string[]
        }
        Returns: Json
      }
      get_user_branches: {
        Args: { _user_id: string }
        Returns: {
          branch_id: string
          local_role: Database["public"]["Enums"]["local_role_type"]
        }[]
      }
      has_any_brand_role: {
        Args: { _role_keys: string[]; _user_id: string }
        Returns: boolean
      }
      has_any_local_role: {
        Args: { _role_keys: string[]; _user_id: string }
        Returns: boolean
      }
      has_branch_access_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_branch_role: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_financial_access: { Args: { p_branch_id: string }; Returns: boolean }
      has_hr_access: { Args: { p_branch_id: string }; Returns: boolean }
      has_open_shift_at_branch: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role_for_branch: {
        Args: { _branch_id: string; _role_key: string; _user_id: string }
        Returns: boolean
      }
      insert_factura_completa: {
        Args: { p_factura: Json; p_items: Json }
        Returns: string
      }
      is_active_staff: { Args: { _user_id: string }; Returns: boolean }
      is_branch_manager_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_cashier_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_clock_pin_available: {
        Args: { _branch_id: string; _exclude_user_id?: string; _pin: string }
        Returns: boolean
      }
      is_clocked_in_at_branch: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: boolean
      }
      is_financial_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_financial_manager: { Args: { user_uuid: string }; Returns: boolean }
      is_franquiciado_or_contador_for_branch: {
        Args: { p_branch_id: string; p_user_id: string }
        Returns: boolean
      }
      is_hr_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_hr_for_branch_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_hr_manager: { Args: { user_uuid: string }; Returns: boolean }
      is_hr_role: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_socio_admin: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_staff_member: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      liberar_llamador: { Args: { p_pedido_id: string }; Returns: undefined }
      normalize_phone: { Args: { phone: string }; Returns: string }
      normalize_rdo_channel: {
        Args: { _canal_app: string; _canal_venta: string; _tipo: string }
        Returns: string
      }
      normalize_rdo_payment_method: {
        Args: { _metodo: string }
        Returns: string
      }
      obtener_proximo_numero_factura: {
        Args: { _branch_id: string; _tipo: string }
        Returns: number
      }
      recalcular_costo_item_carta: {
        Args: { _item_id: string }
        Returns: undefined
      }
      recalcular_costo_preparacion: {
        Args: { _prep_id: string }
        Returns: number
      }
      recalcular_todos_los_costos: { Args: never; Returns: undefined }
      shares_branch_as_manager: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      sync_orphan_users: {
        Args: never
        Returns: {
          synced_action: string
          synced_email: string
          synced_user_id: string
        }[]
      }
      user_has_access_to_any_branch: {
        Args: { _branch_ids: string[]; _user_id: string }
        Returns: boolean
      }
      user_has_any_role_key: {
        Args: { _role_keys: string[]; _user_id: string }
        Returns: boolean
      }
      user_has_branch_access: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      validate_clock_pin: {
        Args: { _branch_code: string; _pin: string }
        Returns: {
          branch_id: string
          branch_name: string
          full_name: string
          user_id: string
        }[]
      }
      validate_clock_pin_v2: {
        Args: { _branch_code: string; _pin: string }
        Returns: {
          branch_id: string
          branch_name: string
          full_name: string
          user_id: string
        }[]
      }
      validate_invitation_token: {
        Args: { _token: string }
        Returns: {
          branch_id: string
          branch_name: string
          email: string
          expires_at: string
          full_name: string
          id: string
          role: string
          status: string
        }[]
      }
      validate_supervisor_pin: {
        Args: { _branch_id: string; _pin: string }
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
    }
    Enums: {
      brand_role_type:
        | "superadmin"
        | "coordinador"
        | "informes"
        | "contador_marca"
        | "community_manager"
      communication_type: "info" | "warning" | "urgent" | "celebration"
      local_role_type:
        | "franquiciado"
        | "encargado"
        | "contador_local"
        | "cajero"
        | "empleado"
      order_area: "salon" | "mostrador" | "delivery"
      order_type: "takeaway" | "delivery" | "dine_in"
      payment_method:
        | "efectivo"
        | "tarjeta_debito"
        | "tarjeta_credito"
        | "mercadopago_qr"
        | "mercadopago_link"
        | "transferencia"
        | "vales"
      payment_origin: "cash" | "mercadopago" | "bank_transfer" | "credit_card"
      permission_scope: "local" | "brand"
      receipt_type: "OFFICIAL" | "INTERNAL"
      stock_movement_type:
        | "sale"
        | "purchase"
        | "adjustment"
        | "waste"
        | "transfer_in"
        | "transfer_out"
        | "count_adjust"
        | "production"
      supplier_control_type: "brand_only" | "brand_preferred" | "free"
      transaction_type: "income" | "expense"
      work_position_type:
        | "cajero"
        | "cocinero"
        | "barista"
        | "runner"
        | "lavacopas"
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
      brand_role_type: [
        "superadmin",
        "coordinador",
        "informes",
        "contador_marca",
        "community_manager",
      ],
      communication_type: ["info", "warning", "urgent", "celebration"],
      local_role_type: [
        "franquiciado",
        "encargado",
        "contador_local",
        "cajero",
        "empleado",
      ],
      order_area: ["salon", "mostrador", "delivery"],
      order_type: ["takeaway", "delivery", "dine_in"],
      payment_method: [
        "efectivo",
        "tarjeta_debito",
        "tarjeta_credito",
        "mercadopago_qr",
        "mercadopago_link",
        "transferencia",
        "vales",
      ],
      payment_origin: ["cash", "mercadopago", "bank_transfer", "credit_card"],
      permission_scope: ["local", "brand"],
      receipt_type: ["OFFICIAL", "INTERNAL"],
      stock_movement_type: [
        "sale",
        "purchase",
        "adjustment",
        "waste",
        "transfer_in",
        "transfer_out",
        "count_adjust",
        "production",
      ],
      supplier_control_type: ["brand_only", "brand_preferred", "free"],
      transaction_type: ["income", "expense"],
      work_position_type: [
        "cajero",
        "cocinero",
        "barista",
        "runner",
        "lavacopas",
      ],
    },
  },
} as const
