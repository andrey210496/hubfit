# patch_kong.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/api/kong.yml'

with open(file_path, 'r') as f:
    content = f.read()

# Replace "url: http://edge-functions:8081/" with "url: http://supabase-edge-functions-1750867038:9000/"
old_url = 'url: http://edge-functions:8081/'
new_url = 'url: http://supabase-edge-functions-1750867038:9000/'

if new_url in content:
    print('Already patched.')
elif old_url in content:
    new_content = content.replace(old_url, new_url)
    with open(file_path, 'w') as f:
        f.write(new_content)
    print('Patched kong.yml successfully.')
else:
    print('Could not find target URL to patch.')
