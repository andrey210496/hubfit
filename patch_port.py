# patch_port.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Replace the LAST occurrence of '})' with '}, { port: 9000 })'
# But check if it's already patched first
if 'port: 9000' in content:
    print('Already patched.')
else:
    # Find the last occurrence of '})'
    # Assuming the file ends with }) or }) with newline or }) with whitespace
    idx = content.rfind('})')
    if idx != -1:
        # We replace ONLY the last }) with }, { port: 9000 })
        new_content = content[:idx] + '}, { port: 9000 })' + content[idx+2:]
        with open(file_path, 'w') as f:
            f.write(new_content)
        print('Patched successfully.')
    else:
        print('Could not find target to patch.')
