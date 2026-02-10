$vps = "root@195.26.243.64"
Write-Host "=== INVESTIGACAO MANUAL AVANCADA ==="

Write-Host "`n1. Lendo arquivo 'salesfit' (Suspeito numero 1)..."
ssh $vps "cat /etc/nginx/sites-enabled/salesfit"

Write-Host "`n2. Procurando 'hubfit' (string simples) em tudo..."
ssh $vps "grep -r 'hubfit' /etc/nginx/sites-enabled/"

Write-Host "`n3. Comparando Headers (Quem responde na porta 80?)..."
# We want to see if Server header or X-Powered-By reveals anything, or Content-Type.
Write-Host "--- PORTA 3000 (Nosso Container) ---"
ssh $vps "curl -I http://127.0.0.1:3000"

Write-Host "`n--- PORTA 80 (Nginx Publico) ---"
ssh $vps "curl -I -H 'Host: hubfit.salesflowoficial.com' http://127.0.0.1:80"

Write-Host "`n=== FIM ==="
