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
      announcements: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          is_published: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_name: string
          email: string | null
          id: string
          is_anonymous: boolean
          message: string | null
          order_id: string | null
          payment_id: string | null
          payment_signature: string | null
          phone: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          donor_name: string
          email?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_signature?: string | null
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          donor_name?: string
          email?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_signature?: string | null
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          age_max: number | null
          age_min: number | null
          category: string
          created_at: string
          description: string
          end_time: string | null
          entry_fee: number
          event_date: string
          id: string
          is_published: boolean
          max_participants: number
          name: string
          organizer_name: string | null
          organizer_phone: string | null
          poster_url: string | null
          prize_details: string | null
          registration_open: boolean
          rules: string | null
          slug: string
          start_time: string
          team_size: number
          updated_at: string
          venue: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          category?: string
          created_at?: string
          description?: string
          end_time?: string | null
          entry_fee?: number
          event_date: string
          id?: string
          is_published?: boolean
          max_participants?: number
          name: string
          organizer_name?: string | null
          organizer_phone?: string | null
          poster_url?: string | null
          prize_details?: string | null
          registration_open?: boolean
          rules?: string | null
          slug: string
          start_time?: string
          team_size?: number
          updated_at?: string
          venue?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          category?: string
          created_at?: string
          description?: string
          end_time?: string | null
          entry_fee?: number
          event_date?: string
          id?: string
          is_published?: boolean
          max_participants?: number
          name?: string
          organizer_name?: string | null
          organizer_phone?: string | null
          poster_url?: string | null
          prize_details?: string | null
          registration_open?: boolean
          rules?: string | null
          slug?: string
          start_time?: string
          team_size?: number
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      festival_memories: {
        Row: {
          cover_image_url: string
          created_at: string
          description: string
          id: string
          photos: string[]
          sort_order: number
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          cover_image_url: string
          created_at?: string
          description?: string
          id?: string
          photos?: string[]
          sort_order?: number
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          cover_image_url?: string
          created_at?: string
          description?: string
          id?: string
          photos?: string[]
          sort_order?: number
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      festival_settings: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          donation_goal: number
          end_date: string
          festival_name: string
          id: number
          live_stream_url: string | null
          start_date: string
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          donation_goal?: number
          end_date?: string
          festival_name?: string
          id?: number
          live_stream_url?: string | null
          start_date?: string
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          donation_goal?: number
          end_date?: string
          festival_name?: string
          id?: number
          live_stream_url?: string | null
          start_date?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          category: string
          created_at: string
          id: string
          likes: number
          media_type: string
          media_url: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          likes?: number
          media_type?: string
          media_url: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          likes?: number
          media_type?: string
          media_url?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          address: string | null
          age: number | null
          attended: boolean
          attended_at: string | null
          blood_group: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          event_id: string
          full_name: string
          gender: string | null
          id: string
          pass_code: string
          payment_status: string
          phone: string
          photo_url: string | null
          status: string
          team_name: string | null
          teammates: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          attended?: boolean
          attended_at?: string | null
          blood_group?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          event_id: string
          full_name: string
          gender?: string | null
          id?: string
          pass_code?: string
          payment_status?: string
          phone: string
          photo_url?: string | null
          status?: string
          team_name?: string | null
          teammates?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          attended?: boolean
          attended_at?: string | null
          blood_group?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          event_id?: string
          full_name?: string
          gender?: string | null
          id?: string
          pass_code?: string
          payment_status?: string
          phone?: string
          photo_url?: string | null
          status?: string
          team_name?: string | null
          teammates?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          banner_url: string | null
          contact: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          sort_order: number
          tier: string
          website: string | null
        }
        Insert: {
          banner_url?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          sort_order?: number
          tier?: string
          website?: string | null
        }
        Update: {
          banner_url?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          sort_order?: number
          tier?: string
          website?: string | null
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
      volunteers: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_event_id: string | null
          assigned_role: string | null
          assigned_shift: string | null
          availability: string | null
          created_at: string
          duty: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string
          skills: string | null
          status: string
          user_id: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_event_id?: string | null
          assigned_role?: string | null
          assigned_shift?: string | null
          availability?: string | null
          created_at?: string
          duty?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          phone: string
          skills?: string | null
          status?: string
          user_id: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_event_id?: string | null
          assigned_role?: string | null
          assigned_shift?: string | null
          availability?: string | null
          created_at?: string
          duty?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string
          skills?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "organizer" | "volunteer" | "user"
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
      app_role: ["admin", "organizer", "volunteer", "user"],
    },
  },
} as const
