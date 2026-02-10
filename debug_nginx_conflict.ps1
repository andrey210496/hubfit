$vps = "root@195.26.243.64"
Write-Host "=== INVESTIGACAO MANUAL DE CONFLITO NGINX ==="

Write-Host "`n1. Listando arquivos em sites-enabled:"
ssh $vps "ls -l /etc/nginx/sites-enabled/"

Write-Host "`n2. Procurando 'hubfit' em TODOS os arquivos de configuracao:"
# Check sites-enabled, conf.d and even nginx.conf
ssh $vps "grep -r 'hubfit.salesflowoficial.com' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /etc/nginx/nginx.conf"

Write-Host "`n3. Verificando conteudo da nossa config 'hubfit':"
ssh $vps "cat /etc/nginx/sites-enabled/hubfit"

Write-Host "`n=== FIM ==="
