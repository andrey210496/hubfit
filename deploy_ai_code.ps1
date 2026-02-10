$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

$localBase = "c:\Users\Cross Nutrition Box\Downloads\antigravity-kit\whitelabel-executer\supabase\functions\ai-orchestrator"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions/ai-orchestrator"

# Files to upload
$files = @(
    @("index.ts", "$remoteBase/index.ts"),
    @("chains\chat_chain.ts", "$remoteBase/chains/chat_chain.ts"),
    @("tools\system_retrieval.ts", "$remoteBase/tools/system_retrieval.ts")
)

Write-Host "Criando diretorios remotos..." -ForegroundColor Yellow
Start-Process ssh.exe -ArgumentList "$vpsAddress", "'mkdir -p $remoteBase/chains $remoteBase/tools'" -NoNewWindow -Wait

foreach ($file in $files) {
    $localPath = Join-Path $localBase $file[0]
    $remotePath = $file[1]
    
    Write-Host "Enviando $($file[0])..." -ForegroundColor Yellow
    
    if (-not (Test-Path $localPath)) {
        Write-Host "Erro: Arquivo local nao encontrado: $localPath" -ForegroundColor Red
        continue
    }

    Start-Process scp.exe -ArgumentList "$localPath", "${vpsAddress}:${remotePath}" -NoNewWindow -Wait
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao enviar $($file[0])" -ForegroundColor Red
        exit
    }
}

Write-Host "Reiniciando Edge Functions..." -ForegroundColor Yellow
Start-Process ssh.exe -ArgumentList "$vpsAddress", "'docker restart supabase-edge-functions-1750867038'" -NoNewWindow -Wait

Write-Host "Concluido! Codigo atualizado." -ForegroundColor Cyan
