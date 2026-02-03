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
      access_logs: {
        Row: {
          checkin_at: string
          checkin_method: string | null
          checkout_at: string | null
          company_id: string
          created_at: string | null
          id: string
          member_id: string
          notes: string | null
          status: Database["public"]["Enums"]["checkin_status"] | null
        }
        Insert: {
          checkin_at?: string
          checkin_method?: string | null
          checkout_at?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          member_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checkin_status"] | null
        }
        Update: {
          checkin_at?: string
          checkin_method?: string | null
          checkout_at?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["checkin_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          company_id: string
          context_data: Json | null
          conversation_stage: string | null
          current_agent_id: string | null
          customer_id: string | null
          customer_type: string | null
          ended_at: string | null
          id: string
          last_message_at: string | null
          phone: string
          started_at: string | null
          ticket_id: string | null
        }
        Insert: {
          company_id: string
          context_data?: Json | null
          conversation_stage?: string | null
          current_agent_id?: string | null
          customer_id?: string | null
          customer_type?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          phone: string
          started_at?: string | null
          ticket_id?: string | null
        }
        Update: {
          company_id?: string
          context_data?: Json | null
          conversation_stage?: string | null
          current_agent_id?: string | null
          customer_id?: string | null
          customer_type?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          phone?: string
          started_at?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_execution_logs: {
        Row: {
          agent_id: string | null
          company_id: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          execution_type: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          success: boolean | null
          tokens_used: number | null
        }
        Insert: {
          agent_id?: string | null
          company_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          execution_type?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string | null
          company_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          execution_type?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_execution_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_execution_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          key: string
          memory_type: string | null
          phone: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key: string
          memory_type?: string | null
          phone: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          memory_type?: string | null
          phone?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          agent_id: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tool_call_results: Json | null
          tool_calls: Json | null
        }
        Insert: {
          agent_id?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tool_call_results?: Json | null
          tool_calls?: Json | null
        }
        Update: {
          agent_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tool_call_results?: Json | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tools: {
        Row: {
          company_id: string | null
          configuration: Json | null
          created_at: string | null
          description: string
          display_name: string
          function_schema: Json
          id: string
          is_active: boolean | null
          is_system_tool: boolean | null
          name: string
          tool_type: string
        }
        Insert: {
          company_id?: string | null
          configuration?: Json | null
          created_at?: string | null
          description: string
          display_name: string
          function_schema: Json
          id?: string
          is_active?: boolean | null
          is_system_tool?: boolean | null
          name: string
          tool_type: string
        }
        Update: {
          company_id?: string | null
          configuration?: Json | null
          created_at?: string | null
          description?: string
          display_name?: string
          function_schema?: Json
          id?: string
          is_active?: boolean | null
          is_system_tool?: boolean | null
          name?: string
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_conversations: {
        Row: {
          agent_id: string
          company_id: string
          contact_id: string | null
          context_data: Json | null
          created_at: string | null
          ended_at: string | null
          feedback_rating: number | null
          handoff_reason: string | null
          id: string
          message_count: number | null
          started_at: string | null
          status:
            | Database["public"]["Enums"]["ai_agent_conversation_status"]
            | null
          success: boolean | null
          ticket_id: string | null
          tools_called: Json | null
        }
        Insert: {
          agent_id: string
          company_id: string
          contact_id?: string | null
          context_data?: Json | null
          created_at?: string | null
          ended_at?: string | null
          feedback_rating?: number | null
          handoff_reason?: string | null
          id?: string
          message_count?: number | null
          started_at?: string | null
          status?:
            | Database["public"]["Enums"]["ai_agent_conversation_status"]
            | null
          success?: boolean | null
          ticket_id?: string | null
          tools_called?: Json | null
        }
        Update: {
          agent_id?: string
          company_id?: string
          contact_id?: string | null
          context_data?: Json | null
          created_at?: string | null
          ended_at?: string | null
          feedback_rating?: number | null
          handoff_reason?: string | null
          id?: string
          message_count?: number | null
          started_at?: string | null
          status?:
            | Database["public"]["Enums"]["ai_agent_conversation_status"]
            | null
          success?: boolean | null
          ticket_id?: string | null
          tools_called?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_flows: {
        Row: {
          actions: Json | null
          agent_id: string
          created_at: string | null
          id: string
          message_template: string | null
          next_stage_id: string | null
          stage_name: string
          stage_order: number | null
          trigger_condition: Json | null
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          agent_id: string
          created_at?: string | null
          id?: string
          message_template?: string | null
          next_stage_id?: string | null
          stage_name: string
          stage_order?: number | null
          trigger_condition?: Json | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          agent_id?: string
          created_at?: string | null
          id?: string
          message_template?: string | null
          next_stage_id?: string | null
          stage_name?: string
          stage_order?: number | null
          trigger_condition?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_flows_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_flows_next_stage_id_fkey"
            columns: ["next_stage_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_knowledge_config: {
        Row: {
          accepts_children: boolean | null
          accepts_gympass: boolean | null
          accepts_totalpass: boolean | null
          accepts_wellhub: boolean | null
          additional_info: string | null
          address: string | null
          agent_id: string | null
          children_min_age: number | null
          company_id: string
          created_at: string | null
          email: string | null
          enrollment_fee_value: number | null
          family_discount_details: string | null
          google_maps_link: string | null
          gympass_plans: string | null
          has_air_conditioning: boolean | null
          has_enrollment_fee: boolean | null
          has_family_discount: boolean | null
          has_lockers: boolean | null
          has_parking: boolean | null
          has_showers: boolean | null
          has_wifi: boolean | null
          id: string
          instagram: string | null
          offers_trial_class: boolean | null
          opening_hours: string | null
          other_aggregators: string | null
          other_amenities: string | null
          phone: string | null
          plans_from_system: boolean | null
          plans_manual: string | null
          schedules_auto: boolean | null
          totalpass_plans: string | null
          trial_class_details: string | null
          updated_at: string | null
          wellhub_plans: string | null
          whatsapp_group_enabled: boolean | null
          whatsapp_group_link: string | null
        }
        Insert: {
          accepts_children?: boolean | null
          accepts_gympass?: boolean | null
          accepts_totalpass?: boolean | null
          accepts_wellhub?: boolean | null
          additional_info?: string | null
          address?: string | null
          agent_id?: string | null
          children_min_age?: number | null
          company_id: string
          created_at?: string | null
          email?: string | null
          enrollment_fee_value?: number | null
          family_discount_details?: string | null
          google_maps_link?: string | null
          gympass_plans?: string | null
          has_air_conditioning?: boolean | null
          has_enrollment_fee?: boolean | null
          has_family_discount?: boolean | null
          has_lockers?: boolean | null
          has_parking?: boolean | null
          has_showers?: boolean | null
          has_wifi?: boolean | null
          id?: string
          instagram?: string | null
          offers_trial_class?: boolean | null
          opening_hours?: string | null
          other_aggregators?: string | null
          other_amenities?: string | null
          phone?: string | null
          plans_from_system?: boolean | null
          plans_manual?: string | null
          schedules_auto?: boolean | null
          totalpass_plans?: string | null
          trial_class_details?: string | null
          updated_at?: string | null
          wellhub_plans?: string | null
          whatsapp_group_enabled?: boolean | null
          whatsapp_group_link?: string | null
        }
        Update: {
          accepts_children?: boolean | null
          accepts_gympass?: boolean | null
          accepts_totalpass?: boolean | null
          accepts_wellhub?: boolean | null
          additional_info?: string | null
          address?: string | null
          agent_id?: string | null
          children_min_age?: number | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          enrollment_fee_value?: number | null
          family_discount_details?: string | null
          google_maps_link?: string | null
          gympass_plans?: string | null
          has_air_conditioning?: boolean | null
          has_enrollment_fee?: boolean | null
          has_family_discount?: boolean | null
          has_lockers?: boolean | null
          has_parking?: boolean | null
          has_showers?: boolean | null
          has_wifi?: boolean | null
          id?: string
          instagram?: string | null
          offers_trial_class?: boolean | null
          opening_hours?: string | null
          other_aggregators?: string | null
          other_amenities?: string | null
          phone?: string | null
          plans_from_system?: boolean | null
          plans_manual?: string | null
          schedules_auto?: boolean | null
          totalpass_plans?: string | null
          trial_class_details?: string | null
          updated_at?: string | null
          wellhub_plans?: string | null
          whatsapp_group_enabled?: boolean | null
          whatsapp_group_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_knowledge_config_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["ai_agent_message_role"]
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["ai_agent_message_role"]
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["ai_agent_message_role"]
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_subagents: {
        Row: {
          agent_id: string
          created_at: string | null
          execution_order: number | null
          id: string
          is_active: boolean | null
          sub_agent_id: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          sub_agent_id: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          sub_agent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_subagents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_subagents_sub_agent_id_fkey"
            columns: ["sub_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_sub_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_templates: {
        Row: {
          agent_config: Json
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          preview_image_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          agent_config?: Json
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          preview_image_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          agent_config?: Json
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          preview_image_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_tool_library: {
        Row: {
          configuration_schema: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_integration: string | null
          tool_type: Database["public"]["Enums"]["ai_agent_tool_type"]
          updated_at: string | null
        }
        Insert: {
          configuration_schema?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_integration?: string | null
          tool_type: Database["public"]["Enums"]["ai_agent_tool_type"]
          updated_at?: string | null
        }
        Update: {
          configuration_schema?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_integration?: string | null
          tool_type?: Database["public"]["Enums"]["ai_agent_tool_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_agent_tools: {
        Row: {
          agent_id: string
          configuration: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          order_priority: number | null
          tool_name: string
          tool_type: Database["public"]["Enums"]["ai_agent_tool_type"]
          trigger_conditions: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          configuration?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          order_priority?: number | null
          tool_name: string
          tool_type: Database["public"]["Enums"]["ai_agent_tool_type"]
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          configuration?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          order_priority?: number | null
          tool_name?: string
          tool_type?: Database["public"]["Enums"]["ai_agent_tool_type"]
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_tools_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_triggers: {
        Row: {
          agent_id: string
          created_at: string | null
          enabled: boolean | null
          handoff_rules: Json | null
          id: string
          platform_integrations: Json | null
          trigger_config: Json | null
          trigger_type: Database["public"]["Enums"]["ai_agent_trigger_type"]
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          enabled?: boolean | null
          handoff_rules?: Json | null
          id?: string
          platform_integrations?: Json | null
          trigger_config?: Json | null
          trigger_type: Database["public"]["Enums"]["ai_agent_trigger_type"]
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          enabled?: boolean | null
          handoff_rules?: Json | null
          id?: string
          platform_integrations?: Json | null
          trigger_config?: Json | null
          trigger_type?: Database["public"]["Enums"]["ai_agent_trigger_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_triggers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          agent_role: string | null
          agent_type: Database["public"]["Enums"]["ai_agent_type"] | null
          avatar_url: string | null
          avg_response_time: number | null
          company_id: string
          context_variables: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          frequency_penalty: number | null
          handoff_keywords: string[] | null
          id: string
          language: string | null
          last_used_at: string | null
          llm_model: string | null
          llm_provider: string | null
          max_tokens: number | null
          memory_config: Json | null
          model_config: Json | null
          name: string
          presence_penalty: number | null
          response_strategy: Json | null
          status: Database["public"]["Enums"]["ai_agent_status"] | null
          sub_agents: Json | null
          success_rate: number | null
          system_prompt: string | null
          system_prompt_config: Json | null
          temperature: number | null
          tone: string | null
          tools: Json | null
          total_conversations: number | null
          updated_at: string | null
        }
        Insert: {
          agent_role?: string | null
          agent_type?: Database["public"]["Enums"]["ai_agent_type"] | null
          avatar_url?: string | null
          avg_response_time?: number | null
          company_id: string
          context_variables?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency_penalty?: number | null
          handoff_keywords?: string[] | null
          id?: string
          language?: string | null
          last_used_at?: string | null
          llm_model?: string | null
          llm_provider?: string | null
          max_tokens?: number | null
          memory_config?: Json | null
          model_config?: Json | null
          name: string
          presence_penalty?: number | null
          response_strategy?: Json | null
          status?: Database["public"]["Enums"]["ai_agent_status"] | null
          sub_agents?: Json | null
          success_rate?: number | null
          system_prompt?: string | null
          system_prompt_config?: Json | null
          temperature?: number | null
          tone?: string | null
          tools?: Json | null
          total_conversations?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_role?: string | null
          agent_type?: Database["public"]["Enums"]["ai_agent_type"] | null
          avatar_url?: string | null
          avg_response_time?: number | null
          company_id?: string
          context_variables?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          frequency_penalty?: number | null
          handoff_keywords?: string[] | null
          id?: string
          language?: string | null
          last_used_at?: string | null
          llm_model?: string | null
          llm_provider?: string | null
          max_tokens?: number | null
          memory_config?: Json | null
          model_config?: Json | null
          name?: string
          presence_penalty?: number | null
          response_strategy?: Json | null
          status?: Database["public"]["Enums"]["ai_agent_status"] | null
          sub_agents?: Json | null
          success_rate?: number | null
          system_prompt?: string | null
          system_prompt_config?: Json | null
          temperature?: number | null
          tone?: string | null
          tools?: Json | null
          total_conversations?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pending_actions: {
        Row: {
          action_data: Json
          action_type: string
          company_id: string
          confirmation_message: string
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          resolved_at: string | null
          status: string | null
          ticket_id: string | null
        }
        Insert: {
          action_data?: Json
          action_type: string
          company_id: string
          confirmation_message: string
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          resolved_at?: string | null
          status?: string | null
          ticket_id?: string | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          company_id?: string
          confirmation_message?: string
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          resolved_at?: string | null
          status?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pending_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pending_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pending_actions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sub_agents: {
        Row: {
          company_id: string
          context_variables: Json | null
          created_at: string | null
          description: string | null
          execution_order: number | null
          id: string
          is_active: boolean | null
          name: string
          parent_agent_id: string | null
          sub_agent_type: Database["public"]["Enums"]["sub_agent_type"]
          system_prompt: string | null
          tools: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          context_variables?: Json | null
          created_at?: string | null
          description?: string | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_agent_id?: string | null
          sub_agent_type: Database["public"]["Enums"]["sub_agent_type"]
          system_prompt?: string | null
          tools?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          context_variables?: Json | null
          created_at?: string | null
          description?: string | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_agent_id?: string | null
          sub_agent_type?: Database["public"]["Enums"]["sub_agent_type"]
          system_prompt?: string | null
          tools?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_sub_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_sub_agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_executions: {
        Row: {
          agent_id: string
          company_id: string
          confirmation_message: string | null
          confirmed_at: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          input_params: Json | null
          output_result: Json | null
          requires_confirmation: boolean | null
          status: string | null
          sub_agent_id: string | null
          tool_name: string
          tool_type: string
        }
        Insert: {
          agent_id: string
          company_id: string
          confirmation_message?: string | null
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json | null
          output_result?: Json | null
          requires_confirmation?: boolean | null
          status?: string | null
          sub_agent_id?: string | null
          tool_name: string
          tool_type: string
        }
        Update: {
          agent_id?: string
          company_id?: string
          confirmation_message?: string | null
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json | null
          output_result?: Json | null
          requires_confirmation?: boolean | null
          status?: string | null
          sub_agent_id?: string | null
          tool_name?: string
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_executions_sub_agent_id_fkey"
            columns: ["sub_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_sub_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          media_name: string | null
          media_path: string | null
          priority: number | null
          status: boolean | null
          text: string
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          priority?: number | null
          status?: boolean | null
          text: string
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          priority?: number | null
          status?: boolean | null
          text?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          api_token_id: string | null
          company_id: string
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          response_status: number | null
          user_agent: string | null
        }
        Insert: {
          api_token_id?: string | null
          company_id: string
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          user_agent?: string | null
        }
        Update: {
          api_token_id?: string | null
          company_id?: string
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_api_token_id_fkey"
            columns: ["api_token_id"]
            isOneToOne: false
            referencedRelation: "api_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          permissions: string[]
          token: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          permissions?: string[]
          token: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_company_config: {
        Row: {
          api_key: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_subaccount: boolean | null
          subaccount_id: string | null
          updated_at: string
          wallet_id: string | null
          webhook_token: string | null
        }
        Insert: {
          api_key?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_subaccount?: boolean | null
          subaccount_id?: string | null
          updated_at?: string
          wallet_id?: string | null
          webhook_token?: string | null
        }
        Update: {
          api_key?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_subaccount?: boolean | null
          subaccount_id?: string | null
          updated_at?: string
          wallet_id?: string | null
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_company_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_customers: {
        Row: {
          asaas_customer_id: string
          company_id: string
          contact_id: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          member_id: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id: string
          company_id: string
          contact_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          member_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string
          company_id?: string
          contact_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          member_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_customers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_customers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_payments: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          bank_slip_url: string | null
          billing_type: string
          company_id: string
          contract_id: string | null
          created_at: string
          customer_cpf_cnpj: string | null
          customer_email: string | null
          customer_name: string | null
          description: string | null
          due_date: string
          external_reference: string | null
          id: string
          installment_count: number | null
          installment_number: number | null
          invoice_url: string | null
          member_id: string | null
          member_payment_id: string | null
          net_value: number | null
          payment_date: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          platform_fee: number | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          billing_type: string
          company_id: string
          contract_id?: string | null
          created_at?: string
          customer_cpf_cnpj?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          due_date: string
          external_reference?: string | null
          id?: string
          installment_count?: number | null
          installment_number?: number | null
          invoice_url?: string | null
          member_id?: string | null
          member_payment_id?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          platform_fee?: number | null
          status?: string
          updated_at?: string
          value: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          billing_type?: string
          company_id?: string
          contract_id?: string | null
          created_at?: string
          customer_cpf_cnpj?: string | null
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          due_date?: string
          external_reference?: string | null
          id?: string
          installment_count?: number | null
          installment_number?: number | null
          invoice_url?: string | null
          member_id?: string | null
          member_payment_id?: string | null
          net_value?: number | null
          payment_date?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          platform_fee?: number | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_member_payment_id_fkey"
            columns: ["member_payment_id"]
            isOneToOne: false
            referencedRelation: "member_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_platform_config: {
        Row: {
          api_key_production: string | null
          api_key_sandbox: string | null
          created_at: string
          environment: string
          id: string
          is_active: boolean | null
          platform_fee_type: string
          platform_fee_value: number | null
          platform_wallet_id: string | null
          updated_at: string
        }
        Insert: {
          api_key_production?: string | null
          api_key_sandbox?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean | null
          platform_fee_type?: string
          platform_fee_value?: number | null
          platform_wallet_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key_production?: string | null
          api_key_sandbox?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean | null
          platform_fee_type?: string
          platform_fee_value?: number | null
          platform_wallet_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_settings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_shippings: {
        Row: {
          campaign_id: string
          confirmed_at: string | null
          contact_id: string | null
          contact_list_item_id: string | null
          created_at: string | null
          delivery_at: string | null
          id: string
          message: string | null
          number: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          confirmed_at?: string | null
          contact_id?: string | null
          contact_list_item_id?: string | null
          created_at?: string | null
          delivery_at?: string | null
          id?: string
          message?: string | null
          number: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          confirmed_at?: string | null
          contact_id?: string | null
          contact_list_item_id?: string | null
          created_at?: string | null
          delivery_at?: string | null
          id?: string
          message?: string | null
          number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_shippings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_shippings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_shippings_contact_list_item_id_fkey"
            columns: ["contact_list_item_id"]
            isOneToOne: false
            referencedRelation: "contact_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          company_id: string
          completed_at: string | null
          contact_list_id: string | null
          created_at: string | null
          file_list_id: string | null
          id: string
          media_name: string | null
          media_path: string | null
          message1: string | null
          message2: string | null
          message3: string | null
          message4: string | null
          message5: string | null
          name: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          tag_id: string | null
          updated_at: string | null
          whatsapp_id: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          contact_list_id?: string | null
          created_at?: string | null
          file_list_id?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          message1?: string | null
          message2?: string | null
          message3?: string | null
          message4?: string | null
          message5?: string | null
          name: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          tag_id?: string | null
          updated_at?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          contact_list_id?: string | null
          created_at?: string | null
          file_list_id?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          message1?: string | null
          message2?: string | null
          message3?: string | null
          message4?: string | null
          message5?: string | null
          name?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          tag_id?: string | null
          updated_at?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string | null
          id: string
          media_name: string | null
          media_path: string | null
          message: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          message: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          message?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_users: {
        Row: {
          chat_id: string
          created_at: string | null
          id: string
          unreads: number | null
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          id?: string
          unreads?: number | null
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          id?: string
          unreads?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_users_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          last_message: string | null
          owner_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          last_message?: string | null
          owner_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          last_message?: string | null
          owner_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          attended_at: string | null
          booked_at: string | null
          cancelled_at: string | null
          class_session_id: string
          company_id: string
          created_at: string | null
          id: string
          member_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string | null
        }
        Insert: {
          attended_at?: string | null
          booked_at?: string | null
          cancelled_at?: string | null
          class_session_id: string
          company_id: string
          created_at?: string | null
          id?: string
          member_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string | null
        }
        Update: {
          attended_at?: string | null
          booked_at?: string | null
          cancelled_at?: string | null
          class_session_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      class_rooms: {
        Row: {
          capacity: number | null
          color: string | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          color?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_rooms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_type_id: string
          company_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          instructor_id: string | null
          is_active: boolean | null
          max_capacity: number | null
          room_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          class_type_id: string
          company_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          room_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          class_type_id?: string
          company_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          max_capacity?: number | null
          room_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_type_id_fkey"
            columns: ["class_type_id"]
            isOneToOne: false
            referencedRelation: "class_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "class_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_schedule_id: string | null
          class_type_id: string
          company_id: string
          created_at: string | null
          current_bookings: number | null
          end_time: string
          id: string
          instructor_id: string | null
          is_cancelled: boolean | null
          max_capacity: number
          notes: string | null
          room_id: string | null
          session_date: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          class_schedule_id?: string | null
          class_type_id: string
          company_id: string
          created_at?: string | null
          current_bookings?: number | null
          end_time: string
          id?: string
          instructor_id?: string | null
          is_cancelled?: boolean | null
          max_capacity: number
          notes?: string | null
          room_id?: string | null
          session_date: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          class_schedule_id?: string | null
          class_type_id?: string
          company_id?: string
          created_at?: string | null
          current_bookings?: number | null
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_cancelled?: boolean | null
          max_capacity?: number
          notes?: string | null
          room_id?: string | null
          session_date?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_type_id_fkey"
            columns: ["class_type_id"]
            isOneToOne: false
            referencedRelation: "class_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "class_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      class_types: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          max_capacity: number
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          max_capacity?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          max_capacity?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string | null
          end_date: string | null
          fitness_plan_id: string | null
          id: string
          member_id: string
          notes: string | null
          payment_day: number | null
          price: number
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string | null
          end_date?: string | null
          fitness_plan_id?: string | null
          id?: string
          member_id: string
          notes?: string | null
          payment_day?: number | null
          price?: number
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string | null
          end_date?: string | null
          fitness_plan_id?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          payment_day?: number | null
          price?: number
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_fitness_plan_id_fkey"
            columns: ["fitness_plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sales: {
        Row: {
          amount: number
          company_id: string
          contract_id: string | null
          created_at: string | null
          description: string
          discount: number | null
          id: string
          member_id: string
          notes: string | null
          payment_method: string | null
          sale_type: string
          sold_at: string | null
          sold_by: string | null
          status: string
          total: number
          updated_at: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          contract_id?: string | null
          created_at?: string | null
          description: string
          discount?: number | null
          id?: string
          member_id: string
          notes?: string | null
          payment_method?: string | null
          sale_type?: string
          sold_at?: string | null
          sold_by?: string | null
          status?: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          contract_id?: string | null
          created_at?: string | null
          description?: string
          discount?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          payment_method?: string | null
          sale_type?: string
          sold_at?: string | null
          sold_by?: string | null
          status?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sales_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sales_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sales_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zipcode: string | null
          birth_date: string | null
          company_type: string | null
          created_at: string | null
          document: string | null
          due_date: string | null
          email: string | null
          id: string
          language: string | null
          name: string
          phone: string | null
          plan_id: string | null
          recurrence: string | null
          schedules: Json | null
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          birth_date?: string | null
          company_type?: string | null
          created_at?: string | null
          document?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          language?: string | null
          name: string
          phone?: string | null
          plan_id?: string | null
          recurrence?: string | null
          schedules?: Json | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          birth_date?: string | null
          company_type?: string | null
          created_at?: string | null
          document?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          language?: string | null
          name?: string
          phone?: string | null
          plan_id?: string | null
          recurrence?: string | null
          schedules?: Json | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_custom_fields: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_custom_fields_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_items: {
        Row: {
          contact_list_id: string
          created_at: string | null
          email: string | null
          id: string
          is_whatsapp_valid: boolean | null
          name: string
          number: string
          updated_at: string | null
        }
        Insert: {
          contact_list_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_whatsapp_valid?: boolean | null
          name: string
          number: string
          updated_at?: string | null
        }
        Update: {
          contact_list_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_whatsapp_valid?: boolean | null
          name?: string
          number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_items_contact_list_id_fkey"
            columns: ["contact_list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zipcode: string | null
          company_id: string
          cpf: string | null
          created_at: string | null
          email: string | null
          engagement_level: string | null
          engagement_score: number | null
          first_interaction_at: string | null
          gender: string | null
          id: string
          is_group: boolean | null
          last_interaction_at: string | null
          link_clicks: number | null
          messages_read: number | null
          messages_received: number | null
          messages_replied: number | null
          messages_sent: number | null
          name: string
          notes: string | null
          number: string
          objective: string | null
          profile_pic_url: string | null
          rg: string | null
          updated_at: string | null
          whatsapp_id: string | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          engagement_level?: string | null
          engagement_score?: number | null
          first_interaction_at?: string | null
          gender?: string | null
          id?: string
          is_group?: boolean | null
          last_interaction_at?: string | null
          link_clicks?: number | null
          messages_read?: number | null
          messages_received?: number | null
          messages_replied?: number | null
          messages_sent?: number | null
          name: string
          notes?: string | null
          number: string
          objective?: string | null
          profile_pic_url?: string | null
          rg?: string | null
          updated_at?: string | null
          whatsapp_id?: string | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          engagement_level?: string | null
          engagement_score?: number | null
          first_interaction_at?: string | null
          gender?: string | null
          id?: string
          is_group?: boolean | null
          last_interaction_at?: string | null
          link_clicks?: number | null
          messages_read?: number | null
          messages_received?: number | null
          messages_replied?: number | null
          messages_sent?: number | null
          name?: string
          notes?: string | null
          number?: string
          objective?: string | null
          profile_pic_url?: string | null
          rg?: string | null
          updated_at?: string | null
          whatsapp_id?: string | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      file_options: {
        Row: {
          created_at: string | null
          file_id: string
          id: string
          media_type: string | null
          name: string
          path: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_id: string
          id?: string
          media_type?: string | null
          name: string
          path: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string
          id?: string
          media_type?: string | null
          name?: string
          path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_options_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          message: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_num: number | null
          parent_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_num?: number | null
          parent_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_num?: number | null
          parent_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_plans: {
        Row: {
          benefits: string[] | null
          classes_per_week: number | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          period: Database["public"]["Enums"]["plan_period"]
          price: number
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          classes_per_week?: number | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          period?: Database["public"]["Enums"]["plan_period"]
          price?: number
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          classes_per_week?: number | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          period?: Database["public"]["Enums"]["plan_period"]
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      helps: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          link: string | null
          title: string
          updated_at: string | null
          video: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          link?: string | null
          title: string
          updated_at?: string | null
          video?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          link?: string | null
          title?: string
          updated_at?: string | null
          video?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string | null
          detail: string | null
          due_date: string | null
          id: string
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          detail?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          detail?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          agent_id: string | null
          category: string | null
          company_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string | null
          company_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string | null
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_config_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          company_id: string
          created_at: string | null
          id: string
          provider: Database["public"]["Enums"]["llm_provider"]
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          company_id: string
          created_at?: string | null
          id?: string
          provider: Database["public"]["Enums"]["llm_provider"]
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          company_id?: string
          created_at?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["llm_provider"]
        }
        Relationships: [
          {
            foreignKeyName: "llm_config_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_config_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_configurations: {
        Row: {
          advanced_settings: Json | null
          api_base_url: string | null
          api_key_encrypted: string
          company_id: string
          created_at: string | null
          created_by: string | null
          default_model: string
          id: string
          is_active: boolean | null
          last_test_error: string | null
          last_test_status:
            | Database["public"]["Enums"]["llm_test_status"]
            | null
          last_tested_at: string | null
          max_retries: number | null
          organization_id: string | null
          provider: Database["public"]["Enums"]["llm_provider"]
          request_timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          advanced_settings?: Json | null
          api_base_url?: string | null
          api_key_encrypted: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          default_model: string
          id?: string
          is_active?: boolean | null
          last_test_error?: string | null
          last_test_status?:
            | Database["public"]["Enums"]["llm_test_status"]
            | null
          last_tested_at?: string | null
          max_retries?: number | null
          organization_id?: string | null
          provider: Database["public"]["Enums"]["llm_provider"]
          request_timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          advanced_settings?: Json | null
          api_base_url?: string | null
          api_key_encrypted?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          default_model?: string
          id?: string
          is_active?: boolean | null
          last_test_error?: string | null
          last_test_status?:
            | Database["public"]["Enums"]["llm_test_status"]
            | null
          last_tested_at?: string | null
          max_retries?: number | null
          organization_id?: string | null
          provider?: Database["public"]["Enums"]["llm_provider"]
          request_timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_configurations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          due_date: string
          external_payment_id: string | null
          fitness_plan_id: string | null
          id: string
          member_id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          due_date: string
          external_payment_id?: string | null
          fitness_plan_id?: string | null
          id?: string
          member_id: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          due_date?: string
          external_payment_id?: string | null
          fitness_plan_id?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_payments_fitness_plan_id_fkey"
            columns: ["fitness_plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_users: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          member_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          member_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          member_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_users_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_date: string | null
          company_id: string
          contact_id: string
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          enrollment_date: string
          expiration_date: string | null
          fitness_plan_id: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          has_guardian: boolean | null
          id: string
          instructor_id: string | null
          medical_notes: string | null
          qr_code_token: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          company_id: string
          contact_id: string
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_date?: string
          expiration_date?: string | null
          fitness_plan_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          has_guardian?: boolean | null
          id?: string
          instructor_id?: string | null
          medical_notes?: string | null
          qr_code_token?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_date?: string
          expiration_date?: string | null
          fitness_plan_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          has_guardian?: boolean | null
          id?: string
          instructor_id?: string | null
          medical_notes?: string | null
          qr_code_token?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_fitness_plan_id_fkey"
            columns: ["fitness_plan_id"]
            isOneToOne: false
            referencedRelation: "fitness_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string | null
          company_id: string
          components: Json | null
          created_at: string | null
          example: Json | null
          id: string
          language: string
          last_synced_at: string | null
          name: string
          quality_score: string | null
          rejected_reason: string | null
          status: string | null
          template_id: string
          updated_at: string | null
          whatsapp_id: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          components?: Json | null
          created_at?: string | null
          example?: Json | null
          id?: string
          language?: string
          last_synced_at?: string | null
          name: string
          quality_score?: string | null
          rejected_reason?: string | null
          status?: string | null
          template_id: string
          updated_at?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          components?: Json | null
          created_at?: string | null
          example?: Json | null
          id?: string
          language?: string
          last_synced_at?: string | null
          name?: string
          quality_score?: string | null
          rejected_reason?: string | null
          status?: string | null
          template_id?: string
          updated_at?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_whatsapp_id_fkey"
            columns: ["whatsapp_id"]
            isOneToOne: false
            referencedRelation: "whatsapps"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ack: number | null
          body: string
          company_id: string
          contact_id: string | null
          created_at: string | null
          data_json: Json | null
          from_me: boolean | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          original_body: string | null
          participant: string | null
          queue_id: string | null
          quoted_msg_id: string | null
          remote_jid: string | null
          ticket_id: string
          updated_at: string | null
          wid: string | null
        }
        Insert: {
          ack?: number | null
          body: string
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          data_json?: Json | null
          from_me?: boolean | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          original_body?: string | null
          participant?: string | null
          queue_id?: string | null
          quoted_msg_id?: string | null
          remote_jid?: string | null
          ticket_id: string
          updated_at?: string | null
          wid?: string | null
        }
        Update: {
          ack?: number | null
          body?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          data_json?: Json | null
          from_me?: boolean | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          original_body?: string | null
          participant?: string | null
          queue_id?: string | null
          quoted_msg_id?: string | null
          remote_jid?: string | null
          ticket_id?: string
          updated_at?: string | null
          wid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      par_q_responses: {
        Row: {
          company_id: string
          completed_date: string
          created_at: string
          created_by_user_id: string | null
          has_medical_restriction: boolean
          id: string
          member_id: string
          photo_url: string | null
          question_1: boolean
          question_10: boolean
          question_10_details: string | null
          question_2: boolean
          question_3: boolean
          question_4: boolean
          question_5: boolean
          question_6: boolean
          question_7: boolean
          question_8: boolean
          question_9: boolean
          signature: string
          updated_at: string
          validation_metadata: Json | null
        }
        Insert: {
          company_id: string
          completed_date?: string
          created_at?: string
          created_by_user_id?: string | null
          has_medical_restriction?: boolean
          id?: string
          member_id: string
          photo_url?: string | null
          question_1?: boolean
          question_10?: boolean
          question_10_details?: string | null
          question_2?: boolean
          question_3?: boolean
          question_4?: boolean
          question_5?: boolean
          question_6?: boolean
          question_7?: boolean
          question_8?: boolean
          question_9?: boolean
          signature: string
          updated_at?: string
          validation_metadata?: Json | null
        }
        Update: {
          company_id?: string
          completed_date?: string
          created_at?: string
          created_by_user_id?: string | null
          has_medical_restriction?: boolean
          id?: string
          member_id?: string
          photo_url?: string | null
          question_1?: boolean
          question_10?: boolean
          question_10_details?: string | null
          question_2?: boolean
          question_3?: boolean
          question_4?: boolean
          question_5?: boolean
          question_6?: boolean
          question_7?: boolean
          question_8?: boolean
          question_9?: boolean
          signature?: string
          updated_at?: string
          validation_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "par_q_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "par_q_responses_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "par_q_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          accepts_installments: boolean | null
          code: string
          company_id: string
          created_at: string | null
          credit_card_type: string | null
          fee_percentage: number | null
          icon: string | null
          id: string
          installment_fees: Json | null
          is_active: boolean | null
          max_installments: number | null
          name: string
          order_num: number | null
          updated_at: string | null
        }
        Insert: {
          accepts_installments?: boolean | null
          code: string
          company_id: string
          created_at?: string | null
          credit_card_type?: string | null
          fee_percentage?: number | null
          icon?: string | null
          id?: string
          installment_fees?: Json | null
          is_active?: boolean | null
          max_installments?: number | null
          name: string
          order_num?: number | null
          updated_at?: string | null
        }
        Update: {
          accepts_installments?: boolean | null
          code?: string
          company_id?: string
          created_at?: string | null
          credit_card_type?: string | null
          fee_percentage?: number | null
          icon?: string | null
          id?: string
          installment_fees?: Json | null
          is_active?: boolean | null
          max_installments?: number | null
          name?: string
          order_num?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          connections: number
          created_at: string | null
          id: string
          name: string
          price: number
          queues: number
          updated_at: string | null
          use_campaigns: boolean | null
          use_external_api: boolean | null
          use_internal_chat: boolean | null
          use_kanban: boolean | null
          use_schedules: boolean | null
          users: number
        }
        Insert: {
          connections?: number
          created_at?: string | null
          id?: string
          name: string
          price?: number
          queues?: number
          updated_at?: string | null
          use_campaigns?: boolean | null
          use_external_api?: boolean | null
          use_internal_chat?: boolean | null
          use_kanban?: boolean | null
          use_schedules?: boolean | null
          users?: number
        }
        Update: {
          connections?: number
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          queues?: number
          updated_at?: string | null
          use_campaigns?: boolean | null
          use_external_api?: boolean | null
          use_internal_chat?: boolean | null
          use_kanban?: boolean | null
          use_schedules?: boolean | null
          users?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          all_ticket: string | null
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          online: boolean | null
          profile: string | null
          reset_password: string | null
          token_version: number | null
          updated_at: string | null
          user_id: string
          whatsapp_id: string | null
        }
        Insert: {
          all_ticket?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          online?: boolean | null
          profile?: string | null
          reset_password?: string | null
          token_version?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_id?: string | null
        }
        Update: {
          all_ticket?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          online?: boolean | null
          profile?: string | null
          reset_password?: string | null
          token_version?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          api_key: string | null
          company_id: string
          created_at: string | null
          id: string
          max_messages: number | null
          max_tokens: number | null
          name: string
          prompt: string
          queue_id: string | null
          temperature: number | null
          updated_at: string | null
          voice: string | null
          voice_key: string | null
          voice_region: string | null
        }
        Insert: {
          api_key?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          max_messages?: number | null
          max_tokens?: number | null
          name: string
          prompt: string
          queue_id?: string | null
          temperature?: number | null
          updated_at?: string | null
          voice?: string | null
          voice_key?: string | null
          voice_region?: string | null
        }
        Update: {
          api_key?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          max_messages?: number | null
          max_tokens?: number | null
          name?: string
          prompt?: string
          queue_id?: string | null
          temperature?: number | null
          updated_at?: string | null
          voice?: string | null
          voice_key?: string | null
          voice_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_integrations: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          json_content: Json | null
          language: string | null
          name: string
          project_name: string | null
          type: string
          typebot_delay_message: number | null
          typebot_expire: number | null
          typebot_keyword_finish: string | null
          typebot_keyword_restart: string | null
          typebot_unknown_message: string | null
          updated_at: string | null
          url_n8n: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          json_content?: Json | null
          language?: string | null
          name: string
          project_name?: string | null
          type: string
          typebot_delay_message?: number | null
          typebot_expire?: number | null
          typebot_keyword_finish?: string | null
          typebot_keyword_restart?: string | null
          typebot_unknown_message?: string | null
          updated_at?: string | null
          url_n8n?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          json_content?: Json | null
          language?: string | null
          name?: string
          project_name?: string | null
          type?: string
          typebot_delay_message?: number | null
          typebot_expire?: number | null
          typebot_keyword_finish?: string | null
          typebot_keyword_restart?: string | null
          typebot_unknown_message?: string | null
          updated_at?: string | null
          url_n8n?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_options: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          option: string | null
          order_num: number | null
          parent_id: string | null
          queue_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          option?: string | null
          order_num?: number | null
          parent_id?: string | null
          queue_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          option?: string | null
          order_num?: number | null
          parent_id?: string | null
          queue_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_options_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "queue_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_options_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          ai_agent_id: string | null
          color: string
          company_id: string
          created_at: string | null
          greeting_message: string | null
          id: string
          integration_id: string | null
          name: string
          order_queue: number | null
          out_of_hours_message: string | null
          prompt_id: string | null
          schedules: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_agent_id?: string | null
          color?: string
          company_id: string
          created_at?: string | null
          greeting_message?: string | null
          id?: string
          integration_id?: string | null
          name: string
          order_queue?: number | null
          out_of_hours_message?: string | null
          prompt_id?: string | null
          schedules?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_agent_id?: string | null
          color?: string
          company_id?: string
          created_at?: string | null
          greeting_message?: string | null
          id?: string
          integration_id?: string | null
          name?: string
          order_queue?: number | null
          out_of_hours_message?: string | null
          prompt_id?: string | null
          schedules?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queues_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_messages: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          media_name: string | null
          media_path: string | null
          message: string
          shortcut: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          message: string
          shortcut: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          message?: string
          shortcut?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          body: string
          company_id: string
          contact_id: string | null
          created_at: string | null
          id: string
          media_name: string | null
          media_path: string | null
          send_at: string
          sent_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          send_at: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          id?: string
          media_name?: string | null
          media_path?: string | null
          send_at?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          automation_config: Json | null
          campaign_identifier: string | null
          color: string
          company_id: string
          created_at: string | null
          id: string
          kanban: number | null
          kanban_order: number | null
          meta_access_token: string | null
          meta_pixel_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          automation_config?: Json | null
          campaign_identifier?: string | null
          color?: string
          company_id: string
          created_at?: string | null
          id?: string
          kanban?: number | null
          kanban_order?: number | null
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          automation_config?: Json | null
          campaign_identifier?: string | null
          color?: string
          company_id?: string
          created_at?: string | null
          id?: string
          kanban?: number | null
          kanban_order?: number | null
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sends: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          template_id: string
          ticket_id: string | null
          variables: Json | null
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_id: string
          ticket_id?: string | null
          variables?: Json | null
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string
          ticket_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "template_sends_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sends_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sends_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notes: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          note: string
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          note: string
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          note?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          id: string
          tag_id: string
          ticket_id: string
        }
        Insert: {
          id?: string
          tag_id: string
          ticket_id: string
        }
        Update: {
          id?: string
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tracking: {
        Row: {
          chatbot_at: string | null
          company_id: string
          created_at: string | null
          finished_at: string | null
          id: string
          queue_at: string | null
          rated: boolean | null
          rating_at: string | null
          started_at: string | null
          ticket_id: string
          updated_at: string | null
          user_id: string | null
          whatsapp_id: string | null
        }
        Insert: {
          chatbot_at?: string | null
          company_id: string
          created_at?: string | null
          finished_at?: string | null
          id?: string
          queue_at?: string | null
          rated?: boolean | null
          rating_at?: string | null
          started_at?: string | null
          ticket_id: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          chatbot_at?: string | null
          company_id?: string
          created_at?: string | null
          finished_at?: string | null
          id?: string
          queue_at?: string | null
          rated?: boolean | null
          rating_at?: string | null
          started_at?: string | null
          ticket_id?: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tracking_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          amount_used_bot_queues: number | null
          chatbot: boolean | null
          chatbot_at: string | null
          company_id: string
          contact_id: string
          created_at: string | null
          from_me: boolean | null
          id: string
          integration_id: string | null
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          prompt_id: string | null
          queue_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          typebot_session_id: string | null
          typebot_status: boolean | null
          unread_messages: number | null
          updated_at: string | null
          user_id: string | null
          uuid: string | null
          whatsapp_id: string | null
        }
        Insert: {
          amount_used_bot_queues?: number | null
          chatbot?: boolean | null
          chatbot_at?: string | null
          company_id: string
          contact_id: string
          created_at?: string | null
          from_me?: boolean | null
          id?: string
          integration_id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          prompt_id?: string | null
          queue_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          typebot_session_id?: string | null
          typebot_status?: boolean | null
          unread_messages?: number | null
          updated_at?: string | null
          user_id?: string | null
          uuid?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          amount_used_bot_queues?: number | null
          chatbot?: boolean | null
          chatbot_at?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string | null
          from_me?: boolean | null
          id?: string
          integration_id?: string | null
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          prompt_id?: string | null
          queue_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          typebot_session_id?: string | null
          typebot_status?: boolean | null
          unread_messages?: number | null
          updated_at?: string | null
          user_id?: string | null
          uuid?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_class_bookings: {
        Row: {
          attended_at: string | null
          booked_at: string | null
          cancelled_at: string | null
          class_session_id: string
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          attended_at?: string | null
          booked_at?: string | null
          cancelled_at?: string | null
          class_session_id: string
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          attended_at?: string | null
          booked_at?: string | null
          cancelled_at?: string | null
          class_session_id?: string
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_class_bookings_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_class_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_class_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_queues: {
        Row: {
          id: string
          queue_id: string
          user_id: string
        }
        Insert: {
          id?: string
          queue_id: string
          user_id: string
        }
        Update: {
          id?: string
          queue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_queues_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          rate: number
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          rate: number
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          rate?: number
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          company_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          company_id: string
          created_at: string
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_queues: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          queue_id: string
          whatsapp_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          queue_id: string
          whatsapp_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          queue_id?: string
          whatsapp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_queues_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queues_whatsapp_id_fkey"
            columns: ["whatsapp_id"]
            isOneToOne: false
            referencedRelation: "whatsapps"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapps: {
        Row: {
          access_token: string | null
          battery: string | null
          business_id: string | null
          collect_message: string | null
          company_id: string
          compliance_pending_message: string | null
          created_at: string | null
          default_queue_id: string | null
          expires_inactivity_seconds: number | null
          expires_ticket_seconds: number | null
          farewell_message: string | null
          greeting_message: string | null
          id: string
          idle_message: string | null
          instance_id: string | null
          integration_id: string | null
          is_default: boolean | null
          max_use_bot: number | null
          name: string
          out_of_hours_message: string | null
          phone_number_id: string | null
          plugged: boolean | null
          prompt_id: string | null
          provider: string | null
          qr_code: string | null
          quality_rating: string | null
          quality_rating_updated_at: string | null
          rating_message: string | null
          retries: number | null
          send_idle_message: boolean | null
          session: string | null
          status: string | null
          time_idle_message: number | null
          time_send_queue: number | null
          timeuse_bot: string | null
          token: string | null
          updated_at: string | null
          waba_id: string | null
        }
        Insert: {
          access_token?: string | null
          battery?: string | null
          business_id?: string | null
          collect_message?: string | null
          company_id: string
          compliance_pending_message?: string | null
          created_at?: string | null
          default_queue_id?: string | null
          expires_inactivity_seconds?: number | null
          expires_ticket_seconds?: number | null
          farewell_message?: string | null
          greeting_message?: string | null
          id?: string
          idle_message?: string | null
          instance_id?: string | null
          integration_id?: string | null
          is_default?: boolean | null
          max_use_bot?: number | null
          name: string
          out_of_hours_message?: string | null
          phone_number_id?: string | null
          plugged?: boolean | null
          prompt_id?: string | null
          provider?: string | null
          qr_code?: string | null
          quality_rating?: string | null
          quality_rating_updated_at?: string | null
          rating_message?: string | null
          retries?: number | null
          send_idle_message?: boolean | null
          session?: string | null
          status?: string | null
          time_idle_message?: number | null
          time_send_queue?: number | null
          timeuse_bot?: string | null
          token?: string | null
          updated_at?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string | null
          battery?: string | null
          business_id?: string | null
          collect_message?: string | null
          company_id?: string
          compliance_pending_message?: string | null
          created_at?: string | null
          default_queue_id?: string | null
          expires_inactivity_seconds?: number | null
          expires_ticket_seconds?: number | null
          farewell_message?: string | null
          greeting_message?: string | null
          id?: string
          idle_message?: string | null
          instance_id?: string | null
          integration_id?: string | null
          is_default?: boolean | null
          max_use_bot?: number | null
          name?: string
          out_of_hours_message?: string | null
          phone_number_id?: string | null
          plugged?: boolean | null
          prompt_id?: string | null
          provider?: string | null
          qr_code?: string | null
          quality_rating?: string | null
          quality_rating_updated_at?: string | null
          rating_message?: string | null
          retries?: number | null
          send_idle_message?: boolean | null
          session?: string | null
          status?: string | null
          time_idle_message?: number | null
          time_send_queue?: number | null
          timeuse_bot?: string | null
          token?: string | null
          updated_at?: string | null
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapps_default_queue_id_fkey"
            columns: ["default_queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapps_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "queue_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapps_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_contact_engagement_score: {
        Args: {
          p_last_interaction_at: string
          p_link_clicks: number
          p_messages_read: number
          p_messages_received: number
          p_messages_replied: number
          p_messages_sent: number
        }
        Returns: number
      }
      can_access_all_contacts: { Args: { _user_id: string }; Returns: boolean }
      can_member_register_portal: {
        Args: { member_email: string }
        Returns: boolean
      }
      can_user_access_contact: {
        Args: { _contact_id: string; _user_id: string }
        Returns: boolean
      }
      generate_all_company_sessions: {
        Args: { p_company_id: string; p_weeks_ahead?: number }
        Returns: number
      }
      generate_sessions_from_schedule: {
        Args: {
          p_schedule_id: string
          p_start_date?: string
          p_weeks_ahead?: number
        }
        Returns: number
      }
      get_engagement_level: { Args: { p_score: number }; Returns: string }
      get_member_by_email: {
        Args: { member_email: string }
        Returns: {
          company_id: string
          contact_email: string
          contact_name: string
          member_id: string
        }[]
      }
      get_member_for_user: {
        Args: { _user_id: string }
        Returns: {
          company_id: string
          contact_email: string
          contact_name: string
          contact_number: string
          expiration_date: string
          fitness_plan_name: string
          member_id: string
          status: string
        }[]
      }
      get_user_company_basic: {
        Args: never
        Returns: {
          id: string
          language: string
          name: string
          schedules: Json
          status: Database["public"]["Enums"]["company_status"]
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_user: { Args: { _user_id: string }; Returns: boolean }
      link_user_to_member: {
        Args: { p_member_email: string; p_user_id: string }
        Returns: boolean
      }
      register_company_and_user: {
        Args: {
          p_company_name: string
          p_country?: string
          p_phone?: string
          p_plan_id?: string
          p_user_email: string
          p_user_id: string
          p_user_name: string
        }
        Returns: string
      }
      request_password_reset: { Args: { user_email: string }; Returns: boolean }
    }
    Enums: {
      ai_agent_conversation_status:
        | "active"
        | "completed"
        | "transferred"
        | "failed"
      ai_agent_message_role: "user" | "assistant" | "system" | "tool"
      ai_agent_status: "active" | "inactive" | "draft"
      ai_agent_tool_type:
        | "communication"
        | "data"
        | "workflow"
        | "integration"
        | "ai"
      ai_agent_trigger_type:
        | "whatsapp_message"
        | "ticket_status"
        | "schedule"
        | "webhook"
        | "manual"
      ai_agent_type:
        | "customer_service"
        | "sales"
        | "scheduling"
        | "information"
        | "custom"
        | "supervisor"
        | "classifier"
        | "specialist"
      app_role: "admin" | "super" | "user"
      booking_status: "confirmed" | "cancelled" | "attended" | "no_show"
      campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "paused"
        | "completed"
        | "cancelled"
      checkin_status: "checked_in" | "checked_out"
      company_status: "active" | "inactive" | "trial"
      llm_provider: "openai" | "gemini" | "anthropic" | "local"
      llm_test_status: "success" | "error" | "pending"
      member_status: "active" | "inactive" | "suspended" | "cancelled"
      plan_period: "monthly" | "quarterly" | "semiannual" | "annual"
      sub_agent_type: "crm" | "scheduling" | "member" | "general"
      ticket_status: "open" | "pending" | "closed"
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
      ai_agent_conversation_status: [
        "active",
        "completed",
        "transferred",
        "failed",
      ],
      ai_agent_message_role: ["user", "assistant", "system", "tool"],
      ai_agent_status: ["active", "inactive", "draft"],
      ai_agent_tool_type: [
        "communication",
        "data",
        "workflow",
        "integration",
        "ai",
      ],
      ai_agent_trigger_type: [
        "whatsapp_message",
        "ticket_status",
        "schedule",
        "webhook",
        "manual",
      ],
      ai_agent_type: [
        "customer_service",
        "sales",
        "scheduling",
        "information",
        "custom",
        "supervisor",
        "classifier",
        "specialist",
      ],
      app_role: ["admin", "super", "user"],
      booking_status: ["confirmed", "cancelled", "attended", "no_show"],
      campaign_status: [
        "draft",
        "scheduled",
        "running",
        "paused",
        "completed",
        "cancelled",
      ],
      checkin_status: ["checked_in", "checked_out"],
      company_status: ["active", "inactive", "trial"],
      llm_provider: ["openai", "gemini", "anthropic", "local"],
      llm_test_status: ["success", "error", "pending"],
      member_status: ["active", "inactive", "suspended", "cancelled"],
      plan_period: ["monthly", "quarterly", "semiannual", "annual"],
      sub_agent_type: ["crm", "scheduling", "member", "general"],
      ticket_status: ["open", "pending", "closed"],
    },
  },
} as const
