$vps = "root@195.26.243.64"
Write-Host "=== VERIFICANDO STATUS DO PROXY ==="

Write-Host "`n1. Testando a Porta 3000 (Docker direto)..."
ssh $vps "curl -I http://127.0.0.1:3000 || echo 'Porta 3000 inacessivel!'"

Write-Host "`n2. Testando a Porta 80 (Nginx -> Docker)..."
ssh $vps "curl -I -H 'Host: hubfit.salesflowoficial.com' http://127.0.0.1:80 || echo 'Nginx nao esta respondendo para o dominio!'"

Write-Host "`n3. Verificando logs de erro do Nginx (ultimas 5 linhas)..."
ssh $vps "tail -n 5 /var/log/nginx/error.log"

Write-Host "`n=== FIM ==="
