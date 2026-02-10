$vps = "root@31.220.103.111"
Write-Host "=== CACA AO IP DO FANTASMA ==="

Write-Host "`n1. Confirmando que o servico oficial esta MORTO..."
ssh $vps "docker service ls --filter name=whitelabel-frontend"

Write-Host "`n2. Listando TODOS os containers rodando (inclusive os sem nome)..."
ssh $vps "docker ps --format '{{.ID}} {{.Image}} {{.Names}} {{.Status}}'"

Write-Host "`n3. ATENCAO: Vou ler os logs do Traefik para descobrir o IP do FANTASMA."
Write-Host "    -> Por favor, ACESSE O SITE AGORA (Dê F5 várias vezes) enquanto eu leio..."
Write-Host "    -> Aguardando 10 segundos de logs..."

# Grep for the domain in traefik logs to see the destination
# Note: Traefik logs usually show "Forwarding this request to URL" if debug is on, or just access logs.
# If access logs are enabled, we might see the backend reference.
# We'll try to grep for the domain and typical patterns.
ssh $vps "timeout 10 docker service logs traefik_traefik -f 2>&1 | grep hubfit" 

Write-Host "`n4. Procurando containers 'soltos' do Nginx..."
ssh $vps "docker ps --filter ancestor=nginx:alpine --format '{{.ID}} {{.Names}} {{.Labels}}'"

Write-Host "`n=== FIM ==="
