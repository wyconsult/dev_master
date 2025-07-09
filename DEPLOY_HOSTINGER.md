# Deploy para Servidor Hostinger

## Passos para Deploy Manual

### 1. Preparar código local (execute no terminal do Replit)
```bash
# Baixar arquivos do Replit para sua máquina local
# (usar o botão Download do Replit ou git clone)
```

### 2. Subir para GitHub (na sua máquina local)
```bash
git pull origin main --no-rebase
git status
git add .
git commit -m "Deploy Dev_Teste - Correções UI URGENTE e links"
git push origin main
```

### 3. Deploy no servidor Hostinger
```bash
ssh root@31.97.26.138
# Senha: Vermelho006@

cd ~/dev_master
git pull origin main
# Senha: Vermelho006@

npm install
npm run build
pm2 restart all
```

## Status do Código
- ✅ Correções de UI aplicadas
- ✅ IP do servidor (31.97.26.138) configurado como produção
- ⚠️ IP Replit mudou para 35.227.80.200 - precisa autorização na ConLicitação
- ✅ Sistema pronto para produção com dados reais da ConLicitação
- ✅ Links de documentos corrigidos
- ✅ Badge URGENTE com correções de layout

## Arquivos Principais Modificados
- `client/src/components/bidding-card.tsx` - Correções de UI
- `server/ip-detector.ts` - Configuração de IPs
- `server/conlicitacao-storage.ts` - Mapeamento API real
- `shared/schema.ts` - Campo link_edital

## Verificações Pós-Deploy
1. Verificar se o IP 31.97.26.138 está autorizado na ConLicitação
2. Testar se badges "URGENTE" aparecem completos
3. Testar se links de documentos funcionam
4. Verificar se dados reais da API estão carregando