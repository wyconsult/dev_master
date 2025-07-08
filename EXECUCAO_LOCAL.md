# Execução Local - LicitaTraker

## Pré-requisitos

1. **Node.js 20** ou superior instalado
2. **VS Code** com terminal integrado
3. **IP autorizado** na API ConLicitação (necessário para acesso aos dados reais)

## Instruções para Execução

### 1. Configuração Inicial
```bash
# Clonar/baixar o projeto
cd LicitaTraker

# Instalar dependências
npm install
```

### 2. Execução Local
```bash
# Executar o servidor com TypeScript
npx tsx server/index.ts
```

**Importante**: Execute sempre com `npx tsx server/index.ts` ao invés de `npm run dev` para garantir compatibilidade total com o ambiente local.

### 3. Acesso à Aplicação
- **URL**: `http://localhost:5000`
- **Credenciais de teste**: 
  - Email: `admin@test.com`
  - Senha: `admin123`

## Configuração da API ConLicitação

### Token de Autenticação
O sistema está configurado com o token oficial:
```
X-AUTH-TOKEN: 27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e
```

### IP Autorizado
Para funcionar com dados reais, seu IP deve estar autorizado na ConLicitação. Caso contrário:
- O sistema mostrará erros 401 (Unauthorized)
- **Não haverá dados fictícios de fallback** - isso é intencional para produção

### Endpoints da API
- Base URL: `https://consultaonline.conlicitacao.com.br/api`
- Filtros: `/filtros`
- Boletins: `/filtro/{id}/boletins`
- Dados do Boletim: `/boletim/{id}`

## Funcionalidades Disponíveis

### ✅ Completamente Implementado
- **Dashboard**: Hub simplificado sem cards desnecessários
- **Boletins**: Calendário com 3 boletins diários da API real
- **Licitações**: Listagem com filtros multi-seleção e dados reais
- **Favoritos**: Sistema de favoritos com filtros de data funcionais

### 🎨 Design Moderno
- Gradientes e efeitos glassmorphism
- Animações suaves e transições
- Interface responsiva
- Ícone de borracha vermelho para limpar filtros

### 🔐 Autenticação
- Sistema de login funcional
- Rotas protegidas
- Usuário de teste pré-configurado

## Troubleshooting

### ❌ Erro 401 (Token inválido ou IP não cadastrado)
**Causa**: Seu IP não está autorizado na ConLicitação  
**IP local para autorização**: `189.89.90.102`  
**Solução**: Entre em contato com a ConLicitação para autorizar seu IP

**Status no console do servidor:**
```
❌ IP não autorizado na ConLicitação API. Execute localmente com IP autorizado.
```

### Aplicação não carrega dados
**Causa**: Problemas de conectividade com a API
**Verificação**: Verifique os logs do console para detalhes do erro

### Erro de dependências
**Solução**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

## Estrutura do Projeto

```
├── client/          # Frontend React
├── server/          # Backend Node.js
├── shared/          # Esquemas compartilhados
├── server/conlicitacao-api.ts      # Cliente da API ConLicitação
├── server/conlicitacao-storage.ts  # Storage híbrido com API real
└── server/routes.ts                # Rotas da aplicação
```

## Observações Importantes

1. **Dados Reais Apenas**: Sistema configurado para usar apenas dados da API ConLicitação
2. **Sem Fallbacks**: Não há dados fictícios de backup - sistema falha graciosamente se a API não estiver disponível
3. **IP Dependente**: Funcionamento completo requer IP autorizado
4. **Execução Local**: Otimizado para desenvolvimento via VS Code terminal

---

**Status**: Pronto para produção com API real ConLicitação
**Última atualização**: Janeiro 2025