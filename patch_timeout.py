# patch_timeout.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Look for: const workerTimeoutMs = 1 * 60 * 1000
# Replace with: const workerTimeoutMs = 5 * 60 * 1000
old_val = 'const workerTimeoutMs = 1 * 60 * 1000'
new_val = 'const workerTimeoutMs = 5 * 60 * 1000'

if new_val in content:
    print('Already patched.')
elif old_val in content:
    new_content = content.replace(old_val, new_val)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print('Patched timeout successfully.')
else:
    print('Could not find timeout configuration to patch.')
