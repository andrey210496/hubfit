# patch_port_8000_safe.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Check if already patched to ANY port
if '{ port:' in content:
    print('Already has port configuration. Skipping patch to avoid corruption.')
    # If it has port 9000 log warning? No, just stop.
    if 'port: 8000' in content:
        print('Port is 8000.')
    else:
        print('Port configuration exists but is not 8000 (maybe 9000?). Manual intervention needed if incorrect.')
else:
    # Find the last occurrence of '})'
    idx = content.rfind('})')
    if idx != -1:
        # Replace ONLY the last }) with }, { port: 8000 })
        new_content = content[:idx] + '}, { port: 8000 })' + content[idx+2:]
        with open(file_path, 'w') as f:
            f.write(new_content)
        print('Patched to 8000 successfully.')
    else:
        print('Could not find target }) to patch.')
