#!/bin/bash
echo "=== AGENT CONFIG ==="
docker exec supabase-db-1750867038 psql -U supabase_admin -d postgres -t -c "SELECT company_id, memory_config FROM ai_agents LIMIT 3;"

echo ""
echo "=== CLASS SCHEDULES (company: d4f7fe51) ==="
docker exec supabase-db-1750867038 psql -U supabase_admin -d postgres -t -c "SELECT id, company_id, is_active, week_day, start_time FROM class_schedules WHERE company_id = 'd4f7fe51-973b-4232-90bb-278f64ceddd2' LIMIT 5;"

echo ""
echo "=== CLASS SCHEDULES (ANY, limit 5) ==="
docker exec supabase-db-1750867038 psql -U supabase_admin -d postgres -t -c "SELECT id, company_id, is_active, week_day, start_time FROM class_schedules LIMIT 5;"

echo ""
echo "=== TABLE COLUMNS ==="
docker exec supabase-db-1750867038 psql -U supabase_admin -d postgres -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'class_schedules' ORDER BY ordinal_position;"
