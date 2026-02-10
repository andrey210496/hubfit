$vps = "root@195.26.243.64"
$domain = "hubfit.salesflowoficial.com"

Write-Host "=== CONFIGURANDO NGINX REVERSE PROXY (HOST) ==="

# Nginx Configuration Content
$nginxConf = @"
server {
    listen 80;
    server_name $domain;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
    }
}
"@

Write-Host "`n1. Criando arquivo de configuracao local..."

# Use `n (Line Feed) explicitly for NewLines to allow cleaner Linux parsing if possible, 
# though Windows might still add CR when saving. We will fix it remotely.
$nginxConf = "server {`n    listen 80;`n    server_name $domain;`n`n    location / {`n        proxy_pass http://127.0.0.1:3000;`n        proxy_http_version 1.1;`n        proxy_set_header Upgrade `$http_upgrade;`n        proxy_set_header Connection 'upgrade';`n        proxy_set_header Host `$host;`n        proxy_cache_bypass `$http_upgrade;`n        proxy_set_header X-Real-IP `$remote_addr;`n        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;`n    }`n}"

$localTempFile = "hubfit_proxy.conf"
# ASCII encoding usually keeps CRLF on Windows, but let's confirm.
$nginxConf | Out-File -FilePath $localTempFile -Encoding ASCII

Write-Host "`n2. Enviando arquivo para o servidor (SCP)..."
scp $localTempFile "${vps}:/tmp/${localTempFile}"

Write-Host "`n3. Limpando quebras de linha (Windows -> Linux) e Ativando..."
# We construct the command in a way that avoids complex multiline strings if potential for corruption exists.
# We explicitly run tr -d '\r' to sanitize the uploaded file.
$remoteCommands = "tr -d '\r' < /tmp/${localTempFile} > /tmp/hubfit_clean.conf && " +
"mv /tmp/hubfit_clean.conf /etc/nginx/sites-available/hubfit && " +
"chown root:root /etc/nginx/sites-available/hubfit && " +
"ln -sf /etc/nginx/sites-available/hubfit /etc/nginx/sites-enabled/ && " +
"nginx -t && " +
"systemctl reload nginx"

ssh $vps $remoteCommands

Write-Host "`n4. Limpando..."
Remove-Item $localTempFile

Write-Host "`n=== FIM ==="
Write-Host "Tente acessar: http://$domain"
