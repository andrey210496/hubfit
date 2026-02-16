# patch_port_8000_explicit.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# We want to force { port: 8000, hostname: '0.0.0.0' }
target_config = "{ port: 8000, hostname: '0.0.0.0' }"

# Check if already patched to correct config
if "hostname: '0.0.0.0'" in content and "port: 8000" in content:
    print('Already patched to 0.0.0.0:8000.')
else:
    # First, strip any existing port config (simple heuristic)
    # If it ends with }, { port: ... }) or similar
    # We'll just look for the last pair of curl braces+paren
    
    # Try to find the closing sequence of serve(...)
    idx = content.rfind('})')
    if idx != -1:
        # Check if there is a config object before this
        # e.g. }, { port: 8000 })
        # We will just replace from the LAST } before the )
        # This is risky if logic is complex.
        
        # Safer approach: replace '})' with '}, { port: 8000, hostname: '0.0.0.0' })'
        # BUT we must ensure we don't have double config.
        
        # If we see `port: 8000`, remove it first? 
        # Actually my previous patch added `, { port: 8000 })`.
        # So the file likely ends with `}, { port: 8000 })`.
        
        if ', { port: 8000 })' in content:
             new_content = content.replace(', { port: 8000 })', ', ' + target_config + ')')
             with open(file_path, 'w') as f:
                f.write(new_content)
             print('Updated existing patch.')
        elif '})' in content: # Default case
             new_content = content[:idx] + '}, ' + target_config + content[idx+2:]
             with open(file_path, 'w') as f:
                f.write(new_content)
             print('Applied new patch.')
    else:
        print('Could not find target }) to patch.')
