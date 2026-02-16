# patch_port_9000_explicit.py
import sys
import re

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# We want { port: 9000, hostname: '0.0.0.0' }
target_config = "{ port: 9000, hostname: '0.0.0.0' }"

# Check if already patched to 9000
if "port: 9000" in content:
    print('Already patched to 9000.')
    # Ensure hostname is also there
    if "hostname: '0.0.0.0'" not in content:
         # Append hostname or fix config?
         # If it has { port: 9000 }) replace with target
         if '{ port: 9000 })' in content:
             new_content = content.replace('{ port: 9000 })', target_config + ')')
             with open(file_path, 'w') as f:
                f.write(new_content)
             print('Updated to include hostname.')
    else:
        print('Config looks correct.')

else:
    # If it has port: 8000, replace it
    if "port: 8000" in content:
         new_content = content.replace("port: 8000", "port: 9000")
         with open(file_path, 'w') as f:
                f.write(new_content)
         print('Replaced port 8000 with 9000.')
    else:
        # Fallback to finding }) if no port config found
        idx = content.rfind('})')
        if idx != -1:
             new_content = content[:idx] + '}, ' + target_config + content[idx+2:]
             with open(file_path, 'w') as f:
                f.write(new_content)
             print('Applied new patch for port 9000.')
        else:
             print('Could not find target }) to patch.')
             
