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
            attendance: {
                Row: {
                    attendance_type: string | null
                    confirmation_status: string | null
                    created_at: string | null
                    forgot_jerseys: boolean | null
                    id: string
                    match_id: string
                    player_id: string
                    points_impact: number | null
                    stays_for_social: boolean | null
                    washed_jerseys: boolean | null
                }
                Insert: {
                    attendance_type?: string | null
                    confirmation_status?: string | null
                    created_at?: string | null
                    forgot_jerseys?: boolean | null
                    id?: string
                    match_id: string
                    player_id: string
                    points_impact?: number | null
                    stays_for_social?: boolean | null
                    washed_jerseys?: boolean | null
                }
                Update: {
                    attendance_type?: string | null
                    confirmation_status?: string | null
                    created_at?: string | null
                    forgot_jerseys?: boolean | null
                    id?: string
                    match_id?: string
                    player_id?: string
                    points_impact?: number | null
                    stays_for_social?: boolean | null
                    washed_jerseys?: boolean | null
                }
                Relationships: [
                    {
                        foreignKeyName: "attendance_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "attendance_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            club_payments: {
                Row: {
                    id: string
                    month: number
                    year: number
                    amount_paid: number
                    collected_total: number
                    savings: number
                    notes: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    month: number
                    year: number
                    amount_paid: number
                    collected_total: number
                    savings: number
                    notes?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    month?: number
                    year?: number
                    amount_paid?: number
                    collected_total?: number
                    savings?: number
                    notes?: string | null
                    created_at?: string | null
                }
                Relationships: []
            }
            fees_config: {
                Row: {
                    amount: number
                    category: string
                    id: string
                    month: number | null
                    updated_at: string | null
                    year: number | null
                }
                Insert: {
                    amount?: number
                    category: string
                    id?: string
                    month?: number | null
                    updated_at?: string | null
                    year?: number | null
                }
                Update: {
                    amount?: number
                    category?: string
                    id?: string
                    month?: number | null
                    updated_at?: string | null
                    year?: number | null
                }
                Relationships: []
            }
            forum_posts: {
                Row: {
                    content: string
                    created_at: string | null
                    id: string
                    match_id: string | null
                    player_id: string | null
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    id?: string
                    match_id?: string | null
                    player_id?: string | null
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    id?: string
                    match_id?: string | null
                    player_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "forum_posts_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "forum_posts_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            match_lineups: {
                Row: {
                    created_at: string | null
                    id: string
                    is_starter: boolean | null
                    match_id: string
                    player_id: string
                    position_x: number
                    position_y: number
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_starter?: boolean | null
                    match_id: string
                    player_id: string
                    position_x: number
                    position_y: number
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_starter?: boolean | null
                    match_id?: string
                    player_id?: string
                    position_x?: number
                    position_y?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "match_lineups_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "match_lineups_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            matches: {
                Row: {
                    created_at: string | null
                    id: string
                    location: string | null
                    match_date: string
                    opponent: string
                    result_opponent_score: number | null
                    result_our_score: number | null
                    status: string | null
                    jerseys_brought_by_id: string | null
                    jerseys_washed_by_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    location?: string | null
                    match_date: string
                    opponent: string
                    result_opponent_score?: number | null
                    result_our_score?: number | null
                    status?: string | null
                    jerseys_brought_by_id?: string | null
                    jerseys_washed_by_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    location?: string | null
                    match_date?: string
                    opponent?: string
                    result_opponent_score?: number | null
                    result_our_score?: number | null
                    status?: string | null
                    jerseys_brought_by_id?: string | null
                    jerseys_washed_by_id?: string | null
                }
                Relationships: []
            }
            monthly_settings: {
                Row: {
                    is_group_payment: boolean | null
                    month: number
                    year: number
                }
                Insert: {
                    is_group_payment?: boolean | null
                    month: number
                    year: number
                }
                Update: {
                    is_group_payment?: boolean | null
                    month?: number
                    year?: number
                }
                Relationships: []
            }
            payments: {
                Row: {
                    amount_total: number
                    created_at: string | null
                    debt_with_team: number | null
                    id: string
                    is_financed_by_team: boolean | null
                    month: number
                    paid_to_club: boolean | null
                    paid_to_team: number | null
                    payment_date: string | null
                    player_id: string
                    reimbursed_to_team: boolean | null
                    status: string | null
                    year: number
                }
                Insert: {
                    amount_total: number
                    created_at?: string | null
                    debt_with_team?: number | null
                    id?: string
                    is_financed_by_team?: boolean | null
                    month: number
                    paid_to_club?: boolean | null
                    paid_to_team?: number | null
                    payment_date?: string | null
                    player_id: string
                    reimbursed_to_team?: boolean | null
                    status?: string | null
                    year: number
                }
                Update: {
                    amount_total?: number
                    created_at?: string | null
                    debt_with_team?: number | null
                    id?: string
                    is_financed_by_team?: boolean | null
                    month?: number
                    paid_to_club?: boolean | null
                    paid_to_team?: number | null
                    payment_date?: string | null
                    player_id?: string
                    reimbursed_to_team?: boolean | null
                    status?: string | null
                    year?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "payments_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            player_monthly_status: {
                Row: {
                    id: string
                    player_id: string | null
                    month: number
                    year: number
                    status: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    player_id?: string | null
                    month: number
                    year: number
                    status: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    player_id?: string | null
                    month?: number
                    year?: number
                    status?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "player_monthly_status_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    full_name: string | null
                    id: string
                    jersey_number: number | null
                    nickname: string | null
                    role: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    full_name?: string | null
                    id: string
                    jersey_number?: number | null
                    nickname?: string | null
                    status?: string | null
                    role?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    full_name?: string | null
                    id?: string
                    jersey_number?: number | null
                    nickname?: string | null
                    role?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            commitment_ranking: {
                Row: {
                    player_id: string
                    full_name: string | null
                    avatar_url: string | null
                    jersey_number: number | null
                    role: string | null
                    total_points: number
                }
            },
            wall_of_shame: {
                Row: {
                    player_id: string
                    full_name: string | null
                    avatar_url: string | null
                    role: string | null
                    total_shame_points: number
                    late_count: number
                    absent_count: number
                    forgot_jerseys_count: number
                    unpaid_months_count: number
                }
            }
        }
        Functions: {
            is_admin_or_dt: { Args: never; Returns: boolean }
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
