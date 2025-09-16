# JLG Consultoria - Sistema de Gestão de Licitações

## 📋 Sobre o Sistema

**JLG Consultoria** é uma plataforma completa para gestão de licitações que integra com a API ConLicitação para fornecer dados atualizados em tempo real. O sistema oferece funcionalidades avançadas de filtragem, favoritos, tabulação hierárquica e geração de relatórios em PDF.

### 🏗️ Arquitetura do Sistema

- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Banco de Dados**: MySQL (Produção) / MemStorage (Desenvolvimento)
- **API Externa**: ConLicitação API para dados reais
- **Deploy**: PM2 + Git

### ✅ Funcionalidades Principais

- ✅ **Dashboard Inteligente**: Carregamento otimizado com dados reais
- ✅ **Busca Independente**: Pesquisa por número de controle sem paginação
- ✅ **Sistema de Favoritos**: Gestão de favoritos por usuário com filtragem
- ✅ **Tabulação Hierárquica**: Categorização automática (Tipo → Categoria → Especialização)
- ✅ **Geração de PDF**: Relatórios customizados com dados tabulados
- ✅ **Interface Responsiva**: Mobile e desktop
- ✅ **Autenticação Segura**: Sistema completo de usuários

---

## 🔐 Credenciais de Acesso

### SSH - Servidor de Produção
```bash
ssh root@31.97.26.138
```
**Senha**: `Vermelho006@`

### PHPMyAdmin - Gestão do Banco
**URL**: http://31.97.26.138/phpmyadmin/  
**Usuário**: `wilson`  
**Senha**: `Vermelho006@`

### Aplicação - Usuários de Teste
**Wilson:**  
- Email: `wilson@jlg.com`  
- Senha: `Vermelho006@`

**Moacir:**  
- Email: `moacir@jlg.com`  
- Senha: `Vermelho006@`

---

## 🚀 Processo de Deploy

### Passo a Passo Completo

1. **Conectar ao Servidor**
   ```bash
   ssh root@31.97.26.138
   ```
   > **Senha**: `Vermelho006@`

2. **Navegar para o Diretório**
   ```bash
   cd ~/dev_master
   ```

3. **Baixar Atualizações**
   ```bash
   git pull origin main
   ```
   > **Senha Git**: `Vermelho006@`

4. **Instalar Dependências**
   ```bash
   npm ci
   ```

5. **Gerar Build de Produção**
   ```bash
   npm run build
   ```

6. **Reiniciar Aplicação**
   ```bash
   # Opção 1: Apenas a aplicação JLG
   pm2 restart jlg-licita
   
   # Opção 2: Todos os serviços (Recomendado)
   pm2 restart all
   ```

### ⚡ Deploy Rápido (Sequência Completa)
```bash
ssh root@31.97.26.138
cd ~/dev_master
git pull origin main
npm ci
npm run build
pm2 restart all
```

---

## 🗄️ Configuração do Banco de Dados

### Configuração Automática por Ambiente

**Desenvolvimento (Replit):**
- Sistema detecta automaticamente ambiente de desenvolvimento
- Utiliza MemStorage (dados em memória)
- Usuário: `admin@jlg.com` / `admin123`

**Produção (Servidor):**
- Sistema detecta automaticamente ambiente de produção
- Conecta no MySQL: `31.97.26.138`
- Usuários reais: Wilson e Moacir
- Dados reais da ConLicitação API

### Estrutura das Tabelas MySQL

```sql
-- Usuários do sistema
users: id, nome, email, password, nomeEmpresa, cnpj, createdAt

-- Licitações favoritas
favorites: id, userId, biddingId, category, customCategory, notes, 
          uf, site, codigoUasg, valorEstimado, createdAt

-- Boletins (cache da API)
boletins: id, numero_edicao, datahora_fechamento, visualizado
```

---

## 🌐 API ConLicitação - Configuração

### Autenticação
- **Token**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- **Header**: `X-AUTH-TOKEN`

### IPs Autorizados
- **Desenvolvimento (Replit)**: `35.227.80.200`
- **Produção**: `31.97.26.138`

### Endpoints Utilizados
```
https://consultaonline.conlicitacao.com.br/api/
├── /filtros - Lista de filtros disponíveis
├── /boletins - Boletins por filtro
├── /licitacoes - Licitações por boletim
└── /detalhes - Detalhes de licitação específica
```

---

## 📊 Sistema de Favoritos e Tabulação

### Hierarquia de Categorização
```
Alimentação/
├── Auxiliar de Cozinha → [Geral, Hospitalar, Escolar]
├── Coffee Break/Almoço/Jantar → [Simples, Completo, Executivo]
└── Fornecimento de Alimentação → [Regular, Especial, Emergência]

Concessão/
├── Concessões de Restaurante → [Básica, Completa, Especializada]
└── Exploração de Restaurante → [Total, Parcial, Temporária]

Mão de Obra/
├── Mão de Obra Cozinheira → [Geral, Especializada, Chefe]
└── Mão de Obra Merendeira → [Básica, Especializada, Supervisora]
```

### Campos Editáveis nos Favoritos
- **UF**: Estado da licitação
- **Site**: URL personalizada  
- **Código UASG**: Código da unidade gestora
- **Valor Estimado**: Valor formatado (R$ 65.000,00)
- **Categoria**: Tabulação hierárquica
- **Notas**: Observações personalizadas

---

## 📋 Relatórios PDF

### Campos Incluídos no Relatório
1. **CONTROLE** - Número de controle
2. **DATA** - Data com prioridade (Abertura → Prazo → Documento → Retirada → Visita)
3. **Nº PREGÃO** - Número do edital
4. **HORA** - Horário do evento
5. **ÓRGÃO** - Nome do órgão
6. **OBJETO** - Categoria tabulada
7. **UF** - Estado (editável)
8. **SITE** - URL personalizada (editável)
9. **CÓDIGO UNIDADE GESTORA** - Código UASG (editável)
10. **Valor Estimado Contratação** - Valor formatado (editável)

### Filtros para PDF
- **Por Data de Inclusão**: Quando foi adicionado aos favoritos
- **Por Data de Realização**: Data de abertura/prazo da licitação
- **Período Personalizável**: Range de datas selecionável

---

## 🔧 Monitoramento e Troubleshooting

### Comandos de Monitoramento
```bash
# Status dos serviços
pm2 status

# Logs em tempo real
pm2 logs jlg-licita

# Logs específicos
pm2 logs jlg-licita --lines 100

# Reiniciar se necessário
pm2 restart jlg-licita

# Parar e iniciar
pm2 stop jlg-licita
pm2 start jlg-licita
```

### Verificação de Saúde do Sistema
```bash
# Verificar se aplicação está respondendo
curl http://31.97.26.138:5000

# Testar conexão com banco
mysql -h localhost -u wilson -p jlg_consultoria

# Verificar espaço em disco
df -h

# Verificar uso de memória
htop
```

### Solução de Problemas Comuns

**1. Aplicação não carrega:**
```bash
pm2 restart all
pm2 logs jlg-licita
```

**2. Erro de conexão com banco:**
- Verificar se MySQL está rodando: `systemctl status mysql`
- Testar credenciais: `mysql -u wilson -p`

**3. API ConLicitação retorna erro:**
- Verificar IP autorizado nos logs
- Confirmar token de autenticação

**4. Build falha:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🌐 Acesso ao Sistema

### URLs de Produção
- **Aplicação Principal**: `http://31.97.26.138:5000`
- **PHPMyAdmin**: `http://31.97.26.138/phpmyadmin/`

### Fluxo de Login
1. Acesse `http://31.97.26.138:5000`
2. Use credenciais: `wilson@jlg.com` / `Vermelho006@` ou `moacir@jlg.com` / `Vermelho006@`
3. Sistema detecta usuário e carrega favoritos específicos

---

## ✅ Checklist de Deploy

### Pré-Deploy
- [ ] Código commitado no repositório
- [ ] Testes locais passando
- [ ] Build local funcionando

### Durante Deploy
- [ ] SSH conectado com sucesso
- [ ] Git pull executado sem conflitos
- [ ] npm ci instalou dependências
- [ ] npm run build concluído
- [ ] PM2 restart executado

### Pós-Deploy
- [ ] Aplicação acessível em http://31.97.26.138:5000
- [ ] Login funcionando com usuários reais
- [ ] Dashboard carregando dados
- [ ] Favoritos funcionando
- [ ] Tabulação categórica operacional
- [ ] Geração de PDF ativa
- [ ] API ConLicitação respondendo

---

## 📈 Performance e Escalabilidade

### Otimizações Implementadas
- **Hybrid Loading**: Carregamento básico rápido + busca sob demanda
- **Smart Caching**: Cache de 5 minutos para contadores
- **Parallel Processing**: Requisições simultâneas para múltiplos boletins
- **Optimistic Updates**: Interface atualiza antes da confirmação do servidor
- **Lazy Loading**: Componentes carregados conforme necessário

### Métricas de Performance
- **Tempo de Login**: < 2 segundos
- **Carregamento Dashboard**: < 3 segundos
- **Busca por Controle**: < 5 segundos
- **Geração PDF**: < 10 segundos

---

**Sistema em Produção** ✅  
**Última Atualização**: 15/09/2025  
**Versão**: 2.15 - JLG Consultoria Production Ready

---

> **Desenvolvido para JLG Consultoria**  
> Sistema completo de gestão de licitações com integração ConLicitação API