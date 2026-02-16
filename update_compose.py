# update_compose.py
import sys

file_path = '/root/multiple-supabase/docker/docker-compose-1750867038.yml'
target_service = 'container_name: supabase-edge-functions-1750867038'
env_marker = '    environment:'
insert_line = '      PER_WORKER_POLICY_LIMIT_MS: 60000\n'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
in_service = False
inserted = False

for line in lines:
    new_lines.append(line)
    if target_service in line:
        in_service = True
    
    # strict indentation check to ensure we are in the service block
    # and hasn't been inserted already for this block
    if in_service and line.rstrip() == env_marker and not inserted:
        new_lines.append(insert_line)
        inserted = True
        in_service = False # inserted, done.

with open(file_path, 'w') as f:
    f.writelines(new_lines)

if inserted:
    print('Successfully inserted config.')
else:
    print('Could not find target to insert or already inserted.')
