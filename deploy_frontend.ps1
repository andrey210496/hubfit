$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@195.26.243.64)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@195.26.243.64" }

# Helper functions for robust execution (Same as backend script)
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

Write-Host "1. Construindo o Frontend (React)..." -ForegroundColor Cyan
# Ensure we are in the right directory or just run npm
# cmd /c "npm run build" might be safer to ensure path resolution, but npm run build usually works if node is in path.
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no Build. Abortando." -ForegroundColor Red
    exit
}

Write-Host "2. Compactando arquivos..." -ForegroundColor Cyan
if (Test-Path dist.tgz) { Remove-Item dist.tgz }
# Use tar to create archive. -C dist ensures we archive the contents of dist, not dist folder itself.
tar -czf dist.tgz -C dist .

Write-Host "3. Enviando arquivos para a VPS..." -ForegroundColor Cyan
$exitCode = Invoke-SCP "dist.tgz" "${vpsAddress}:/tmp/dist.tgz"
if ($exitCode -ne 0) {
    Write-Host "ERRO FATAL: Falha ao enviar dist.tgz ($exitCode). Verifique sua conexao." -ForegroundColor Red
    exit
}

$exitCode = Invoke-SCP "deploy_script.sh" "${vpsAddress}:/tmp/deploy_script.sh"
if ($exitCode -ne 0) {
    Write-Host "ERRO FATAL: Falha ao enviar deploy_script.sh ($exitCode)." -ForegroundColor Red
    exit
}

Write-Host "4. Executando script de deploy remoto..." -ForegroundColor Cyan
# Run the script using bash explicitly, and convert line endings if needed on the fly using tr (just in case scp didn't handle it)
$exitCode = Invoke-SSH $vpsAddress "cat /tmp/deploy_script.sh | tr -d '\r' > /tmp/deploy_script_fix.sh && bash /tmp/deploy_script_fix.sh && rm /tmp/deploy_script*.sh"

if ($exitCode -ne 0) {
    Write-Host "ERRO FATAL: Falha na execucao remota ($exitCode)." -ForegroundColor Red
    exit
}

Remove-Item dist.tgz -Force
Write-Host "Processo finalizado com SUCESSO!" -ForegroundColor Green
