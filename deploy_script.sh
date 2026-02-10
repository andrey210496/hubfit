#!/bin/bash
# Stop on error
set -e

echo "=== Iniciando Deploy do Frontend (Server Side) ==="

echo "1. Limpando pasta de deploy..."
DEPLOY_DIR="/var/www/whitelabel-frontend"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR
# Ensure permissions for Nginx
chmod 755 $DEPLOY_DIR

echo "2. Descompactando /tmp/dist.tgz..."
if [ -f /tmp/dist.tgz ]; then
    # Use tar to extract
    tar -xzf /tmp/dist.tgz -C $DEPLOY_DIR
    rm /tmp/dist.tgz
else
    echo "ERRO: Arquivo /tmp/dist.tgz nao encontrado!"
    exit 1
fi

echo "3. Configurando Nginx..."
# Create a custom nginx config for SPA (React Router)
cat <<EOF > $DEPLOY_DIR/nginx_spa.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip Settings
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
    
    # Optional: Cache control for assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Ensure all files are readable
chmod -R 755 $DEPLOY_DIR

# ... (Keep previous part)

echo "4. Iniciando Container com Suporte a Dominio (Traefik)..."
CONTAINER_NAME="whitelabel-frontend"
DOMAIN="hubfit.salesflowoficial.com"
PORT="3000"

# Remove old container
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker rm -f $CONTAINER_NAME
fi

# Detect Traefik Network (Robust)
echo "   -> Buscando rede do Traefik..."
TRAEFIK_ID=$(docker ps -q -f name=traefik | head -n 1)
SELECTED_NETWORK=""

if [ ! -z "$TRAEFIK_ID" ]; then
    # Get all networks attached to Traefik
    NETWORKS=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' $TRAEFIK_ID | grep -v "ingress" | grep -v "bridge" | grep -v "host")
    
    for NET in $NETWORKS; do
        echo "      -> Testando rede: $NET..."
        # Try to run a dummy container to check if network is attachable
        if docker run --rm --network "$NET" alpine true 2>/dev/null; then
            echo "      -> Sucesso! Rede '$NET' aceita conexoes."
            SELECTED_NETWORK="$NET"
            break
        else
            echo "      -> Falha: Rede '$NET' nao permite attach manual."
        fi
    done
fi

# Check if we found a network, even if manual attach failed (it might be Swarm)
if [ -z "$SELECTED_NETWORK" ]; then
     if [ ! -z "$TRAEFIK_ID" ]; then
         # Check if we have a candidate from strict grep that failed the test
         # If it exists, it's likely a Swarm network
         CANDIDATE=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' $TRAEFIK_ID | grep -v "ingress" | grep -v "bridge" | grep -v "host" | head -n 1)
         if [ ! -z "$CANDIDATE" ]; then
             echo "      -> Rede '$CANDIDATE' detectada (provavel Swarm)."
             Network="$CANDIDATE"
         fi
     fi
else
     Network="$SELECTED_NETWORK"
fi

# Fallback
if [ -z "$Network" ]; then
    Network=$(docker network ls --format '{{.Name}}' | grep -E 'traefik|proxy|public|web' | head -n 1)
fi

if [ -z "$Network" ]; then
   # STANDALONE MODE
   echo "AVISO: Rede do Traefik nao detectada."
   echo "   -> Rodando em modo Standalone na porta $PORT"
   docker run -d --name $CONTAINER_NAME --restart unless-stopped -p $PORT:80 -v $DEPLOY_DIR:/usr/share/nginx/html -v $DEPLOY_DIR/nginx_spa.conf:/etc/nginx/conf.d/default.conf nginx:alpine
   
   # Tentar configurar Nginx do Host para Proxy Reverso (se existir)
   if command -v nginx &> /dev/null; then
       echo "   -> Nginx detectado no Host. Verificando conflitos..."
       
       # Remove existing configs that might define this domain to avoid "conflicting server name"
       # This searches strictly for the server_name directive followed by the domain
       # We ignore the new file we intend to create to avoid deleting it prematurely if it matched
       TARGET_CONF="/etc/nginx/conf.d/$DOMAIN.conf"
       
       grep -r "server_name" /etc/nginx 2>/dev/null | grep "$DOMAIN" | awk -F: '{print $1}' | sort | uniq | while read -r file; do
           if [ "$file" != "$TARGET_CONF" ] && [ "$file" != "/etc/nginx/sites-available/$DOMAIN" ] && [ "$file" != "/etc/nginx/nginx.conf" ]; then
               echo "      -> Removendo conflito encontrado em: $file"
               rm -f "$file"
               # If it was a symlink in sites-enabled, check if source exists and remove it too
               if [[ "$file" == *"/etc/nginx/sites-enabled/"* ]]; then
                   AVAIL_FILE=$(readlink -f "$file")
                   if [ -f "$AVAIL_FILE" ]; then
                       echo "      -> Removendo origem do link: $AVAIL_FILE"
                       rm -f "$AVAIL_FILE"
                   fi
               fi
           fi
       done

       # Force removal of default if it catches all
       if [ -f "/etc/nginx/sites-enabled/default" ]; then
           if grep -q "default_server" "/etc/nginx/sites-enabled/default"; then
               echo "      -> Desativando site padrao (default) para evitar captura de trafego..."
               rm -f "/etc/nginx/sites-enabled/default"
           fi
       fi

       # Clean up any broken symlinks in sites-enabled
       echo "      -> Verificando links quebrados em sites-enabled..."
       for link in /etc/nginx/sites-enabled/*; do
           if [ -L "$link" ] && [ ! -e "$link" ]; then
               echo "      -> Removendo link quebrado: $link"
               rm -f "$link"
           fi
       done

       echo "   -> Configurando Proxy Reverso..."
       NGINX_CONF="$TARGET_CONF"
       
       # Se nao usar conf.d, tentar sites-available (Debian/Ubuntu)
       if [ ! -d "/etc/nginx/conf.d" ] && [ -d "/etc/nginx/sites-available" ]; then
            NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
            USE_SYMLINK=true
       fi

       cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

       if [ "$USE_SYMLINK" = true ]; then
           ln -sf $NGINX_CONF /etc/nginx/sites-enabled/$DOMAIN
       fi

       echo "   -> Testando e Recarregando Nginx..."
       nginx -t && nginx -s reload
       echo "   -> Proxy reverso configurado no host: $DOMAIN -> 127.0.0.1:$PORT"

       # Tentar configurar SSL com Certbot
       if command -v certbot &> /dev/null; then
           echo "   -> Certbot detectado. Tentando obter certificado SSL para $DOMAIN..."
           # --redirect força redirecionamento HTTP -> HTTPS
           # --register-unsafely-without-email evita prompt interativo
           # --agree-tos aceita os termos automaticamente
           certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect
           
           if [ $? -eq 0 ]; then
               echo "   -> SSL configurado com SUCESSO! O site agora esta seguro (HTTPS)."
           else
               echo "   -> AVISO: Falha ao configurar SSL. Verifique os logs do Certbot ou tente manualmente: 'certbot --nginx -d $DOMAIN'"
           fi
       else
           echo "   -> AVISO: Certbot nao encontrado no servidor. O site estara acessivel apenas via HTTP (http://$DOMAIN)."
           echo "      Recomendacao: Instale o certbot (apt install python3-certbot-nginx) para habilitar HTTPS."
       fi
   fi


else
    # Check Network Scope
    SCOPE=$(docker network inspect $Network -f '{{.Scope}}')
    echo "   -> Rede detectada: $Network (Scope: $SCOPE)"
    
    if [ "$SCOPE" == "swarm" ]; then
        echo "   -> MODO SWARM DETECTADO."
        SERVICE_NAME="whitelabel-frontend"
        
        # Remove old service if exists
        if docker service ls --format '{{.Name}}' | grep -q "^${SERVICE_NAME}$"; then
            echo "      -> Removendo servico antigo..."
            docker service rm $SERVICE_NAME
        fi

        # Remove container if exists (cleanup)
        if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
             docker rm -f $CONTAINER_NAME
        fi
        
        echo "   -> Criando Servico Docker Swarm..."
        docker service create \
            --name $SERVICE_NAME \
            --network $Network \
            --replicas 1 \
            --constraint 'node.role==manager' \
            --mount type=bind,source=$DEPLOY_DIR,target=/usr/share/nginx/html \
            --mount type=bind,source=$DEPLOY_DIR/nginx_spa.conf,target=/etc/nginx/conf.d/default.conf \
            --label "traefik.enable=true" \
            --label "traefik.http.routers.hubfit-frontend.rule=Host(\`$DOMAIN\`)" \
            --label "traefik.http.routers.hubfit-frontend.entrypoints=websecure" \
            --label "traefik.http.routers.hubfit-frontend.tls.certresolver=myresolver" \
            --label "traefik.http.services.hubfit-frontend.loadbalancer.server.port=80" \
            --container-label "traefik.enable=true" \
            --container-label "traefik.http.routers.hubfit-frontend.rule=Host(\`$DOMAIN\`)" \
            --container-label "traefik.http.routers.hubfit-frontend.entrypoints=websecure" \
            --container-label "traefik.http.routers.hubfit-frontend.tls.certresolver=myresolver" \
            --container-label "traefik.http.services.hubfit-frontend.loadbalancer.server.port=80" \
            nginx:alpine
            
    else
        echo "   -> MODO CONTAINER (Local)."
        # ... (Keep Conflict Check Logic from previous step)
        # Iterate all containers to find who owns the domain
        for id in $(docker ps -q); do
            if docker inspect $id | grep -q "$DOMAIN"; then
                name=$(docker inspect --format '{{.Name}}' $id)
                clean_name=${name#/}
                if [ "$clean_name" != "$CONTAINER_NAME" ]; then
                    echo "      -> CONFLITO: Parando '$clean_name'..."
                    docker stop $id
                    docker rename $clean_name "${clean_name}_bkp"
                fi
            fi
        done

        docker run -d \
            --name $CONTAINER_NAME \
            --restart unless-stopped \
            --network "$Network" \
            -l "traefik.enable=true" \
            -l "traefik.http.routers.hubfit-frontend.rule=Host(\`$DOMAIN\`)" \
            -l "traefik.http.routers.hubfit-frontend.entrypoints=websecure" \
            -l "traefik.http.routers.hubfit-frontend.tls.certresolver=myresolver" \
            -l "traefik.http.services.hubfit-frontend.loadbalancer.server.port=80" \
            -v $DEPLOY_DIR:/usr/share/nginx/html \
            -v $DEPLOY_DIR/nginx_spa.conf:/etc/nginx/conf.d/default.conf \
            nginx:alpine
    fi
fi

if [ $? -eq 0 ]; then
    echo "=== DEPLOY CONCLUIDO COM SUCESSO! ==="
    if [ ! -z "$Network" ]; then
        echo "O Frontend deve estar acessivel em: https://$DOMAIN"
    fi
    echo "Backup (IP Direto): nao disponivel em modo rede (Traefik) ou http://(IP):$PORT (se Standalone)"
else
    echo "ERRO ao iniciar o container."
    exit 1
fi
