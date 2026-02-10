$vps = "root@31.220.103.111"
Write-Host "=== DIAGNOSTICO DE DEPLOY ==="
Write-Host "1. Verificando arquivos no disco da VPS..."
ssh $vps "ls -la /var/www/whitelabel-frontend/assets | head -n 5"

Write-Host "`n2. Buscando a marca 'BETA' nos arquivos deployados..."
ssh $vps "grep -r 'BETA' /var/www/whitelabel-frontend/assets"

Write-Host "`n3. Verificando servicos Docker ativos..."
ssh $vps "docker service ls"

Write-Host "`n4. Verificando containers rodando..."
ssh $vps "docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}'"

Write-Host "`n=== FIM DO DIAGNOSTICO ==="
