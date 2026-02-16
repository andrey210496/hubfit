# patch_cpu_limit.py
import sys

file_path = '/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Add cpuTimeLimitMs definition
# Find: const workerTimeoutMs = 5 * 60 * 1000
# Replace with: const workerTimeoutMs = 5 * 60 * 1000; const cpuTimeLimitMs = Number(Deno.env.get('PER_WORKER_POLICY_LIMIT_MS')) || 60000;

target_def = "const workerTimeoutMs = 5 * 60 * 1000"
new_def = "const workerTimeoutMs = 5 * 60 * 1000\n  const cpuTimeLimitMs = Number(Deno.env.get('PER_WORKER_POLICY_LIMIT_MS')) || 60000"

if "const cpuTimeLimitMs =" in content:
    print("Definition already present.")
elif target_def in content:
    content = content.replace(target_def, new_def)
    print("Added cpuTimeLimitMs definition.")
else:
    print("Could not find workerTimeoutMs definition.")


# 2. Add options to userWorkers.create
# Find: workerTimeoutMs,
# Replace with: workerTimeoutMs, cpuTimeSoftLimitMs: cpuTimeLimitMs, cpuTimeHardLimitMs: cpuTimeLimitMs,

target_call = "workerTimeoutMs,"
new_call = "workerTimeoutMs,\n      cpuTimeSoftLimitMs: cpuTimeLimitMs,\n      cpuTimeHardLimitMs: cpuTimeLimitMs,"

if "cpuTimeSoftLimitMs:" in content:
    print("Options already present.")
elif target_call in content:
    # Be careful not to replace the definition line if it matches partial string
    # But usually inside create({ ... }) it is indented.
    # We can rely on replace replacing all occurrences, but here likely only one call.
    # The definition line ends with newline, so "workerTimeoutMs," won't match "const workerTimeoutMs ="
    content = content.replace(target_call, new_call)
    print("Added cpuTime options.")
else:
    print("Could not find workerTimeoutMs argument in create call.")

with open(file_path, 'w') as f:
    f.write(content)
