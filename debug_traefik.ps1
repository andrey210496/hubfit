$vps = "root@31.220.103.111"
Write-Host "=== DIAGNOSTICO TRAEFIK E REDE ==="

Write-Host "`n1. Verificando argumentos de inicializacao do Traefik (Procurando SwarmMode)..."
ssh $vps "docker service inspect traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Args}}'"

Write-Host "`n2. Verificando redes do servico Frontend..."
ssh $vps "docker service inspect whitelabel-frontend --format '{{json .Spec.TaskTemplate.Networks}}'"

Write-Host "`n3. Verificando redes do servico Traefik..."
ssh $vps "docker service inspect traefik_traefik --format '{{json .Spec.TaskTemplate.Networks}}'"

Write-Host "`n4. Verificando logs do Traefik relacionados ao dominio..."
ssh $vps "docker service logs traefik_traefik --tail 200 2>&1 | grep 'hubfit' || echo 'Nenhum log encontrado para hubfit'"

Write-Host "`n=== FIM DO DIAGNOSTICO ==="
