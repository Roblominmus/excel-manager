/**
 * Database Types - Generated from Supabase Schema
 * 
 * These types define the structure of our Supabase database.
 * They provide type safety for all database operations.
 */

export interface Database {
  public: {
    Tables: {
      folders: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          name: string;
          folder_id: string | null;
          storage_path: string;
          user_id: string;
          size: number;
          mime_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          folder_id?: string | null;
          storage_path: string;
          user_id: string;
          size: number;
          mime_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          folder_id?: string | null;
          storage_path?: string;
          user_id?: string;
          size?: number;
          mime_type?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
