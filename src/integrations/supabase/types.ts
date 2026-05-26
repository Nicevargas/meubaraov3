export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      _backup_20260522_account_locks: {
        Row: {
          details: Json | null;
          expires_at: string | null;
          id: string | null;
          locked_at: string | null;
          locked_by: string | null;
          reason: string | null;
          severity: string | null;
          unlocked_at: string | null;
          unlocked_by: string | null;
          user_id: string | null;
        };
        Insert: {
          details?: Json | null;
          expires_at?: string | null;
          id?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          reason?: string | null;
          severity?: string | null;
          unlocked_at?: string | null;
          unlocked_by?: string | null;
          user_id?: string | null;
        };
        Update: {
          details?: Json | null;
          expires_at?: string | null;
          id?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          reason?: string | null;
          severity?: string | null;
          unlocked_at?: string | null;
          unlocked_by?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_payments: {
        Row: {
          amount: number | null;
          created_at: string | null;
          currency: string | null;
          id: string | null;
          mp_payment_id: string | null;
          mp_preapproval_id: string | null;
          paid_at: string | null;
          payment_method: string | null;
          payment_type: string | null;
          pix_expires_at: string | null;
          pix_qr_code: string | null;
          pix_qr_code_base64: string | null;
          plan_id: string | null;
          pricing_plan_id: string | null;
          provider: string | null;
          raw: Json | null;
          status: string | null;
          status_detail: string | null;
          subscription_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string | null;
          mp_payment_id?: string | null;
          mp_preapproval_id?: string | null;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_type?: string | null;
          pix_expires_at?: string | null;
          pix_qr_code?: string | null;
          pix_qr_code_base64?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          provider?: string | null;
          raw?: Json | null;
          status?: string | null;
          status_detail?: string | null;
          subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string | null;
          mp_payment_id?: string | null;
          mp_preapproval_id?: string | null;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_type?: string | null;
          pix_expires_at?: string | null;
          pix_qr_code?: string | null;
          pix_qr_code_base64?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          provider?: string | null;
          raw?: Json | null;
          status?: string | null;
          status_detail?: string | null;
          subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_plans: {
        Row: {
          active: boolean | null;
          ai_priority: number | null;
          archived_at: string | null;
          badge_label: string | null;
          billing_cycle: string | null;
          billing_enabled: boolean | null;
          created_at: string | null;
          currency: string | null;
          daily_message_limit: number | null;
          description: string | null;
          featured: boolean | null;
          id: string | null;
          long_description: string | null;
          max_conversations: number | null;
          memory_context_size: number | null;
          monthly_token_limit: number | null;
          mp_checkout_reference: string | null;
          mp_preapproval_plan_id: string | null;
          mp_product_id: string | null;
          name: string | null;
          plan_code: string | null;
          premium_features: Json | null;
          price_brl: number | null;
          promo_price_brl: number | null;
          soft_limit_pct: number | null;
          sort_order: number | null;
          tier: string | null;
          trial_days: number | null;
          updated_at: string | null;
          vip_features: Json | null;
        };
        Insert: {
          active?: boolean | null;
          ai_priority?: number | null;
          archived_at?: string | null;
          badge_label?: string | null;
          billing_cycle?: string | null;
          billing_enabled?: boolean | null;
          created_at?: string | null;
          currency?: string | null;
          daily_message_limit?: number | null;
          description?: string | null;
          featured?: boolean | null;
          id?: string | null;
          long_description?: string | null;
          max_conversations?: number | null;
          memory_context_size?: number | null;
          monthly_token_limit?: number | null;
          mp_checkout_reference?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          name?: string | null;
          plan_code?: string | null;
          premium_features?: Json | null;
          price_brl?: number | null;
          promo_price_brl?: number | null;
          soft_limit_pct?: number | null;
          sort_order?: number | null;
          tier?: string | null;
          trial_days?: number | null;
          updated_at?: string | null;
          vip_features?: Json | null;
        };
        Update: {
          active?: boolean | null;
          ai_priority?: number | null;
          archived_at?: string | null;
          badge_label?: string | null;
          billing_cycle?: string | null;
          billing_enabled?: boolean | null;
          created_at?: string | null;
          currency?: string | null;
          daily_message_limit?: number | null;
          description?: string | null;
          featured?: boolean | null;
          id?: string | null;
          long_description?: string | null;
          max_conversations?: number | null;
          memory_context_size?: number | null;
          monthly_token_limit?: number | null;
          mp_checkout_reference?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          name?: string | null;
          plan_code?: string | null;
          premium_features?: Json | null;
          price_brl?: number | null;
          promo_price_brl?: number | null;
          soft_limit_pct?: number | null;
          sort_order?: number | null;
          tier?: string | null;
          trial_days?: number | null;
          updated_at?: string | null;
          vip_features?: Json | null;
        };
        Relationships: [];
      };
      _backup_20260522_premium_history: {
        Row: {
          actor: string | null;
          actor_id: string | null;
          details: Json | null;
          id: string | null;
          occurred_at: string | null;
          payment_id: string | null;
          plan_code: string | null;
          plan_id: string | null;
          reason: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          actor?: string | null;
          actor_id?: string | null;
          details?: Json | null;
          id?: string | null;
          occurred_at?: string | null;
          payment_id?: string | null;
          plan_code?: string | null;
          plan_id?: string | null;
          reason?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          actor?: string | null;
          actor_id?: string | null;
          details?: Json | null;
          id?: string | null;
          occurred_at?: string | null;
          payment_id?: string | null;
          plan_code?: string | null;
          plan_id?: string | null;
          reason?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_pricing_plans: {
        Row: {
          active: boolean | null;
          billing_cycle: string | null;
          created_at: string | null;
          currency: string | null;
          id: string | null;
          legacy_plan_id: string | null;
          mp_preapproval_plan_id: string | null;
          mp_product_id: string | null;
          price_brl: number | null;
          product_id: string | null;
          promo_price_brl: number | null;
          sort_order: number | null;
          stripe_price_id: string | null;
          updated_at: string | null;
          visibility: string | null;
        };
        Insert: {
          active?: boolean | null;
          billing_cycle?: string | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string | null;
          legacy_plan_id?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          price_brl?: number | null;
          product_id?: string | null;
          promo_price_brl?: number | null;
          sort_order?: number | null;
          stripe_price_id?: string | null;
          updated_at?: string | null;
          visibility?: string | null;
        };
        Update: {
          active?: boolean | null;
          billing_cycle?: string | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string | null;
          legacy_plan_id?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          price_brl?: number | null;
          product_id?: string | null;
          promo_price_brl?: number | null;
          sort_order?: number | null;
          stripe_price_id?: string | null;
          updated_at?: string | null;
          visibility?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_product_features: {
        Row: {
          created_at: string | null;
          enabled: boolean | null;
          feature_key: string | null;
          limit_value: number | null;
          product_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          enabled?: boolean | null;
          feature_key?: string | null;
          limit_value?: number | null;
          product_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          enabled?: boolean | null;
          feature_key?: string | null;
          limit_value?: number | null;
          product_id?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_products: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          name: string | null;
          slug: string | null;
          sort_order: number | null;
          updated_at: string | null;
          visibility: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          slug?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          visibility?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          slug?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
          visibility?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_profiles: {
        Row: {
          alias: string | null;
          avatar_url: string | null;
          chat_reset_at: string | null;
          conversation_summary: string | null;
          created_at: string | null;
          display_name: string | null;
          email_verified_manually_at: string | null;
          emotional_state: string | null;
          essence_phrase: string | null;
          id: string | null;
          is_internal: boolean | null;
          is_test: boolean | null;
          last_activity_at: string | null;
          onboarding_completed: boolean | null;
          plan: string | null;
          ritual_style: string | null;
          subscription_synced_at: string | null;
          subscription_version: number | null;
          summary_message_count: number | null;
          summary_updated_at: string | null;
          suspended_at: string | null;
          suspended_reason: string | null;
          updated_at: string | null;
        };
        Insert: {
          alias?: string | null;
          avatar_url?: string | null;
          chat_reset_at?: string | null;
          conversation_summary?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email_verified_manually_at?: string | null;
          emotional_state?: string | null;
          essence_phrase?: string | null;
          id?: string | null;
          is_internal?: boolean | null;
          is_test?: boolean | null;
          last_activity_at?: string | null;
          onboarding_completed?: boolean | null;
          plan?: string | null;
          ritual_style?: string | null;
          subscription_synced_at?: string | null;
          subscription_version?: number | null;
          summary_message_count?: number | null;
          summary_updated_at?: string | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          updated_at?: string | null;
        };
        Update: {
          alias?: string | null;
          avatar_url?: string | null;
          chat_reset_at?: string | null;
          conversation_summary?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email_verified_manually_at?: string | null;
          emotional_state?: string | null;
          essence_phrase?: string | null;
          id?: string | null;
          is_internal?: boolean | null;
          is_test?: boolean | null;
          last_activity_at?: string | null;
          onboarding_completed?: boolean | null;
          plan?: string | null;
          ritual_style?: string | null;
          subscription_synced_at?: string | null;
          subscription_version?: number | null;
          summary_message_count?: number | null;
          summary_updated_at?: string | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_subscriptions: {
        Row: {
          billing_cycle: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created_at: string | null;
          current_period_end: string | null;
          environment: string | null;
          grace_period_until: string | null;
          id: string | null;
          mp_payer_id: string | null;
          mp_preapproval_id: string | null;
          next_payment_date: string | null;
          plan_id: string | null;
          pricing_plan_id: string | null;
          product_id: string | null;
          provider: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          billing_cycle?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created_at?: string | null;
          current_period_end?: string | null;
          environment?: string | null;
          grace_period_until?: string | null;
          id?: string | null;
          mp_payer_id?: string | null;
          mp_preapproval_id?: string | null;
          next_payment_date?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          product_id?: string | null;
          provider?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          billing_cycle?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created_at?: string | null;
          current_period_end?: string | null;
          environment?: string | null;
          grace_period_until?: string | null;
          id?: string | null;
          mp_payer_id?: string | null;
          mp_preapproval_id?: string | null;
          next_payment_date?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          product_id?: string | null;
          provider?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_user_plan_assignments: {
        Row: {
          assignment_type: string | null;
          details: Json | null;
          expires_at: string | null;
          granted_at: string | null;
          granted_by: string | null;
          id: string | null;
          plan_code: string | null;
          plan_id: string | null;
          reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          user_id: string | null;
        };
        Insert: {
          assignment_type?: string | null;
          details?: Json | null;
          expires_at?: string | null;
          granted_at?: string | null;
          granted_by?: string | null;
          id?: string | null;
          plan_code?: string | null;
          plan_id?: string | null;
          reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id?: string | null;
        };
        Update: {
          assignment_type?: string | null;
          details?: Json | null;
          expires_at?: string | null;
          granted_at?: string | null;
          granted_by?: string | null;
          id?: string | null;
          plan_code?: string | null;
          plan_id?: string | null;
          reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      _backup_20260522_user_roles: {
        Row: {
          created_at: string | null;
          disabled_at: string | null;
          granted_by: string | null;
          id: string | null;
          must_change_password: boolean | null;
          role: Database["public"]["Enums"]["app_role"] | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          disabled_at?: string | null;
          granted_by?: string | null;
          id?: string | null;
          must_change_password?: boolean | null;
          role?: Database["public"]["Enums"]["app_role"] | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          disabled_at?: string | null;
          granted_by?: string | null;
          id?: string | null;
          must_change_password?: boolean | null;
          role?: Database["public"]["Enums"]["app_role"] | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      abuse_signals: {
        Row: {
          created_at: string;
          details: Json;
          id: string;
          ip_hash: string | null;
          severity: string;
          signal_type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          details?: Json;
          id?: string;
          ip_hash?: string | null;
          severity?: string;
          signal_type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          details?: Json;
          id?: string;
          ip_hash?: string | null;
          severity?: string;
          signal_type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      account_locks: {
        Row: {
          details: Json;
          expires_at: string | null;
          id: string;
          locked_at: string;
          locked_by: string | null;
          reason: string;
          severity: string;
          unlocked_at: string | null;
          unlocked_by: string | null;
          user_id: string;
        };
        Insert: {
          details?: Json;
          expires_at?: string | null;
          id?: string;
          locked_at?: string;
          locked_by?: string | null;
          reason: string;
          severity?: string;
          unlocked_at?: string | null;
          unlocked_by?: string | null;
          user_id: string;
        };
        Update: {
          details?: Json;
          expires_at?: string | null;
          id?: string;
          locked_at?: string;
          locked_by?: string | null;
          reason?: string;
          severity?: string;
          unlocked_at?: string | null;
          unlocked_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      admin_actions_log: {
        Row: {
          action_type: string;
          actor_email: string | null;
          actor_id: string;
          error_text: string | null;
          id: string;
          ip_hash: string | null;
          occurred_at: string;
          payload: Json;
          status: string;
          target_id: string | null;
          target_type: string | null;
          user_agent: string | null;
        };
        Insert: {
          action_type: string;
          actor_email?: string | null;
          actor_id: string;
          error_text?: string | null;
          id?: string;
          ip_hash?: string | null;
          occurred_at?: string;
          payload?: Json;
          status?: string;
          target_id?: string | null;
          target_type?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action_type?: string;
          actor_email?: string | null;
          actor_id?: string;
          error_text?: string | null;
          id?: string;
          ip_hash?: string | null;
          occurred_at?: string;
          payload?: Json;
          status?: string;
          target_id?: string | null;
          target_type?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          details: Json;
          id: string;
          ip_address: string | null;
          new_role: string | null;
          occurred_at: string;
          old_role: string | null;
          target_email: string | null;
          target_id: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          details?: Json;
          id?: string;
          ip_address?: string | null;
          new_role?: string | null;
          occurred_at?: string;
          old_role?: string | null;
          target_email?: string | null;
          target_id?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          details?: Json;
          id?: string;
          ip_address?: string | null;
          new_role?: string | null;
          occurred_at?: string;
          old_role?: string | null;
          target_email?: string | null;
          target_id?: string | null;
        };
        Relationships: [];
      };
      admin_login_attempts: {
        Row: {
          attempted_at: string;
          details: Json;
          email: string;
          id: string;
          ip_hash: string | null;
          success: boolean;
          user_agent: string | null;
        };
        Insert: {
          attempted_at?: string;
          details?: Json;
          email: string;
          id?: string;
          ip_hash?: string | null;
          success?: boolean;
          user_agent?: string | null;
        };
        Update: {
          attempted_at?: string;
          details?: Json;
          email?: string;
          id?: string;
          ip_hash?: string | null;
          success?: boolean;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      admin_notes: {
        Row: {
          author_email: string | null;
          author_id: string;
          category: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          pinned: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          author_email?: string | null;
          author_id: string;
          category?: string;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          pinned?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_email?: string | null;
          author_id?: string;
          category?: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          pinned?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_usage_daily: {
        Row: {
          created_at: string;
          est_cost_usd: number;
          id: string;
          input_tokens: number;
          message_count: number;
          output_tokens: number;
          session_minutes: number;
          total_tokens: number;
          updated_at: string;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          est_cost_usd?: number;
          id?: string;
          input_tokens?: number;
          message_count?: number;
          output_tokens?: number;
          session_minutes?: number;
          total_tokens?: number;
          updated_at?: string;
          usage_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          est_cost_usd?: number;
          id?: string;
          input_tokens?: number;
          message_count?: number;
          output_tokens?: number;
          session_minutes?: number;
          total_tokens?: number;
          updated_at?: string;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ai_usage_events: {
        Row: {
          conversation_id: string | null;
          created_at: string;
          error_text: string | null;
          est_cost_usd: number;
          id: string;
          input_tokens: number;
          latency_ms: number | null;
          model: string;
          output_tokens: number;
          status: string;
          total_tokens: number | null;
          user_id: string;
        };
        Insert: {
          conversation_id?: string | null;
          created_at?: string;
          error_text?: string | null;
          est_cost_usd?: number;
          id?: string;
          input_tokens?: number;
          latency_ms?: number | null;
          model: string;
          output_tokens?: number;
          status?: string;
          total_tokens?: number | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string;
          error_text?: string | null;
          est_cost_usd?: number;
          id?: string;
          input_tokens?: number;
          latency_ms?: number | null;
          model?: string;
          output_tokens?: number;
          status?: string;
          total_tokens?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      archived_memory: {
        Row: {
          archived_at: string;
          category: string;
          compressed_summary: string;
          id: string;
          source_count: number;
          user_id: string;
        };
        Insert: {
          archived_at?: string;
          category: string;
          compressed_summary: string;
          id?: string;
          source_count?: number;
          user_id: string;
        };
        Update: {
          archived_at?: string;
          category?: string;
          compressed_summary?: string;
          id?: string;
          source_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          contact_type: string;
          created_at: string;
          email: string;
          id: string;
          ip_hash: string | null;
          message: string;
          name: string;
          status: string;
          user_agent: string | null;
        };
        Insert: {
          contact_type: string;
          created_at?: string;
          email: string;
          id?: string;
          ip_hash?: string | null;
          message: string;
          name: string;
          status?: string;
          user_agent?: string | null;
        };
        Update: {
          contact_type?: string;
          created_at?: string;
          email?: string;
          id?: string;
          ip_hash?: string | null;
          message?: string;
          name?: string;
          status?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      daily_ops_reports: {
        Row: {
          active_subscriptions: number;
          active_users: number;
          ai_cost_usd: number;
          details: Json;
          generated_at: string;
          messages_sent: number;
          mrr_brl: number;
          new_signups: number;
          payments_approved: number;
          payments_failed: number;
          report_date: string;
          webhook_errors: number;
        };
        Insert: {
          active_subscriptions?: number;
          active_users?: number;
          ai_cost_usd?: number;
          details?: Json;
          generated_at?: string;
          messages_sent?: number;
          mrr_brl?: number;
          new_signups?: number;
          payments_approved?: number;
          payments_failed?: number;
          report_date: string;
          webhook_errors?: number;
        };
        Update: {
          active_subscriptions?: number;
          active_users?: number;
          ai_cost_usd?: number;
          details?: Json;
          generated_at?: string;
          messages_sent?: number;
          mrr_brl?: number;
          new_signups?: number;
          payments_approved?: number;
          payments_failed?: number;
          report_date?: string;
          webhook_errors?: number;
        };
        Relationships: [];
      };
      email_send_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email?: string;
          status?: string;
          template_name?: string;
        };
        Relationships: [];
      };
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number;
          batch_size: number;
          id: number;
          retry_after_until: string | null;
          send_delay_ms: number;
          transactional_email_ttl_minutes: number;
          updated_at: string;
        };
        Insert: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Update: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_unsubscribe_tokens: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      emotional_assessments: {
        Row: {
          completed_at: string | null;
          created_at: string;
          desire: string | null;
          emotional_state: string | null;
          emotional_weight: number | null;
          free_answers: Json;
          id: string;
          intention: string | null;
          need: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          desire?: string | null;
          emotional_state?: string | null;
          emotional_weight?: number | null;
          free_answers?: Json;
          id?: string;
          intention?: string | null;
          need?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          desire?: string | null;
          emotional_state?: string | null;
          emotional_weight?: number | null;
          free_answers?: Json;
          id?: string;
          intention?: string | null;
          need?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      emotional_memories: {
        Row: {
          content: string;
          created_at: string;
          emotion: string | null;
          id: string;
          importance: number;
          is_paused: boolean;
          last_used_at: string | null;
          memory_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          emotion?: string | null;
          id?: string;
          importance?: number;
          is_paused?: boolean;
          last_used_at?: string | null;
          memory_type?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          emotion?: string | null;
          id?: string;
          importance?: number;
          is_paused?: boolean;
          last_used_at?: string | null;
          memory_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      endpoint_metrics: {
        Row: {
          details: Json;
          id: string;
          latency_ms: number;
          method: string;
          occurred_at: string;
          path: string;
          status_code: number;
          user_id: string | null;
        };
        Insert: {
          details?: Json;
          id?: string;
          latency_ms?: number;
          method?: string;
          occurred_at?: string;
          path: string;
          status_code?: number;
          user_id?: string | null;
        };
        Update: {
          details?: Json;
          id?: string;
          latency_ms?: number;
          method?: string;
          occurred_at?: string;
          path?: string;
          status_code?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      favorite_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          message_created_at: string | null;
          message_id: string | null;
          note: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          message_created_at?: string | null;
          message_id?: string | null;
          note?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          message_created_at?: string | null;
          message_id?: string | null;
          note?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_messages_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      features: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          key: string;
          name: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string | null;
          key: string;
          name: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          key?: string;
          name?: string;
        };
        Relationships: [];
      };
      guest_sessions: {
        Row: {
          created_at: string;
          guest_session_id: string;
          last_activity: string;
          message_count: number;
        };
        Insert: {
          created_at?: string;
          guest_session_id: string;
          last_activity?: string;
          message_count?: number;
        };
        Update: {
          created_at?: string;
          guest_session_id?: string;
          last_activity?: string;
          message_count?: number;
        };
        Relationships: [];
      };
      legal_consents: {
        Row: {
          accepted_at: string;
          age_confirmed: boolean;
          created_at: string;
          id: string;
          ip_hash: string | null;
          privacy_accepted: boolean;
          privacy_version: string;
          source: string;
          terms_accepted: boolean;
          terms_version: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          accepted_at?: string;
          age_confirmed?: boolean;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          privacy_accepted?: boolean;
          privacy_version: string;
          source?: string;
          terms_accepted?: boolean;
          terms_version: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          accepted_at?: string;
          age_confirmed?: boolean;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          privacy_accepted?: boolean;
          privacy_version?: string;
          source?: string;
          terms_accepted?: boolean;
          terms_version?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      memory_consolidation_runs: {
        Row: {
          after_count: number;
          before_count: number;
          details: Json;
          id: string;
          ran_at: string;
          removed_count: number;
          user_id: string;
        };
        Insert: {
          after_count?: number;
          before_count?: number;
          details?: Json;
          id?: string;
          ran_at?: string;
          removed_count?: number;
          user_id: string;
        };
        Update: {
          after_count?: number;
          before_count?: number;
          details?: Json;
          id?: string;
          ran_at?: string;
          removed_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      memory_identity_history: {
        Row: {
          confidence: number;
          evidence_count: number;
          id: string;
          key: string;
          new_value: string | null;
          prev_value: string | null;
          reason: string | null;
          recorded_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          confidence?: number;
          evidence_count?: number;
          id?: string;
          key: string;
          new_value?: string | null;
          prev_value?: string | null;
          reason?: string | null;
          recorded_at?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          confidence?: number;
          evidence_count?: number;
          id?: string;
          key?: string;
          new_value?: string | null;
          prev_value?: string | null;
          reason?: string | null;
          recorded_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      memory_job_runs: {
        Row: {
          details: Json;
          error: string | null;
          finished_at: string | null;
          id: string;
          job_name: string;
          started_at: string;
          status: string;
        };
        Insert: {
          details?: Json;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          job_name: string;
          started_at?: string;
          status?: string;
        };
        Update: {
          details?: Json;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          job_name?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      memory_locks: {
        Row: {
          acquired_at: string;
          key: string;
        };
        Insert: {
          acquired_at?: string;
          key: string;
        };
        Update: {
          acquired_at?: string;
          key?: string;
        };
        Relationships: [];
      };
      payment_anomalies: {
        Row: {
          acknowledged_at: string | null;
          anomaly_type: string;
          details: Json;
          detected_at: string;
          id: string;
          payment_id: string | null;
          severity: string;
          user_id: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          anomaly_type: string;
          details?: Json;
          detected_at?: string;
          id?: string;
          payment_id?: string | null;
          severity?: string;
          user_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          anomaly_type?: string;
          details?: Json;
          detected_at?: string;
          id?: string;
          payment_id?: string | null;
          severity?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      payment_retry_attempts: {
        Row: {
          attempt_number: number;
          attempted_at: string;
          details: Json;
          id: string;
          payment_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          attempt_number?: number;
          attempted_at?: string;
          details?: Json;
          id?: string;
          payment_id: string;
          status: string;
          user_id: string;
        };
        Update: {
          attempt_number?: number;
          attempted_at?: string;
          details?: Json;
          id?: string;
          payment_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          id: string;
          mp_payment_id: string | null;
          mp_preapproval_id: string | null;
          paid_at: string | null;
          payment_method: string;
          payment_type: string;
          pix_expires_at: string | null;
          pix_qr_code: string | null;
          pix_qr_code_base64: string | null;
          plan_id: string | null;
          pricing_plan_id: string | null;
          provider: string;
          raw: Json;
          status: string;
          status_detail: string | null;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          id?: string;
          mp_payment_id?: string | null;
          mp_preapproval_id?: string | null;
          paid_at?: string | null;
          payment_method: string;
          payment_type: string;
          pix_expires_at?: string | null;
          pix_qr_code?: string | null;
          pix_qr_code_base64?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          provider?: string;
          raw?: Json;
          status: string;
          status_detail?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          mp_payment_id?: string | null;
          mp_preapproval_id?: string | null;
          paid_at?: string | null;
          payment_method?: string;
          payment_type?: string;
          pix_expires_at?: string | null;
          pix_qr_code?: string | null;
          pix_qr_code_base64?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          provider?: string;
          raw?: Json;
          status?: string;
          status_detail?: string | null;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_pricing_plan_id_fkey";
            columns: ["pricing_plan_id"];
            isOneToOne: false;
            referencedRelation: "pricing_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      personality_snapshots: {
        Row: {
          avg_msg_length: number;
          captured_at: string;
          details: Json;
          dominant_emotion: string | null;
          drift_score: number;
          drift_signals: Json;
          emotion_distribution: Json;
          id: string;
          memory_count: number;
          msg_count_window: number;
          segment: string | null;
          user_id: string;
        };
        Insert: {
          avg_msg_length?: number;
          captured_at?: string;
          details?: Json;
          dominant_emotion?: string | null;
          drift_score?: number;
          drift_signals?: Json;
          emotion_distribution?: Json;
          id?: string;
          memory_count?: number;
          msg_count_window?: number;
          segment?: string | null;
          user_id: string;
        };
        Update: {
          avg_msg_length?: number;
          captured_at?: string;
          details?: Json;
          dominant_emotion?: string | null;
          drift_score?: number;
          drift_signals?: Json;
          emotion_distribution?: Json;
          id?: string;
          memory_count?: number;
          msg_count_window?: number;
          segment?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          active: boolean;
          ai_priority: number;
          archived_at: string | null;
          badge_label: string | null;
          billing_cycle: string;
          billing_enabled: boolean;
          created_at: string;
          currency: string;
          daily_message_limit: number | null;
          description: string | null;
          featured: boolean;
          id: string;
          long_description: string | null;
          max_conversations: number | null;
          memory_context_size: number | null;
          monthly_token_limit: number | null;
          mp_checkout_reference: string | null;
          mp_preapproval_plan_id: string | null;
          mp_product_id: string | null;
          name: string;
          plan_code: string;
          premium_features: Json;
          price_brl: number;
          promo_price_brl: number | null;
          soft_limit_pct: number;
          sort_order: number;
          tier: string;
          trial_days: number;
          updated_at: string;
          vip_features: Json;
        };
        Insert: {
          active?: boolean;
          ai_priority?: number;
          archived_at?: string | null;
          badge_label?: string | null;
          billing_cycle: string;
          billing_enabled?: boolean;
          created_at?: string;
          currency?: string;
          daily_message_limit?: number | null;
          description?: string | null;
          featured?: boolean;
          id?: string;
          long_description?: string | null;
          max_conversations?: number | null;
          memory_context_size?: number | null;
          monthly_token_limit?: number | null;
          mp_checkout_reference?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          name: string;
          plan_code: string;
          premium_features?: Json;
          price_brl: number;
          promo_price_brl?: number | null;
          soft_limit_pct?: number;
          sort_order?: number;
          tier: string;
          trial_days?: number;
          updated_at?: string;
          vip_features?: Json;
        };
        Update: {
          active?: boolean;
          ai_priority?: number;
          archived_at?: string | null;
          badge_label?: string | null;
          billing_cycle?: string;
          billing_enabled?: boolean;
          created_at?: string;
          currency?: string;
          daily_message_limit?: number | null;
          description?: string | null;
          featured?: boolean;
          id?: string;
          long_description?: string | null;
          max_conversations?: number | null;
          memory_context_size?: number | null;
          monthly_token_limit?: number | null;
          mp_checkout_reference?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          name?: string;
          plan_code?: string;
          premium_features?: Json;
          price_brl?: number;
          promo_price_brl?: number | null;
          soft_limit_pct?: number;
          sort_order?: number;
          tier?: string;
          trial_days?: number;
          updated_at?: string;
          vip_features?: Json;
        };
        Relationships: [];
      };
      premium_history: {
        Row: {
          actor: string;
          actor_id: string | null;
          details: Json;
          id: string;
          occurred_at: string;
          payment_id: string | null;
          plan_code: string | null;
          plan_id: string | null;
          reason: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          actor?: string;
          actor_id?: string | null;
          details?: Json;
          id?: string;
          occurred_at?: string;
          payment_id?: string | null;
          plan_code?: string | null;
          plan_id?: string | null;
          reason?: string | null;
          status: string;
          user_id: string;
        };
        Update: {
          actor?: string;
          actor_id?: string | null;
          details?: Json;
          id?: string;
          occurred_at?: string;
          payment_id?: string | null;
          plan_code?: string | null;
          plan_id?: string | null;
          reason?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pricing_plans: {
        Row: {
          active: boolean;
          billing_cycle: string;
          created_at: string;
          currency: string;
          id: string;
          legacy_plan_id: string | null;
          mp_preapproval_plan_id: string | null;
          mp_product_id: string | null;
          price_brl: number;
          product_id: string;
          promo_price_brl: number | null;
          sort_order: number;
          stripe_price_id: string | null;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          active?: boolean;
          billing_cycle: string;
          created_at?: string;
          currency?: string;
          id?: string;
          legacy_plan_id?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          price_brl: number;
          product_id: string;
          promo_price_brl?: number | null;
          sort_order?: number;
          stripe_price_id?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          active?: boolean;
          billing_cycle?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          legacy_plan_id?: string | null;
          mp_preapproval_plan_id?: string | null;
          mp_product_id?: string | null;
          price_brl?: number;
          product_id?: string;
          promo_price_brl?: number | null;
          sort_order?: number;
          stripe_price_id?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pricing_plans_legacy_plan_id_fkey";
            columns: ["legacy_plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pricing_plans_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_features: {
        Row: {
          created_at: string;
          enabled: boolean;
          feature_key: string;
          limit_value: number | null;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          feature_key: string;
          limit_value?: number | null;
          product_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          feature_key?: string;
          limit_value?: number | null;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_features_feature_key_fkey";
            columns: ["feature_key"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "product_features_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          ai_priority: number;
          created_at: string;
          daily_message_limit: number | null;
          description: string | null;
          id: string;
          max_conversations: number | null;
          memory_context_size: number | null;
          monthly_token_limit: number | null;
          name: string;
          premium_features: Json;
          slug: string;
          soft_limit_pct: number;
          sort_order: number;
          tier: string;
          updated_at: string;
          vip_features: Json;
          visibility: string;
        };
        Insert: {
          active?: boolean;
          ai_priority?: number;
          created_at?: string;
          daily_message_limit?: number | null;
          description?: string | null;
          id?: string;
          max_conversations?: number | null;
          memory_context_size?: number | null;
          monthly_token_limit?: number | null;
          name: string;
          premium_features?: Json;
          slug: string;
          soft_limit_pct?: number;
          sort_order?: number;
          tier?: string;
          updated_at?: string;
          vip_features?: Json;
          visibility?: string;
        };
        Update: {
          active?: boolean;
          ai_priority?: number;
          created_at?: string;
          daily_message_limit?: number | null;
          description?: string | null;
          id?: string;
          max_conversations?: number | null;
          memory_context_size?: number | null;
          monthly_token_limit?: number | null;
          name?: string;
          premium_features?: Json;
          slug?: string;
          soft_limit_pct?: number;
          sort_order?: number;
          tier?: string;
          updated_at?: string;
          vip_features?: Json;
          visibility?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          alias: string | null;
          avatar_url: string | null;
          chat_reset_at: string | null;
          conversation_summary: string | null;
          created_at: string;
          display_name: string | null;
          email_verified_manually_at: string | null;
          emotional_state: string | null;
          essence_phrase: string | null;
          id: string;
          is_internal: boolean;
          is_test: boolean;
          last_activity_at: string | null;
          memory_wipe_at: string | null;
          onboarding_completed: boolean;
          plan: string;
          ritual_style: string | null;
          subscription_synced_at: string;
          subscription_version: number;
          summary_message_count: number;
          summary_updated_at: string | null;
          suspended_at: string | null;
          suspended_reason: string | null;
          updated_at: string;
        };
        Insert: {
          alias?: string | null;
          avatar_url?: string | null;
          chat_reset_at?: string | null;
          conversation_summary?: string | null;
          created_at?: string;
          display_name?: string | null;
          email_verified_manually_at?: string | null;
          emotional_state?: string | null;
          essence_phrase?: string | null;
          id: string;
          is_internal?: boolean;
          is_test?: boolean;
          last_activity_at?: string | null;
          memory_wipe_at?: string | null;
          onboarding_completed?: boolean;
          plan?: string;
          ritual_style?: string | null;
          subscription_synced_at?: string;
          subscription_version?: number;
          summary_message_count?: number;
          summary_updated_at?: string | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          alias?: string | null;
          avatar_url?: string | null;
          chat_reset_at?: string | null;
          conversation_summary?: string | null;
          created_at?: string;
          display_name?: string | null;
          email_verified_manually_at?: string | null;
          emotional_state?: string | null;
          essence_phrase?: string | null;
          id?: string;
          is_internal?: boolean;
          is_test?: boolean;
          last_activity_at?: string | null;
          memory_wipe_at?: string | null;
          onboarding_completed?: boolean;
          plan?: string;
          ritual_style?: string | null;
          subscription_synced_at?: string;
          subscription_version?: number;
          summary_message_count?: number;
          summary_updated_at?: string | null;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limit_buckets: {
        Row: {
          bucket_key: string;
          count: number;
          updated_at: string;
          window_start: string;
        };
        Insert: {
          bucket_key: string;
          count?: number;
          updated_at?: string;
          window_start?: string;
        };
        Update: {
          bucket_key?: string;
          count?: number;
          updated_at?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reengagement_queue: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          dedupe_key: string;
          error_text: string | null;
          id: string;
          payload: Json;
          reason: string;
          scheduled_at: string;
          sent_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          dedupe_key: string;
          error_text?: string | null;
          id?: string;
          payload?: Json;
          reason: string;
          scheduled_at?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          dedupe_key?: string;
          error_text?: string | null;
          id?: string;
          payload?: Json;
          reason?: string;
          scheduled_at?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_cycle: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          environment: string;
          grace_period_until: string | null;
          id: string;
          mp_payer_id: string | null;
          mp_preapproval_id: string | null;
          next_payment_date: string | null;
          plan_id: string | null;
          pricing_plan_id: string | null;
          product_id: string | null;
          provider: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_cycle?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          environment?: string;
          grace_period_until?: string | null;
          id?: string;
          mp_payer_id?: string | null;
          mp_preapproval_id?: string | null;
          next_payment_date?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          product_id?: string | null;
          provider?: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_cycle?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          environment?: string;
          grace_period_until?: string | null;
          id?: string;
          mp_payer_id?: string | null;
          mp_preapproval_id?: string | null;
          next_payment_date?: string | null;
          plan_id?: string | null;
          pricing_plan_id?: string | null;
          product_id?: string | null;
          provider?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_pricing_plan_id_fkey";
            columns: ["pricing_plan_id"];
            isOneToOne: false;
            referencedRelation: "pricing_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      suppressed_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          metadata: Json | null;
          reason: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          metadata?: Json | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string;
        };
        Relationships: [];
      };
      temporary_conversation_chunks: {
        Row: {
          content: string;
          created_at: string;
          expires_at: string;
          id: string;
          role: string;
          token_estimate: number;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          role: string;
          token_estimate?: number;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          role?: string;
          token_estimate?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_daily_usage: {
        Row: {
          created_at: string;
          id: string;
          message_count: number;
          subscription_type: string;
          updated_at: string;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message_count?: number;
          subscription_type?: string;
          updated_at?: string;
          usage_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message_count?: number;
          subscription_type?: string;
          updated_at?: string;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_emotional_state: {
        Row: {
          context_summary: string | null;
          intensity: number;
          primary_emotion: string | null;
          secondary_emotion: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          context_summary?: string | null;
          intensity?: number;
          primary_emotion?: string | null;
          secondary_emotion?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          context_summary?: string | null;
          intensity?: number;
          primary_emotion?: string | null;
          secondary_emotion?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_identity_memory: {
        Row: {
          created_at: string;
          evidence_count: number;
          last_updated_at: string;
          profile: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          evidence_count?: number;
          last_updated_at?: string;
          profile?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          evidence_count?: number;
          last_updated_at?: string;
          profile?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      user_memory_events: {
        Row: {
          canonical_key: string;
          category: string;
          confidence: number;
          content: string;
          created_at: string;
          decay_score: number;
          emotion: string | null;
          emotional_weight: number;
          entry_type: string;
          expires_at: string;
          id: string;
          importance: number;
          intensity: number;
          last_reinforced_at: string;
          reinforcement_count: number;
          user_id: string;
        };
        Insert: {
          canonical_key: string;
          category: string;
          confidence?: number;
          content: string;
          created_at?: string;
          decay_score?: number;
          emotion?: string | null;
          emotional_weight?: number;
          entry_type?: string;
          expires_at?: string;
          id?: string;
          importance?: number;
          intensity?: number;
          last_reinforced_at?: string;
          reinforcement_count?: number;
          user_id: string;
        };
        Update: {
          canonical_key?: string;
          category?: string;
          confidence?: number;
          content?: string;
          created_at?: string;
          decay_score?: number;
          emotion?: string | null;
          emotional_weight?: number;
          entry_type?: string;
          expires_at?: string;
          id?: string;
          importance?: number;
          intensity?: number;
          last_reinforced_at?: string;
          reinforcement_count?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_memory_summaries: {
        Row: {
          confidence: number;
          created_at: string;
          decay_score: number;
          emotional_weight: number;
          id: string;
          importance: number;
          last_reinforced_at: string;
          source_event_count: number;
          summary: string;
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: number;
          created_at?: string;
          decay_score?: number;
          emotional_weight?: number;
          id?: string;
          importance?: number;
          last_reinforced_at?: string;
          source_event_count?: number;
          summary: string;
          theme: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          decay_score?: number;
          emotional_weight?: number;
          id?: string;
          importance?: number;
          last_reinforced_at?: string;
          source_event_count?: number;
          summary?: string;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_plan_assignments: {
        Row: {
          assignment_type: string;
          details: Json;
          expires_at: string | null;
          granted_at: string;
          granted_by: string | null;
          id: string;
          plan_code: string;
          plan_id: string | null;
          reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          user_id: string;
        };
        Insert: {
          assignment_type: string;
          details?: Json;
          expires_at?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          plan_code: string;
          plan_id?: string | null;
          reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id: string;
        };
        Update: {
          assignment_type?: string;
          details?: Json;
          expires_at?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          plan_code?: string;
          plan_id?: string | null;
          reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          disabled_at: string | null;
          granted_by: string | null;
          id: string;
          must_change_password: boolean;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          disabled_at?: string | null;
          granted_by?: string | null;
          id?: string;
          must_change_password?: boolean;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          disabled_at?: string | null;
          granted_by?: string | null;
          id?: string;
          must_change_password?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_segments: {
        Row: {
          computed_at: string;
          details: Json;
          id: string;
          score: number;
          segment: string;
          user_id: string;
        };
        Insert: {
          computed_at?: string;
          details?: Json;
          id?: string;
          score?: number;
          segment: string;
          user_id: string;
        };
        Update: {
          computed_at?: string;
          details?: Json;
          id?: string;
          score?: number;
          segment?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          source: string;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          source?: string;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          source?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          error_text: string | null;
          event_type: string;
          external_id: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
        };
        Insert: {
          created_at?: string;
          error_text?: string | null;
          event_type: string;
          external_id: string;
          id?: string;
          payload: Json;
          processed_at?: string | null;
          provider?: string;
        };
        Update: {
          created_at?: string;
          error_text?: string | null;
          event_type?: string;
          external_id?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_assign_subscription: {
        Args: {
          _actor_id: string;
          _expires_at: string;
          _pricing_plan_id: string;
          _reason: string;
          _user_id: string;
        };
        Returns: Json;
      };
      admin_delete_user_data: { Args: { _user_id: string }; Returns: undefined };
      apply_manual_plan: {
        Args: {
          _actor_id: string;
          _assignment_type: string;
          _expires_at: string;
          _plan_code: string;
          _reason: string;
          _user_id: string;
        };
        Returns: Json;
      };
      bump_rate_limit: {
        Args: {
          _bucket_key: string;
          _increment?: number;
          _window_seconds: number;
        };
        Returns: number;
      };
      count_active_super_admins: { Args: never; Returns: number };
      delete_email: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      enqueue_email: {
        Args: { payload: Json; queue_name: string };
        Returns: number;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      ingest_memory_event: {
        Args: {
          _canonical_key: string;
          _category: string;
          _confidence: number;
          _content: string;
          _emotion: string;
          _emotional_weight: number;
          _entry_type: string;
          _expires_at: string;
          _importance: number;
          _intensity: number;
          _request_started_at: string;
          _user_id: string;
        };
        Returns: string;
      };
      is_account_blocked: { Args: { _user_id: string }; Returns: boolean };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_root_owner: { Args: { _user_id: string }; Returns: boolean };
      is_super_admin: { Args: { _user_id: string }; Returns: boolean };
      is_user_locked: { Args: { _user_id: string }; Returns: boolean };
      move_to_dlq: {
        Args: {
          dlq_name: string;
          message_id: number;
          payload: Json;
          source_queue: string;
        };
        Returns: number;
      };
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number };
        Returns: {
          message: Json;
          msg_id: number;
          read_ct: number;
        }[];
      };
      register_admin_login_attempt: {
        Args: {
          _email: string;
          _ip_hash: string;
          _success: boolean;
          _user_agent: string;
        };
        Returns: Json;
      };
      release_memory_lock: { Args: { _key: string }; Returns: undefined };
      resolve_user_entitlement: { Args: { _user_id: string }; Returns: Json };
      touch_subscription_state: {
        Args: { _user_id: string };
        Returns: undefined;
      };
      try_memory_lock: {
        Args: { _key: string; _ttl_seconds?: number };
        Returns: boolean;
      };
      user_features: {
        Args: { _user_id: string };
        Returns: {
          enabled: boolean;
          feature_key: string;
          limit_value: number;
        }[];
      };
      user_has_feature: {
        Args: { _feature_key: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role:
        | "super_admin"
        | "support"
        | "finance"
        | "analytics"
        | "admin"
        | "user"
        | "moderator";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "support", "finance", "analytics", "admin", "user", "moderator"],
    },
  },
} as const;
