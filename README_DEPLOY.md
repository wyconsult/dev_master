# Deploy Automático - LicitaTraker

## 📋 Preparação do Sistema para Produção

### ✅ Estado Atual do Sistema
- **Tabulação Hierárquica**: 100% funcional (Tipo de Objeto → Categoria → Especialização)
- **API ConLicitação**: Preparada para dados reais
- **PDF Otimizado**: Campos desnecessários removidos
- **Sincronização**: Dados salvos corretamente entre telas

### 🚀 Deploy Automático em 1 Clique

Execute o arquivo `DEPLOY_AUTOMATICO.bat` que fará:

1. **Sync Local → GitHub**
   - Limpa arquivos temporários
   - Baixa mudanças do Replit
   - Commit das funcionalidades completas
   - Push para o repositório

2. **Deploy GitHub → Servidor**
   - Conecta via SSH ao servidor de produção
   - Atualiza código no servidor
   - Instala dependências
   - Gera build otimizado
   - Reinicia aplicação

### 🔧 Configuração de Produção

#### IP Autorizado
- **Servidor de Produção**: `31.97.26.138`
- **Senha SSH**: `Vermelho006@`
- **API ConLicitação**: Token já configurado

#### Funcionalidades em Produção
- ✅ Dashboard com dados reais da API
- ✅ Filtros avançados de licitações
- ✅ Sistema de favoritos completo
- ✅ Tabulação hierárquica automática
- ✅ PDF com campos otimizados
- ✅ Interface responsiva

### 📊 Estrutura de Dados Reais

#### Quando Sistema Rodar em IP Autorizado:
```
Filtros → API ConLicitação
Boletins → Dados reais por filtro
Licitações → Informações completas atualizadas
Contagens → Calculadas dinamicamente dos arrays
```

#### Mapeamento de Status:
- `RET` → RETIFICAÇÃO
- `ADIA` → ADIADA
- `PRO` → PRORROGADA
- `ALTER` → ALTERADA
- `REAB` → REABERTA
- `CANCE` → CANCELADA
- `SUS` → SUSPENSA
- `REVO` → REVOGADA

### 📁 Estrutura Hierárquica de Tabulação

```
Alimentação/
├── Auxiliar de Cozinha → [Geral, Hospitalar, Escolar]
├── Coffee Break/Almoço/Jantar → [Simples, Completo, Executivo]
├── Fornecimento de Alimentação → [Regular, Especial, Emergência]
└── ...

Concessão/
├── Concessões de Restaurante → [Básica, Completa, Especializada]
├── Exploração de Restaurante → [Total, Parcial, Temporária]
└── ...

Mão de Obra/
├── Mão de Obra Cozinheira → [Geral, Especializada, Chefe]
├── Mão de Obra Merendeira → [Básica, Especializada, Supervisora]
└── ...
```

### 🔄 Monitoramento Pós-Deploy

Após o deploy, verificar:

```bash
# Conectar ao servidor
ssh root@31.97.26.138

# Verificar status da aplicação
pm2 status

# Ver logs em tempo real
pm2 logs licitatraker

# Restart se necessário
pm2 restart all
```

### 🌐 Acesso ao Sistema

- **URL de Produção**: `http://31.97.26.138:5000`
- **Login**: Sistema de autenticação básico
- **Funcionalidades**: Todas implementadas e testadas

### 📝 Dados de Login de Teste

Para testar o sistema em produção, use:
- **Email**: `admin@licitatraker.com`
- **Senha**: `123456`

### 🔧 Troubleshooting

#### Se o deploy falhar:
1. Verificar conexão SSH
2. Executar comandos manualmente:
   ```bash
   ssh root@31.97.26.138
   cd ~/dev_master
   git pull origin main
   npm ci
   npm run build
   pm2 restart all
   ```

#### Se API não retornar dados:
- Verificar se IP está autorizado na ConLicitação
- Logs mostrarão status de autorização automaticamente

### ✅ Checklist Final

- [ ] `DEPLOY_AUTOMATICO.bat` executado com sucesso
- [ ] Aplicação acessível em `http://31.97.26.138:5000`
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Filtros de licitações operacionais
- [ ] Sistema de favoritos com tabulação
- [ ] PDF sendo gerado corretamente

---

**Sistema Pronto para Produção** ✅  
**Última Atualização**: 11/08/2025  
**Versão**: 1.0 - Production Ready com Tabulação Hierárquica