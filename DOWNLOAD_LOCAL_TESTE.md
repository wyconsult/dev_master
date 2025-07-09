# Download Local para Teste com Dados Reais

Este guia permite baixar e executar o projeto localmente com acesso à API real da ConLicitação.

## Pré-requisitos

- Node.js 18 ou superior
- NPM ou Yarn

## Passos para Execução Local

### 1. Baixar o Projeto

```bash
# Criar diretório local
mkdir LicitaTraker
cd LicitaTraker

# Baixar todos os arquivos do projeto
# (Copiar arquivos do Replit para o diretório local)
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Executar o Servidor

```bash
npx tsx server/index.ts
```

A aplicação estará disponível em: `http://localhost:5000`

## Configuração da API Real

### Token de Autenticação
- **Token**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- **Base URL**: `https://consultaonline.conlicitacao.com.br/api`

### IPs Autorizados
- **Desenvolvimento (Replit)**: `35.227.80.200`
- **Produção**: `31.97.26.138`
- **Seu IP Local**: Verificar com o admin da ConLicitação

## Estrutura dos Dados Reais

### Situação da Licitação
O campo `situacao` pode ter os seguintes valores:
- `NOVA` - Licitação nova (verde)
- `ABERTA` - Licitação aberta (azul)
- `URGENTE` - Licitação urgente (vermelho)
- `PRORROGADA` - Licitação prorrogada (laranja)
- `ALTERADA` - Licitação alterada (roxo)
- `FINALIZADA` - Licitação finalizada (cinza)

### Links dos Documentos
- **Campo principal**: `documento[0]` da API
- **Mapeamento**: `documento_url` e `link_edital`
- **Fallback**: URL do ConLicitação com `conlicitacao_id`

## Verificação de Funcionamento

### 1. Badge "URGENTE"
- Verifica se aparece corretamente em vermelho
- Texto deve estar centralizado e visível
- Largura mínima de 100px

### 2. Links dos Documentos
- Clique em "Acessar documento" deve abrir o PDF
- Se não houver documento, abre a página da licitação
- URLs devem ser válidas e acessíveis

### 3. Dados da API
- Órgãos reais aparecendo nos filtros
- Datas e informações corretas
- Paginação funcionando

## Logs de Depuração

O sistema mostra logs detalhados:
- IP atual detectado
- Status da autorização
- Erros de API
- Dados recebidos

## Problemas Conhecidos

### IP Não Autorizado
```
🚫 API ConLicitação: IP não autorizado.
💡 Para acesso aos dados reais, execute em ambiente com IP autorizado
```

**Solução**: Solicitar autorização do IP local ao admin da ConLicitação.

### Dados de Teste
Se IP não estiver autorizado, sistema usa dados de teste que simulam a estrutura real.

## Arquivos Importantes

- `server/conlicitacao-api.ts` - Cliente da API
- `server/conlicitacao-storage.ts` - Transformação dos dados
- `client/src/components/bidding-card.tsx` - Exibição dos badges
- `shared/schema.ts` - Estrutura dos dados

## Contato

Para autorização de IP ou problemas com a API, contatar o administrador da ConLicitação.

---

**Importante**: Este projeto está preparado para funcionar com dados reais da API ConLicitação quando o IP estiver autorizado. A estrutura e mapeamento foram testados com dados de desenvolvimento que seguem exatamente o formato da API real.