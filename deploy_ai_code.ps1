$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

$localBase = "c:\Users\Cross Nutrition Box\Downloads\antigravity-kit\whitelabel-executer\supabase\functions\ai-orchestrator"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions/ai-orchestrator"

# Helper functions for robust execution
function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "Exec: ssh $addr $cmd" -ForegroundColor Gray
    # Try common paths for docker if command not found
    $cmd = "export PATH=`$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin; $cmd"
    
    # Use PassThru to capture exit code
    $p = Start-Process ssh.exe -ArgumentList "$addr", "`"$cmd`"" -NoNewWindow -Wait -PassThru
    return $p.ExitCode
}

function Invoke-SCP {
    param($src, $dest)
    Write-Host "Copy: $src -> $dest" -ForegroundColor Gray
    # Use PassThru to capture exit code
    $p = Start-Process scp.exe -ArgumentList "`"$src`"", "$dest" -NoNewWindow -Wait -PassThru
    return $p.ExitCode
}

# Explicit file list
$files = @(
    "index.ts",
    "chains\chat_chain.ts",
    "tools\system_retrieval.ts"
)

# Remote paths map
$remotePaths = @{
    "index.ts"                  = "$remoteBase/index.ts";
    "chains\chat_chain.ts"      = "$remoteBase/chains/chat_chain.ts";
    "tools\system_retrieval.ts" = "$remoteBase/tools/system_retrieval.ts"
}

Write-Host "Criando diretorios remotos..." -ForegroundColor Yellow
$exitCode = Invoke-SSH $vpsAddress "mkdir -p $remoteBase/chains $remoteBase/tools"
if ($exitCode -ne 0) {
    Write-Host "Aviso: Nao foi possivel criar diretorios (pode ser problema de permissao ou ja existirem)" -ForegroundColor Yellow
}

foreach ($file in $files) {
    $localPath = Join-Path $localBase $file
    $remotePath = $remotePaths[$file]
    
    Write-Host "Enviando $file..." -ForegroundColor Yellow
    
    if (-not (Test-Path $localPath)) {
        Write-Host "Erro: Arquivo local nao encontrado: $localPath" -ForegroundColor Red
        continue
    }

    $exitCode = Invoke-SCP $localPath "${vpsAddress}:${remotePath}"
    if ($exitCode -ne 0) {
        Write-Host "Erro ao enviar $file (Exit Code: $exitCode)" -ForegroundColor Red
    }
}

Write-Host "Reiniciando Edge Functions..." -ForegroundColor Yellow
$exitCode = Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"
if ($exitCode -ne 0) {
    Write-Host "Aviso: Falha ao reiniciar Edge Functions (Exit Code: $exitCode)" -ForegroundColor Red
}

Write-Host "Concluido! Codigo atualizado." -ForegroundColor Cyan
