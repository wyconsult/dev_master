# Guia de Deploy em Produção - LicitaTraker

## Requisitos para Deploy

### 1. Autorização de IP na ConLicitação
- **CRÍTICO**: Seu IP de produção deve estar autorizado na API ConLicitação
- **Token de Autenticação**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e` (já configurado)
- **IPs Autorizados Atualmente**: 
  - 35.227.80.200 (desenvolvimento - Replit)
  - 31.97.26.138 (produção autorizada - servidor alvo)

### 2. Configuração do Servidor de Produção

#### Variáveis de Ambiente Necessárias:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://usuario:senha@host:port/database
PORT=5000
```

#### Configuração do Banco de Dados:
- PostgreSQL 16+ (recomendado)
- Conexão SSL habilitada para produção
- Pool de conexões configurado

## Processo de Deploy

### 1. Preparar o Ambiente
```bash
# Clone o repositório
git clone https://github.com/wyconsult/dev_master.git
cd dev_master

# Instalar dependências
npm install
```

### 2. Deploy no Servidor (IP Autorizado: 31.97.26.138)

#### No seu PC local:
```bash
# Verificar remote
git remote -v

# Adicionar origin se necessário
git remote add origin https://github.com/wyconsult/dev_master.git

# Pull para sincronizar
git pull origin main --rebase

# Commit e push das mudanças
git add .
git commit -m "Apontamentos 08 08 2025."
git push origin main
```

#### No servidor de produção:
```bash
# Conectar ao servidor
ssh root@31.97.26.138
# Senha: Vermelho006@

# Ir para o diretório do projeto
cd ~/dev_master

# Puxar as mudanças
git pull origin main

# Instalar dependências (CI mode)
npm ci

# Gerar build otimizado
npm run build

# Reiniciar PM2
pm2 restart all
```

## Verificação de Funcionalidades

### ✅ API ConLicitação - Integração Completa
- **Filtros**: GET `/api/filtros` - Lista filtros disponíveis
- **Boletins**: GET `/api/filtro/{id}/boletins` - Boletins por filtro
- **Licitações**: GET `/api/boletim/{id}` - Dados completos com licitações
- **Contagem Dinâmica**: Quantidades calculadas dos arrays reais da API

### ✅ Funcionalidades Implementadas
- ✅ Sistema de autenticação básico
- ✅ Dashboard com estatísticas em tempo real
- ✅ Navegação por boletins com calendário
- ✅ Busca e filtros avançados de licitações
- ✅ Sistema de favoritos com categorização
- ✅ Geração de PDF dos favoritos
- ✅ Interface de tabulação automática
- ✅ Responsividade mobile completa

### ✅ Otimizações de Produção
- ✅ Cache inteligente de dados
- ✅ Pré-carregamento de licitações
- ✅ Detecção automática de IP para logs
- ✅ Tratamento robusto de erros da API
- ✅ Fallback seguro para indisponibilidade temporária

## Configuração de Servidor Web

### Nginx (Recomendado)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

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
    }
}
```

### PM2 para Gerenciamento de Processo
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start dist/index.js --name "licitatraker"

# Configurar inicialização automática
pm2 startup
pm2 save
```

## Monitoramento e Logs

### Logs da Aplicação
- **IP Detection**: Sistema mostra IP atual e compara com autorizados
- **API Status**: Logs detalhados de conexão com ConLicitação
- **Error Handling**: Tratamento completo de erros de rede e API

### Comandos de Monitoramento
```bash
# Ver logs em tempo real
pm2 logs licitatraker

# Status da aplicação
pm2 status

# Restart se necessário
pm2 restart licitatraker
```

## Checklist de Deploy

### Antes do Deploy:
- [ ] IP do servidor autorizado na ConLicitação API
- [ ] Banco PostgreSQL configurado e acessível
- [ ] Variáveis de ambiente definidas
- [ ] Certificado SSL configurado (se HTTPS)

### Durante o Deploy:
- [ ] `npm install` executado com sucesso
- [ ] `npm run db:push` executado (primeira vez)
- [ ] `npm run build` executado sem erros
- [ ] `npm run start` inicia sem problemas

### Após o Deploy:
- [ ] Aplicação acessível via browser
- [ ] Login funcionando
- [ ] Dashboard carregando dados reais
- [ ] Boletins sendo exibidos
- [ ] Filtros de licitações funcionando
- [ ] Sistema de favoritos operacional

## Estrutura de Dados Reais

### Quando IP Autorizado:
- **Filtros**: Dados reais da ConLicitação API
- **Boletins**: Lista real de boletins por filtro
- **Licitações**: Dados completos e atualizados
- **Contagens**: Calculadas dinamicamente dos arrays da API

### Mapeamento de Status:
- RET → RETIFICAÇÃO
- ADIA → ADIADA  
- PRO → PRORROGADA
- ALTER → ALTERADA
- REAB → REABERTA
- CANCE → CANCELADA
- SUS → SUSPENSA
- REVO → REVOGADA

## Suporte e Troubleshooting

### Problemas Comuns:

1. **"IP não autorizado"**
   - Verificar IP público do servidor
   - Solicitar autorização do IP na ConLicitação

2. **Erro de banco de dados**
   - Verificar DATABASE_URL
   - Executar `npm run db:push`

3. **Build falha**
   - Verificar versão Node.js (20+)
   - Limpar cache: `rm -rf node_modules package-lock.json && npm install`

### Logs de Debug:
```bash
# Ver IP atual detectado
curl -s http://httpbin.org/ip

# Testar API ConLicitação manualmente
curl -H "X-AUTH-TOKEN: 27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e" \
     https://consultaonline.conlicitacao.com.br/api/filtros
```

## Contato para Autorização de IP
Para autorizar novo IP na ConLicitação API, entrar em contato com o administrador do sistema fornecendo:
- IP público do servidor de produção
- Finalidade do acesso (LicitaTraker - Sistema de Gestão de Licitações)
- Responsável técnico

---

**Status**: ✅ **SISTEMA COMPLETO PRONTO PARA PRODUÇÃO**
**Última Atualização**: 11/08/2025
**Versão**: 1.0 - Production Ready com Tabulação Hierárquica Funcional

## ✅ Funcionalidades Implementadas e Testadas

### Tabulação Hierárquica Completa
- ✅ Estrutura: Tipo de Objeto → Categoria → Especialização
- ✅ Dados baseados na planilha real do usuário
- ✅ Especialização funcional com opções reais
- ✅ Sincronização entre telas de Licitações e Favoritos
- ✅ Salvamento e carregamento correto dos dados

### PDF Otimizado
- ✅ Campos removidos: FORNECEDOR ATUAL, CNPJ do Fornecedor, Valor do Contrato
- ✅ Cabeçalho e dados alinhados corretamente
- ✅ Geração funcional testada

### Deploy Automático
- ✅ Script `DEPLOY_AUTOMATICO.bat` criado
- ✅ Processo completo: Local → GitHub → Servidor
- ✅ Comandos SSH automatizados