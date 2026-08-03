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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_details: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          delivery_info: string | null
          id: string
          payment_method_name: string | null
          payment_proof_url: string | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_image_url: string | null
          subscription_image_urls: string[]
          subscription_info: string | null
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_details?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          delivery_info?: string | null
          id?: string
          payment_method_name?: string | null
          payment_proof_url?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_image_url?: string | null
          subscription_image_urls?: string[]
          subscription_info?: string | null
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_details?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          delivery_info?: string | null
          id?: string
          payment_method_name?: string | null
          payment_proof_url?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_image_url?: string | null
          subscription_image_urls?: string[]
          subscription_info?: string | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_events: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          name: string
          path: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          name: string
          path?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          name?: string
          path?: string | null
          session_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          duration_ms: number
          id: string
          ip_hash: string | null
          last_ping_at: string
          path: string
          referrer: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number
          id?: string
          ip_hash?: string | null
          last_ping_at?: string
          path: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number
          id?: string
          ip_hash?: string | null
          last_ping_at?: string
          path?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_number: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          note: string | null
          sort_order: number
          tax: number
          updated_at: string
        }
        Insert: {
          account_number: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          note?: string | null
          sort_order?: number
          tax?: number
          updated_at?: string
        }
        Update: {
          account_number?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          note?: string | null
          sort_order?: number
          tax?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_stock: {
        Row: {
          account_details: string
          created_at: string
          id: string
          is_used: boolean
          order_id: string | null
          product_id: string
          used_at: string | null
        }
        Insert: {
          account_details: string
          created_at?: string
          id?: string
          is_used?: boolean
          order_id?: string | null
          product_id: string
          used_at?: string | null
        }
        Update: {
          account_details?: string
          created_at?: string
          id?: string
          is_used?: boolean
          order_id?: string | null
          product_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          activation_images: string[]
          activation_instructions: string | null
          category_id: string | null
          category_slug: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          old_price: number | null
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          activation_images?: string[]
          activation_instructions?: string | null
          category_id?: string | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          old_price?: number | null
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          activation_images?: string[]
          activation_instructions?: string | null
          category_id?: string | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          old_price?: number | null
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      store_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      whatsapp_log: {
        Row: {
          chat_id: string | null
          created_at: string
          id: number
          order_id: string | null
          reason: string | null
          request_id: number | null
          url: string | null
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: number
          order_id?: string | null
          reason?: string | null
          request_id?: number | null
          url?: string | null
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: number
          order_id?: string | null
          reason?: string | null
          request_id?: number | null
          url?: string | null
        }
        Relationships: []
      }
      whatsapp_notified: {
        Row: {
          created_at: string
          order_id: string
        }
        Insert: {
          created_at?: string
          order_id: string
        }
        Update: {
          created_at?: string
          order_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_stock: {
        Args: { _code: string; _lines: string[]; _product_id: string }
        Returns: number
      }
      admin_add_store_image: {
        Args: { _code: string; _image_url: string; _sort_order: number }
        Returns: string
      }
      admin_change_code: {
        Args: { _current: string; _new: string }
        Returns: undefined
      }
      admin_check_code: { Args: { _code: string }; Returns: undefined }
      admin_complete_order_v2: {
        Args: {
          _code: string
          _image_urls: string[]
          _info: string
          _order_id: string
        }
        Returns: undefined
      }
      admin_delete_category: {
        Args: { _code: string; _slug: string }
        Returns: undefined
      }
      admin_delete_order: {
        Args: { _code: string; _order_id: string }
        Returns: undefined
      }
      admin_delete_payment_method: {
        Args: { _code: string; _id: string }
        Returns: undefined
      }
      admin_delete_product: {
        Args: { _code: string; _id: string }
        Returns: undefined
      }
      admin_delete_review: {
        Args: { _code: string; _id: string }
        Returns: undefined
      }
      admin_delete_social: {
        Args: { _code: string; _id: string }
        Returns: undefined
      }
      admin_delete_stock: {
        Args: { _code: string; _id: string }
        Returns: undefined
      }
      admin_delete_store_image: {
        Args: { _code: string; _id: string }
        Returns: undefined
      }
      admin_get_private_settings: {
        Args: { _code: string }
        Returns: {
          key: string
          value: string
        }[]
      }
      admin_list_orders: {
        Args: { _code: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          payment_method_name: string
          payment_proof_url: string
          status: Database["public"]["Enums"]["order_status"]
          subscription_image_url: string
          subscription_image_urls: string[]
          subscription_info: string
          total: number
        }[]
      }
      admin_list_stock: {
        Args: { _code: string; _product_id: string }
        Returns: {
          account_details: string
          created_at: string
          id: string
          is_used: boolean
        }[]
      }
      admin_login: { Args: { _code: string }; Returns: string }
      admin_reorder_category: {
        Args: { _code: string; _slug: string; _sort_order: number }
        Returns: undefined
      }
      admin_set_setting: {
        Args: { _code: string; _key: string; _value: string }
        Returns: undefined
      }
      admin_stock_counts: {
        Args: { _code: string }
        Returns: {
          available: number
          product_id: string
          used: number
        }[]
      }
      admin_update_status: {
        Args: {
          _code: string
          _order_id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      admin_upsert_category: {
        Args: {
          _code: string
          _icon: string
          _image_url?: string
          _name: string
          _new_slug: string
          _slug: string
          _sort_order: number
        }
        Returns: undefined
      }
      admin_upsert_payment_method: {
        Args: {
          _account_number: string
          _code: string
          _id: string
          _image_url: string
          _is_active: boolean
          _name: string
          _note: string
          _sort_order: number
          _tax: number
        }
        Returns: string
      }
      admin_upsert_product_v2: {
        Args: {
          _category_slug: string
          _code: string
          _description: string
          _id: string
          _image_url: string
          _is_active: boolean
          _name: string
          _old_price: number
          _price: number
          _stock: number
        }
        Returns: string
      }
      admin_upsert_product_v4: {
        Args: {
          _activation_images?: string[]
          _activation_instructions?: string
          _category_slug: string
          _code: string
          _description: string
          _display_order?: number
          _id: string
          _image_url: string
          _is_active: boolean
          _is_featured?: boolean
          _name: string
          _old_price: number
          _price: number
          _stock: number
        }
        Returns: string
      }
      admin_upsert_social: {
        Args: {
          _code: string
          _id: string
          _image_url: string
          _is_active: boolean
          _name: string
          _sort_order: number
          _url: string
        }
        Returns: string
      }
      auto_deliver_order: { Args: { _order_id: string }; Returns: boolean }
      can_add_order_items: { Args: { _order_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_orders_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          status: Database["public"]["Enums"]["order_status"]
          subscription_image_url: string
          subscription_image_urls: string[]
          subscription_info: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      whatsapp_notify_order: { Args: { _order_id: string }; Returns: Json }
      whatsapp_test_send: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "pending" | "processing" | "completed" | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: ["pending", "processing", "completed", "cancelled"],
    },
  },
} as const
