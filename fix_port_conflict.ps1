$vps = "root@31.220.103.111"
Write-Host "=== RESOLVENDO CONFLITO DE PORTA 80 ==="

Write-Host "`n1. Parando o Nginx do Servidor (Ubuntu)..."
ssh $vps "systemctl stop nginx"
ssh $vps "systemctl disable nginx"

Write-Host "`n2. Reiniciando o Traefik (Docker) para assumir a porta 80..."
# Find traefik service or container and restart
ssh $vps "docker service update --force traefik_traefik || docker restart traefik"

Write-Host "`n3. Verificando quem esta ouvindo na porta 80 agora..."
ssh $vps "netstat -tulpn | grep :80"

Write-Host "`n=== FIM ==="
Write-Host "Tente acessar o site novamente: https://hubfit.salesflowoficial.com/"
