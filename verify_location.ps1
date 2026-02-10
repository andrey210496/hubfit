$vps = "root@31.220.103.111"
Write-Host "=== TESTE DE LOCALIZACAO E CONTEUDO ==="

Write-Host "`n1. Criando arquivo de teste 'probe.txt' na pasta de deploy..."
# Create a probe file to verify if the domain points to this folder
ssh $vps "echo 'ESTE EH O SERVIDOR CORRETO - 31.220.103.111' > /var/www/whitelabel-frontend/probe.txt"
ssh $vps "chmod 644 /var/www/whitelabel-frontend/probe.txt"

Write-Host "`n2. Verificando se o codigo 'BETA' existe nos arquivos JS..."
# Search for BETA in the assets folder
ssh $vps "grep -r 'BETA' /var/www/whitelabel-frontend/assets | head -n 1"

Write-Host "`n3. Listando TODOS os containers com labels do Traefik..."
# Find any container that might be hijacking the domain
ssh $vps "docker ps --format '{{.Names}} {{.Image}}' --filter label=traefik.enable=true"

Write-Host "`n=== FIM DO TESTE ==="
Write-Host "Se o passo 2 nao mostrar nada, o upload falhou."
Write-Host "Se o passo 2 mostrar 'BETA', tente acessar: https://hubfit.salesflowoficial.com/probe.txt"
