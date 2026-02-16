# patch_port_8000.py
import sys
import re

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# We want to replace `{ port: 9000 })` or just `})` with `{ port: 8000 })`
# First, let's normalize by removing existing port config if present
if '{ port: 9000 })' in content:
    content = content.replace('{ port: 9000 })', '})')

# Now apply port 8000
if 'port: 8000' in content:
    print('Already patched to 8000.')
else:
    # Find the last occurrence of '})'
    idx = content.rfind('})')
    if idx != -1:
        new_content = content[:idx] + '}, { port: 8000 })' + content[idx+2:]
        with open(file_path, 'w') as f:
            f.write(new_content)
        print('Patched to 8000 successfully.')
    else:
        print('Could not find target to patch.')
