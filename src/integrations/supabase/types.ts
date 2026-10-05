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
      bids: {
        Row: {
          bid_amount: number
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          bid_amount: number
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          bid_amount?: number
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author_code: string
          author_name: string
          content: string
          created_at: string
          id: string
          is_official: boolean
          is_public: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_code: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_official?: boolean
          is_public?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_code?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_official?: boolean
          is_public?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_code: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_code: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_code?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_violations: {
        Row: {
          content_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          original_content: string
          severity: string
          user_code: string | null
          violation_reason: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          original_content: string
          severity: string
          user_code?: string | null
          violation_reason: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          original_content?: string
          severity?: string
          user_code?: string | null
          violation_reason?: string
        }
        Relationships: []
      }
      equipped_skins: {
        Row: {
          updated_at: string
          user_code: string
          user_skin_id: string
        }
        Insert: {
          updated_at?: string
          user_code: string
          user_skin_id: string
        }
        Update: {
          updated_at?: string
          user_code?: string
          user_skin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipped_skins_user_code_fkey"
            columns: ["user_code"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "equipped_skins_user_skin_id_fkey"
            columns: ["user_skin_id"]
            isOneToOne: false
            referencedRelation: "user_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          game_key: string
          id: string
          score: number
          user_code: string
          user_name: string
        }
        Insert: {
          created_at?: string
          game_key: string
          id?: string
          score?: number
          user_code: string
          user_name: string
        }
        Update: {
          created_at?: string
          game_key?: string
          id?: string
          score?: number
          user_code?: string
          user_name?: string
        }
        Relationships: []
      }
      keif_balances: {
        Row: {
          converted_arcade: number
          converted_crypto: number
          converted_english: number
          converted_hebrew: number
          converted_math: number
          created_at: string
          id: string
          total_keif: number
          updated_at: string
          user_code: string
          user_name: string
        }
        Insert: {
          converted_arcade?: number
          converted_crypto?: number
          converted_english?: number
          converted_hebrew?: number
          converted_math?: number
          created_at?: string
          id?: string
          total_keif?: number
          updated_at?: string
          user_code: string
          user_name: string
        }
        Update: {
          converted_arcade?: number
          converted_crypto?: number
          converted_english?: number
          converted_hebrew?: number
          converted_math?: number
          created_at?: string
          id?: string
          total_keif?: number
          updated_at?: string
          user_code?: string
          user_name?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          auction_active: boolean | null
          comments: Json | null
          created_at: string | null
          current_bid_price: number | null
          description: string
          id: string
          max_bid_limit: number | null
          original_price: string | null
          owner_code: string
          owner_name: string
          photo_path: string | null
          photo_url: string | null
          posting_mode: string
          price: string
        }
        Insert: {
          auction_active?: boolean | null
          comments?: Json | null
          created_at?: string | null
          current_bid_price?: number | null
          description: string
          id?: string
          max_bid_limit?: number | null
          original_price?: string | null
          owner_code: string
          owner_name: string
          photo_path?: string | null
          photo_url?: string | null
          posting_mode?: string
          price: string
        }
        Update: {
          auction_active?: boolean | null
          comments?: Json | null
          created_at?: string | null
          current_bid_price?: number | null
          description?: string
          id?: string
          max_bid_limit?: number | null
          original_price?: string | null
          owner_code?: string
          owner_name?: string
          photo_path?: string | null
          photo_url?: string | null
          posting_mode?: string
          price?: string
        }
        Relationships: []
      }
      private_chat_limits: {
        Row: {
          chat_id: string
          id: string
          message_count: number
          month_year: string
          user_code: string
        }
        Insert: {
          chat_id: string
          id?: string
          message_count?: number
          month_year?: string
          user_code: string
        }
        Update: {
          chat_id?: string
          id?: string
          message_count?: number
          month_year?: string
          user_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_chat_limits_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "private_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      private_chats: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_message_at: string | null
          user1_code: string
          user1_name: string
          user2_code: string
          user2_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          user1_code: string
          user1_name: string
          user2_code: string
          user2_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          user1_code?: string
          user1_name?: string
          user2_code?: string
          user2_name?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          month_year: string
          sender_code: string
          sender_name: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          month_year?: string
          sender_code: string
          sender_name: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          month_year?: string
          sender_code?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "private_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          action_type: string
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          action_type?: string
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      school_codes: {
        Row: {
          code_hash: string
          code_salt: string
          created_at: string
          id: string
          school_name: string
        }
        Insert: {
          code_hash: string
          code_salt: string
          created_at?: string
          id?: string
          school_name: string
        }
        Update: {
          code_hash?: string
          code_salt?: string
          created_at?: string
          id?: string
          school_name?: string
        }
        Relationships: []
      }
      school_news: {
        Row: {
          author_code: string
          author_name: string
          content: string
          created_at: string
          id: string
          image_url: string | null
        }
        Insert: {
          author_code: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
        }
        Update: {
          author_code?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string
          user_agent: string | null
          user_code: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity: string
          user_agent?: string | null
          user_code?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string
          user_agent?: string | null
          user_code?: string | null
        }
        Relationships: []
      }
      skin_offers: {
        Row: {
          comment: string
          created_at: string
          id: string
          price: number
          seller_code: string
          status: string
          updated_at: string
          user_skin_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          price: number
          seller_code: string
          status?: string
          updated_at?: string
          user_skin_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          price?: number
          seller_code?: string
          status?: string
          updated_at?: string
          user_skin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skin_offers_user_skin_id_fkey"
            columns: ["user_skin_id"]
            isOneToOne: false
            referencedRelation: "user_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_transactions: {
        Row: {
          buyer_code: string
          created_at: string
          id: string
          offer_id: string | null
          price: number
          seller_code: string | null
          skin_id: number
        }
        Insert: {
          buyer_code: string
          created_at?: string
          id?: string
          offer_id?: string | null
          price: number
          seller_code?: string | null
          skin_id: number
        }
        Update: {
          buyer_code?: string
          created_at?: string
          id?: string
          offer_id?: string | null
          price?: number
          seller_code?: string | null
          skin_id?: number
        }
        Relationships: []
      }
      skins: {
        Row: {
          id: number
          name: string
          price: number
          tier: number
        }
        Insert: {
          id: number
          name: string
          price: number
          tier: number
        }
        Update: {
          id?: number
          name?: string
          price?: number
          tier?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          expires_at: string
          id: string
          payment_provider: string
          started_at: string | null
          status: string
          transaction_id: string | null
          user_code: string
        }
        Insert: {
          expires_at: string
          id?: string
          payment_provider: string
          started_at?: string | null
          status?: string
          transaction_id?: string | null
          user_code: string
        }
        Update: {
          expires_at?: string
          id?: string
          payment_provider?: string
          started_at?: string | null
          status?: string
          transaction_id?: string | null
          user_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_code"
            columns: ["user_code"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["code"]
          },
        ]
      }
      user_avatars: {
        Row: {
          avatar_url: string
          created_at: string
          id: string
          updated_at: string
          user_code: string
        }
        Insert: {
          avatar_url: string
          created_at?: string
          id?: string
          updated_at?: string
          user_code: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_code?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_code: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_code: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_code_fkey"
            columns: ["user_code"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["code"]
          },
        ]
      }
      user_skins: {
        Row: {
          acquired_at: string
          id: string
          owner_code: string
          skin_id: number
        }
        Insert: {
          acquired_at?: string
          id?: string
          owner_code: string
          skin_id: number
        }
        Update: {
          acquired_at?: string
          id?: string
          owner_code?: string
          skin_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_skins_owner_code_fkey"
            columns: ["owner_code"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_skins_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "skins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_visit_date: string
          longest_streak: number
          updated_at: string
          user_code: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_visit_date?: string
          longest_streak?: number
          updated_at?: string
          user_code: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_visit_date?: string
          longest_streak?: number
          updated_at?: string
          user_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_code_fkey"
            columns: ["user_code"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["code"]
          },
        ]
      }
      users: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_premium: boolean | null
          last_photo_reset: string | null
          name: string
          photo_count: number | null
          policy_accepted: boolean | null
          role: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_premium?: boolean | null
          last_photo_reset?: string | null
          name: string
          photo_count?: number | null
          policy_accepted?: boolean | null
          role?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_premium?: boolean | null
          last_photo_reset?: string | null
          name?: string
          photo_count?: number | null
          policy_accepted?: boolean | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _shop_debit: {
        Args: { _amount: number; _code: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          _action_type: string
          _identifier: string
          _max_requests: number
          _window_minutes: number
        }
        Returns: boolean
      }
      expire_old_subscriptions: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_code: string
        }
        Returns: boolean
      }
      reset_monthly_photo_counts: { Args: never; Returns: undefined }
      shop_balance: { Args: { _user_code: string }; Returns: number }
      shop_buy_catalog: {
        Args: { _skin_id: number; _user_code: string }
        Returns: undefined
      }
      shop_buy_offer: {
        Args: { _offer_id: string; _user_code: string }
        Returns: undefined
      }
      shop_cancel_offer: {
        Args: { _offer_id: string; _user_code: string }
        Returns: undefined
      }
      shop_create_offer: {
        Args: {
          _comment: string
          _price: number
          _user_code: string
          _user_skin_id: string
        }
        Returns: undefined
      }
      shop_equip: {
        Args: { _user_code: string; _user_skin_id: string }
        Returns: undefined
      }
      shop_equipped_skin: { Args: { _user_code: string }; Returns: number }
      shop_my_skins: {
        Args: { _user_code: string }
        Returns: {
          balance: number
          equipped: boolean
          on_sale: boolean
          skin_id: number
          user_skin_id: string
        }[]
      }
      shop_offers: {
        Args: { _user_code: string }
        Returns: {
          comment: string
          created_at: string
          is_mine: boolean
          offer_id: string
          price: number
          seller_name: string
          skin_id: number
        }[]
      }
      shop_user_skins: {
        Args: { _user_id: string }
        Returns: {
          skin_id: number
        }[]
      }
      shop_users: {
        Args: never
        Returns: {
          equipped_skin_id: number
          skin_count: number
          user_id: string
          user_name: string
        }[]
      }
      streak_check_in: {
        Args: { _user_code: string }
        Returns: {
          current_streak: number
          days_missed: number
          last_visit_date: string
          longest_streak: number
          server_date: string
        }[]
      }
      streak_status: {
        Args: { _user_code: string }
        Returns: {
          current_streak: number
          days_missed: number
          last_visit_date: string
          longest_streak: number
          server_date: string
        }[]
      }
      verify_school_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
