$vps = "root@31.220.103.111"
Write-Host "=== RESOLUCAO FORCADA DE PORTA 80 ==="

Write-Host "`n1. Parando Nginx (Ubuntu) e liberando porta 80..."
ssh $vps "systemctl stop nginx"
ssh $vps "systemctl disable nginx"
ssh $vps "fuser -k 80/tcp" # Kill any process on port 80

Write-Host "`n2. Verificando se a porta 80 esta livre..."
ssh $vps "netstat -tulpn | grep :80"

Write-Host "`n3. Forcando reinicio do Traefik (Scale 0 -> 1)..."
# Force update to make swarm try to bind again
ssh $vps "docker service scale traefik_traefik=0"
Start-Sleep -Seconds 5
ssh $vps "docker service scale traefik_traefik=1"

Write-Host "`n4. Aguardando Traefik subir..."
Start-Sleep -Seconds 15

Write-Host "`n5. Verificando quem assumiu a porta 80..."
ssh $vps "netstat -tulpn | grep :80"

Write-Host "`n6. Verificando logs do Traefik..."
ssh $vps "docker service logs traefik_traefik --tail 20"

Write-Host "`n=== FIM ==="
Write-Host "Se o passo 5 mostrar 'dockerd' ou 'docker-proxy' na porta 80, RESOLVEU!"
