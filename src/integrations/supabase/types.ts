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
      profiles: {
        Row: {
          id: string
          credits: number
          created_at: string
        }
        Insert: {
          id: string
          credits?: number
          created_at?: string
        }
        Update: {
          credits?: number
          created_at?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          id: string
          user_id: string
          spread_name: string
          spread_emoji: string | null
          labels: string[]
          cards: Json
          note: string
          reading_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spread_name: string
          spread_emoji?: string | null
          labels?: string[]
          cards?: Json
          note?: string
          reading_date?: string
          created_at?: string
        }
        Update: {
          spread_name?: string
          spread_emoji?: string | null
          labels?: string[]
          cards?: Json
          note?: string
          reading_date?: string
        }
        Relationships: []
      }
      ai_readings: {
        Row: {
          id: string
          spread_id: string
          spread_name: string
          question: string | null
          cards: Json
          ai_interpretation: string
          model_used: string | null
          user_id: string | null
          reading_consult_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          spread_id: string
          spread_name: string
          question?: string | null
          cards?: Json
          ai_interpretation: string
          model_used?: string | null
          user_id?: string | null
          reading_consult_id?: string | null
          created_at?: string
        }
        Update: {
          question?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reading_consults: {
        Row: {
          id: string
          user_id: string
          dedupe_key: string
          spread_id: string
          spread_name: string
          cards: Json
          used_credit: boolean
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dedupe_key: string
          spread_id: string
          spread_name: string
          cards?: Json
          used_credit?: boolean
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          cards?: Json
          used_credit?: boolean
          revoked_at?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string
          credits_delta: number
          balance_after: number
          event_type: string
          summary: string
          ref_table: string | null
          ref_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credits_delta: number
          balance_after: number
          event_type: string
          summary: string
          ref_table?: string | null
          ref_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          metadata?: Json
        }
        Relationships: []
      }
      credit_orders: {
        Row: {
          id: string
          user_id: string
          package_id: string
          credits: number
          amount_cents: number
          currency: string
          status: string
          mp_preference_id: string | null
          mp_payment_id: string | null
          created_at: string
          paid_at: string | null
          refunded_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          credits: number
          amount_cents: number
          currency?: string
          status?: string
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          created_at?: string
          paid_at?: string | null
          refunded_at?: string | null
        }
        Update: {
          status?: string
          mp_preference_id?: string | null
          mp_payment_id?: string | null
          paid_at?: string | null
          refunded_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          timezone: string
          reminder_hour: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          timezone?: string
          reminder_hour?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          endpoint?: string
          p256dh?: string
          auth?: string
          timezone?: string
          reminder_hour?: number
          active?: boolean
          updated_at?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
