$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@195.26.243.64)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@195.26.243.64" }

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
scp dist.tgz "${vpsAddress}:/tmp/dist.tgz"
scp deploy_script.sh "${vpsAddress}:/tmp/deploy_script.sh"

Write-Host "4. Executando script de deploy remoto..." -ForegroundColor Cyan
# Run the script using bash explicitly, and convert line endings if needed on the fly using tr (just in case scp didn't handle it)
ssh $vpsAddress "cat /tmp/deploy_script.sh | tr -d '\r' > /tmp/deploy_script_fix.sh && bash /tmp/deploy_script_fix.sh && rm /tmp/deploy_script*.sh"

Remove-Item dist.tgz -Force
Write-Host "Processo finalizado!" -ForegroundColor Green
