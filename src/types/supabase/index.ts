/* eslint-disable */

/**
 * Supabase Database typing
 * Aligned with final schema:
 * - training_sessions
 * - lap_records
 * - lap_stats_view
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    /** =====================
     *  Tables
     *  ===================== */
    Tables: {
      /** -------- training_sessions -------- */
      training_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;          // timestamptz
          end_time: string | null;     // timestamptz
          floors_per_lap: number;
          target_floors: number;
          status: "active" | "finished" | "abandoned";
          created_at: string;          // timestamptz
        };

        Insert: {
          id?: string;
          user_id: string;
          start_time: string;
          end_time?: string | null;
          floors_per_lap: number;
          target_floors: number;
          status?: "active" | "finished" | "abandoned";
          created_at?: string;
        };

        Update: {
          id?: string;
          user_id?: string;
          start_time?: string;
          end_time?: string | null;
          floors_per_lap?: number;
          target_floors?: number;
          status?: "active" | "finished" | "abandoned";
          created_at?: string;
        };

        Relationships: [
          {
            foreignKeyName: "training_sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };

      /** -------- lap_records (event table) -------- */
      lap_records: {
        Row: {
          id: string;
          session_id: string;
          created_at: string; // timestamptz
        };

        Insert: {
          id?: string;
          session_id: string;
          created_at?: string;
        };

        Update: {
          id?: string;
          session_id?: string;
          created_at?: string;
        };

        Relationships: [
          {
            foreignKeyName: "lap_records_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "training_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
    };

    /** =====================
     *  Views
     *  ===================== */
    Views: {
      /** -------- lap_stats_view -------- */
      lap_stats_view: {
        Row: {
          lap_id: string;
          session_id: string;
          lap_finish_time: string;     // timestamptz
          lap_number: number;
          lap_time_seconds: number;
        };
      };
    };

    /** =====================
     *  Functions / Enums
     *  ===================== */
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
