$vps = "root@195.26.243.64"
Write-Host "=== RESOLVENDO CONFLITO NO NGINX ==="

# 1. Create the bash script locally
$bashScript = @"
#!/bin/bash
DOMAIN='hubfit.salesflowoficial.com'
NEW_CONFIG='/etc/nginx/sites-enabled/hubfit'

echo 'Procurando conflitos...'
# Find files containing the domain in sites-enabled
# We use grep to find files that have the domain string
grep -l "`$DOMAIN" /etc/nginx/sites-enabled/* | while read -r file; do
    if [ "`$file" != "`$NEW_CONFIG" ]; then
        echo "Removendo conflito: `$file"
        rm "`$file"
    else
        echo "Mantendo config correta: `$file"
    fi
done

echo 'Recarregando Nginx...'
nginx -t && systemctl reload nginx
"@

$localScript = "fix_conflict.sh"
$bashScript | Out-File -FilePath $localScript -Encoding ASCII

Write-Host "`n1. Enviando script de correcao..."
scp $localScript "${vps}:/tmp/${localScript}"

Write-Host "`n2. Executando correcao..."
# Sanitize (remove Windows CR) and run
ssh $vps "tr -d '\r' < /tmp/${localScript} > /tmp/fix_conflict_clean.sh && bash /tmp/fix_conflict_clean.sh"

Write-Host "`n3. Limpando..."
Remove-Item $localScript

Write-Host "`n=== FIM ==="
Write-Host "Tente acessar: http://hubfit.salesflowoficial.com"
