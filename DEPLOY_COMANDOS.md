# Comandos de Deploy - Sequência Exata

## 1) No seu PC local:

```bash
git remote -v
git remote add origin https://github.com/wyconsult/dev_master.git
git pull origin main --rebase

git add .
git commit -m "Apontamentos 08 08 2025."
git push origin main
```

## 2) No servidor de produção:

```bash
ssh root@31.97.26.138
# Senha: Vermelho006@

cd ~/dev_master

# Puxar as mudanças
git pull origin main

# Instalar dependências em CI mode
npm ci

# Gerar o build front + back
npm run build

# Reiniciar o PM2 (tudo ou só seu app)
pm2 restart all
```

## Status após deploy:
- ✅ Aplicação estará rodando no IP autorizado 31.97.26.138
- ✅ API ConLicitação funcionará com dados reais
- ✅ Todas as funcionalidades operacionais

## Verificação:
```bash
# Ver status dos processos
pm2 status

# Ver logs em tempo real
pm2 logs

# Verificar se a aplicação está respondendo
curl http://localhost:5000
```

---
**IP AUTORIZADO**: 31.97.26.138 ✅
**DADOS REAIS**: ConLicitação API funcionará perfeitamente ✅