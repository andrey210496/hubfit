$vps = "root@195.26.243.64"
Write-Host "=== DIAGNOSTICO DO NOVO SERVIDOR (195...) ==="

Write-Host "`n1. Quem esta ouvindo na porta 80/443?"
ssh $vps "netstat -tulpn | grep ':80\|:443'"

Write-Host "`n2. Listando containers Docker (que podem ser proxies)..."
ssh $vps "docker ps --format '{{.Names}} {{.Ports}}' | grep '0.0.0.0:80\|0.0.0.0:443'"

Write-Host "`n3. Verificando servicos do Sistema Operacional (Nginx/Apache)..."
ssh $vps "systemctl status nginx --no-pager || echo 'Nginx nao esta rodando como servico'"
ssh $vps "systemctl status apache2 --no-pager || echo 'Apache nao esta rodando como servico'"

Write-Host "`n=== FIM ==="
