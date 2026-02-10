$vps = "root@31.220.103.111"
Write-Host "=== INVESTIGACAO PROFUNDA ==="

Write-Host "`n1. Verificando se existe OUTRO Traefik rodando..."
ssh $vps "docker ps --filter name=traefik"

Write-Host "`n2. Obtendo ID do container Frontend..."
$cid = (ssh $vps "docker ps -q -f name=whitelabel-frontend | head -n 1")
$cid = $cid.Trim()
Write-Host "   -> Container ID: $cid"

if ($cid) {
    Write-Host "`n3. Verificando headers do Nginx DENTRO do container..."
    ssh $vps "docker exec $cid cat /etc/nginx/conf.d/default.conf"

    Write-Host "`n4. Verificando logs de acesso do Nginx (Container)..."
    ssh $vps "docker service logs whitelabel-frontend --tail 10"

    Write-Host "`n5. Verificando se o arquivo index.html no container tem a tag BETA..."
    ssh $vps "docker exec $cid grep -r 'BETA' /usr/share/nginx/html/assets | head -n 1"
}
else {
    Write-Host "ERRO: Container do frontend nao encontrado!"
}

Write-Host "`n=== FIM ==="
