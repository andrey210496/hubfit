$vps = "root@31.220.103.111"
Write-Host "=== CACA AO FANTASMA (IMPOSTER HUNT) ==="

Write-Host "`n1. Procurando qualquer container com o dominio 'hubfit' nas configuracoes..."
ssh $vps "docker ps -q | xargs docker inspect --format '{{.Name}} {{.Config.Labels}}' | grep hubfit"

Write-Host "`n2. Procurando qualquer SERVICO com o dominio 'hubfit'..."
ssh $vps "docker service ls -q | xargs docker service inspect --format '{{.Spec.Name}} {{.Spec.Labels}}' | grep hubfit"

Write-Host "`n3. TESTE DE VIDA OU MORTE: Desligando o servico novo..."
ssh $vps "docker service scale whitelabel-frontend=0"

Write-Host "`n4. Aguardando desligamento (5s)..."
Start-Sleep -Seconds 5

Write-Host "`n=== AGORA TESTE O SITE ==="
Write-Host "Acesse https://hubfit.salesflowoficial.com/"
Write-Host "Se der 404/Bad Gateway -> Otimo! Nos eramos o unico servico (problema de arquivo)."
Write-Host "Se o site ABRIR -> TEM UM FANTASMA! (Outro container servindo o site)."
