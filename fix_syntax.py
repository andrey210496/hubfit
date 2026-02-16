# fix_syntax.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# The bad string we created
bad_string = '}, }, { port: 8000 })'
# The target string (standard closing)
target_string = '})'

if bad_string in content:
    new_content = content.replace(bad_string, target_string)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print('Fixed syntax successfully.')
else:
    print('Could not find bad string. Checking for alternative...')
    # Check if it has a newline
    if bad_string + '\n' in content:
         new_content = content.replace(bad_string + '\n', target_string + '\n')
         with open(file_path, 'w') as f:
            f.write(new_content)
         print('Fixed syntax successfully (with newline).')
    else:
        print('Target not found.')
