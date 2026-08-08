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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agents: {
        Row: {
          agency_name: string | null
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          payout_upi: string | null
          referral_code: string
        }
        Insert: {
          agency_name?: string | null
          commission_rate?: number
          created_at?: string
          id: string
          is_active?: boolean
          payout_upi?: string | null
          referral_code: string
        }
        Update: {
          agency_name?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          payout_upi?: string | null
          referral_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          file_name: string | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string | null
          size_bytes: number | null
          sort_order: number
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          file_name?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          file_name?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string | null
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blessings: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_approved: boolean
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_approved?: boolean
          message: string
          name: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_approved?: boolean
          message?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blessings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          agent_id: string
          amount_inr: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          rate: number
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          agent_id: string
          amount_inr: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          rate: number
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          agent_id?: string
          amount_inr?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          rate?: number
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          agent_id: string | null
          city: string | null
          cover_asset_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          hashtag: string | null
          hosts: Json
          hotels: Json
          id: string
          main_datetime: string | null
          owner_id: string
          published_at: string | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          story: string | null
          story_moments: Json
          theme_id: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          city?: string | null
          cover_asset_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          hashtag?: string | null
          hosts?: Json
          hotels?: Json
          id?: string
          main_datetime?: string | null
          owner_id: string
          published_at?: string | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          story?: string | null
          story_moments?: Json
          theme_id?: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          city?: string | null
          cover_asset_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          hashtag?: string | null
          hosts?: Json
          hotels?: Json
          id?: string
          main_datetime?: string | null
          owner_id?: string
          published_at?: string | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          story?: string | null
          story_moments?: Json
          theme_id?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_cover_asset_fk"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          guest_group: string | null
          headcount: number
          id: string
          invite_token: string
          invited_keys: string[]
          meal: string | null
          name: string
          phone: string | null
          side: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          guest_group?: string | null
          headcount?: number
          id?: string
          invite_token?: string
          invited_keys?: string[]
          meal?: string | null
          name: string
          phone?: string | null
          side?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          guest_group?: string | null
          headcount?: number
          id?: string
          invite_token?: string
          invited_keys?: string[]
          meal?: string | null
          name?: string
          phone?: string | null
          side?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agent_id: string | null
          amount_inr: number
          buyer_id: string
          created_at: string
          event_id: string
          id: string
          paid_at: string | null
          plan_code: string
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          agent_id?: string | null
          amount_inr: number
          buyer_id: string
          created_at?: string
          event_id: string
          id?: string
          paid_at?: string | null
          plan_code: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          agent_id?: string | null
          amount_inr?: number
          buyer_id?: string
          created_at?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          plan_code?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      page_views: {
        Row: {
          city: string | null
          country: string | null
          event_id: string
          guest_id: string | null
          id: number
          occurred_at: string
          referrer: string | null
          visitor_hash: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          event_id: string
          guest_id?: string | null
          id?: number
          occurred_at?: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          event_id?: string
          guest_id?: string | null
          id?: number
          occurred_at?: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          description: string | null
          features: Json
          is_active: boolean
          name: string
          price_inr: number
          sort_order: number
        }
        Insert: {
          code: string
          description?: string | null
          features?: Json
          is_active?: boolean
          name: string
          price_inr: number
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string | null
          features?: Json
          is_active?: boolean
          name?: string
          price_inr?: number
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          attending: Database["public"]["Enums"]["rsvp_status"]
          created_at: string
          event_id: string
          guest_id: string | null
          guest_name: string
          headcount: number
          id: string
          meal: string | null
          message: string | null
          sub_event_keys: string[]
        }
        Insert: {
          attending: Database["public"]["Enums"]["rsvp_status"]
          created_at?: string
          event_id: string
          guest_id?: string | null
          guest_name: string
          headcount?: number
          id?: string
          meal?: string | null
          message?: string | null
          sub_event_keys?: string[]
        }
        Update: {
          attending?: Database["public"]["Enums"]["rsvp_status"]
          created_at?: string
          event_id?: string
          guest_id?: string | null
          guest_name?: string
          headcount?: number
          id?: string
          meal?: string | null
          message?: string | null
          sub_event_keys?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_events: {
        Row: {
          address: string | null
          created_at: string
          dress_code: string | null
          event_id: string
          id: string
          key: string
          map_url: string | null
          name: string
          sort_order: number
          starts_at: string | null
          time_label: string | null
          venue: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          dress_code?: string | null
          event_id: string
          id?: string
          key: string
          map_url?: string | null
          name: string
          sort_order?: number
          starts_at?: string | null
          time_label?: string | null
          venue?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          dress_code?: string | null
          event_id?: string
          id?: string
          key?: string
          map_url?: string | null
          name?: string
          sort_order?: number
          starts_at?: string | null
          time_label?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_stats: { Args: { p_agent_id: string }; Returns: Json }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      can_manage_event: { Args: { target: string }; Returns: boolean }
      event_is_public: { Args: { target: string }; Returns: boolean }
      event_stats: { Args: { p_event_id: string }; Returns: Json }
      event_views_by_day: {
        Args: { p_days?: number; p_event_id: string }
        Returns: {
          day: string
          uniques: number
          views: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      record_page_view: {
        Args: {
          p_city?: string
          p_country?: string
          p_guest_token?: string
          p_referrer?: string
          p_slug: string
          p_visitor_hash?: string
        }
        Returns: undefined
      }
      storage_event_id: { Args: { object_name: string }; Returns: string }
    }
    Enums: {
      asset_kind: "photo" | "audio" | "video" | "logo" | "document"
      commission_status: "accrued" | "payable" | "paid" | "void"
      event_status: "draft" | "published" | "archived"
      event_type:
        | "wedding"
        | "engagement"
        | "reception"
        | "anniversary"
        | "birthday"
        | "baby_shower"
        | "naming"
        | "housewarming"
        | "graduation"
        | "corporate"
        | "other"
      order_status: "pending" | "paid" | "failed" | "refunded"
      rsvp_status: "yes" | "no" | "maybe" | "pending"
      user_role: "host" | "agent" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_kind: ["photo", "audio", "video", "logo", "document"],
      commission_status: ["accrued", "payable", "paid", "void"],
      event_status: ["draft", "published", "archived"],
      event_type: [
        "wedding",
        "engagement",
        "reception",
        "anniversary",
        "birthday",
        "baby_shower",
        "naming",
        "housewarming",
        "graduation",
        "corporate",
        "other",
      ],
      order_status: ["pending", "paid", "failed", "refunded"],
      rsvp_status: ["yes", "no", "maybe", "pending"],
      user_role: ["host", "agent", "admin"],
    },
  },
} as const
