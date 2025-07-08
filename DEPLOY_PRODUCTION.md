# Deploy em Produção - LicitaTraker

## Pré-requisitos para Deploy

### 1. IPs Autorizados na ConLicitação
Os seguintes IPs estão configurados e autorizados na ConLicitação:

**IPs Autorizados:**
- **Desenvolvimento**: 189.89.90.102 (localhost)
- **Produção**: 31.97.26.138 (servidor de produção)

Ambos os IPs já estão configurados no sistema.

### 2. Configuração de IPs Autorizados

Editar o arquivo `server/ip-detector.ts`:

```typescript
const authorizedIPs = [
  '189.89.90.102',        // IP de desenvolvimento (localhost)
  '31.97.26.138'          // IP do servidor de produção
];
```

### 3. Configuração da API ConLicitação

O sistema está configurado com:
- **Base URL**: `https://consultaonline.conlicitacao.com.br/api`
- **Token**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- **Verificação de IP**: Automática

## Processo de Deploy

### Deploy no Replit

1. **Preparação**:
   ```bash
   npm run build
   ```

2. **Verificar IP do servidor**:
   - O sistema detectará automaticamente o IP no primeiro acesso
   - Verificar logs do console para confirmar se IP coincide com o autorizado (31.97.26.138)

5. **Deploy**:
   - Usar o botão "Deploy" do Replit
   - Verificar logs para confirmação de acesso à API

### Verificação pós-Deploy

Após o deploy, verificar:

1. **Conexão com API**: 
   - Logs devem mostrar "✅ IP atual está autorizado - API deve funcionar"
   - Endpoints `/api/filtros` e `/api/boletins` devem retornar dados

2. **Funcionalidades**:
   - Login de usuários funcionando
   - Listagem de licitações com dados reais
   - Sistema de favoritos operacional
   - Calendário de boletins com dados da API

## Troubleshooting de Produção

### IP não autorizado em produção
**Sintoma**: Erro 401 e logs mostrando IP não autorizado
**Solução**: 
1. Verificar IP atual nos logs
2. Solicitar autorização do novo IP se necessário
3. Atualizar lista de IPs autorizados no código

### API indisponível
**Sintoma**: Timeouts ou erros de conexão
**Verificação**:
1. Testar endpoint diretamente: `curl https://consultaonline.conlicitacao.com.br/api/filtros`
2. Verificar status da ConLicitação API
3. Confirmar token de autenticação

### Performance em produção
**Configurações recomendadas**:
- Cache de 5 minutos para licitações (já configurado)
- Limite de 3 boletins por consulta (já configurado)
- Conexão HTTP keep-alive (já configurado)

## Monitoramento

### Logs importantes
- Detecção automática de IP
- Status de autorização da API
- Erros de conectividade com ConLicitação
- Cache de licitações e atualizações

### Métricas de sucesso
- Taxa de sucesso nas chamadas à API ConLicitação
- Tempo de resposta das consultas
- Número de licitações sincronizadas
- Usuários ativos no sistema

---

**Status**: Pronto para deploy quando IP de produção for autorizado
**Última atualização**: Janeiro 2025