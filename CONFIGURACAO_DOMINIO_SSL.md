# Configuração Domínio e SSL - jlglicitacoes.com.br

## Status DNS
✅ Registros DNS configurados:
- A: @ → 31.97.26.138
- CNAME: www → jlglicitacoes.com.br

## Configuração no Servidor

### 1. Acesso SSH
```bash
ssh root@31.97.26.138
# Senha: Vermelho006@
cd ~/dev_master
```

### 2. Verificar Estado Atual
```bash
# Verificar se aplicação está rodando
ps aux | grep node
pm2 list

# Verificar nginx
nginx -v
systemctl status nginx

# Verificar porta da aplicação
netstat -tlnp | grep :5000
```

### 3. Instalar Nginx (se necessário)
```bash
apt update
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

### 4. Criar Configuração do Domínio
```bash
nano /etc/nginx/sites-available/jlglicitacoes.com.br
```

Conteúdo do arquivo:
```nginx
server {
    listen 80;
    server_name jlglicitacoes.com.br www.jlglicitacoes.com.br;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 5. Ativar Site
```bash
# Criar link simbólico
ln -s /etc/nginx/sites-available/jlglicitacoes.com.br /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Recarregar nginx
systemctl reload nginx
```

### 6. Instalar Certbot e SSL
```bash
# Instalar certbot
apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
certbot --nginx -d jlglicitacoes.com.br -d www.jlglicitacoes.com.br

# Durante o processo, escolha:
# Email: seu-email@exemplo.com
# Aceitar termos: Y
# Compartilhar email: N (opcional)
# Redirect HTTP to HTTPS: 2 (recomendado)
```

### 7. Configurar Auto-renovação SSL
```bash
# Testar renovação
certbot renew --dry-run

# Adicionar ao crontab (renovação automática)
crontab -e
# Adicionar linha:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Verificar Firewall
```bash
# Verificar status do firewall
ufw status

# Se ativo, permitir HTTP e HTTPS
ufw allow 'Nginx Full'
ufw allow ssh
```

### 9. Testar Configuração
```bash
# Verificar se nginx está funcionando
systemctl status nginx

# Verificar certificado SSL
openssl s_client -connect jlglicitacoes.com.br:443 -servername jlglicitacoes.com.br
```

## Verificação Final

Após executar todos os passos:

1. **HTTP**: http://jlglicitacoes.com.br → deve redirecionar para HTTPS
2. **HTTPS**: https://jlglicitacoes.com.br → aplicação funcionando
3. **WWW**: https://www.jlglicitacoes.com.br → deve funcionar igual

## Troubleshooting

### Se aplicação não responder:
```bash
# Verificar se aplicação está rodando
pm2 list
pm2 restart all

# Verificar logs
pm2 logs
tail -f /var/log/nginx/error.log
```

### Se SSL não funcionar:
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew
```

### Se domínio não resolver:
```bash
# Testar DNS
nslookup jlglicitacoes.com.br
dig jlglicitacoes.com.br
```

## Notas Importantes

- DNS pode levar até 24h para propagar completamente
- Aplicação deve estar rodando na porta 5000 (conforme configuração)
- Certificado SSL renova automaticamente a cada 90 dias
- Sempre fazer backup antes de mudanças importantes

## Resultado Esperado

Após concluir, você terá:
- ✅ Domínio jlglicitacoes.com.br funcionando
- ✅ SSL/TLS ativo (HTTPS)
- ✅ Redirecionamento automático HTTP → HTTPS
- ✅ www.jlglicitacoes.com.br funcionando
- ✅ Renovação automática do certificado