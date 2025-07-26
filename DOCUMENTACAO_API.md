# Documentação da API ConLicitação

## Overview
O LicitaTraker integra com a API oficial do ConLicitação para fornecer dados reais de licitações e boletins.

## Autenticação
- **Token**: `27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e`
- **Header**: `x-auth-token`
- **Base URL**: `https://consultaonline.conlicitacao.com.br/api`

## IPs Autorizados
- **Desenvolvimento**: 35.227.80.200 (Replit)  
- **Produção**: 31.97.26.138

## Endpoints Principais

### 1. Filtros
`GET /api/filtros`
- Retorna lista de filtros disponíveis para o cliente
- Estrutura: `{ id, descricao, cliente }`

### 2. Boletins
`GET /api/filtro/{filtroId}/boletins?page=1&per_page=10`
- Retorna boletins paginados para um filtro específico
- Estrutura: Headers com `id`, `datahora_fechamento`, `quantidade_licitacoes`, `quantidade_acompanhamentos`

### 3. Detalhes do Boletim
`GET /api/boletim/{id}`
- Retorna detalhes completos do boletim com licitações e acompanhamentos
- Estrutura completa com todas as entidades

## Estrutura de Dados

### Licitações
- `id`: Número ConLicitação
- `orgao`: { nome, codigo, cidade, uf, endereco, telefone, site }
- `objeto`: Descrição do objeto
- `situacao`: Status da licitação
- `datahora_abertura`: Data/hora de abertura
- `edital`: Código do certame
- `documento[]`: Array de documentos com URLs
- `processo`: Número do processo
- `valor_estimado`: Valor estimado

### Acompanhamentos
- `id`: Identificador único
- `licitacao_id`: Referência à licitação original
- `orgao`: Dados do órgão
- `objeto`: Objeto/escopo
- `sintese`: Explicação do resultado
- `data_fonte`: Data da divulgação
- `edital`: Código do certame
- `processo`: Número do processo

## Mapeamento para o Sistema

### Campos Utilizados
- `orgao_nome` ← `orgao.nome`
- `orgao_cidade` ← `orgao.cidade`
- `orgao_uf` ← `orgao.uf`
- `conlicitacao_id` ← `id`
- `documento_url` ← `documento[0].url`
- `datahora_abertura` ← `datahora_abertura`

### Situações Mapeadas
- `NOVA` → Badge verde
- `ABERTA` → Badge azul  
- `URGENTE` → Badge vermelho
- `PRORROGADA` → Badge laranja
- `ALTERADA` → Badge roxo
- `FINALIZADA` → Badge cinza

## Configuração do Sistema

### Desenvolvimento
- IP: 35.227.80.200
- Fallback: Dados de desenvolvimento quando IP não autorizado
- Logs: Exibe status de autorização IP

### Produção
- IP: 31.97.26.138
- Apenas dados reais da API
- Tratamento de erro gracioso quando indisponível

## Integração Atual

### Backend (`server/conlicitacao-api.ts`)
- Cliente HTTP para API ConLicitação
- Tratamento de erros e timeouts
- Cache de dados para performance

### Storage (`server/conlicitacao-storage.ts`)  
- Interface híbrida API + dados locais
- Favoritos e usuários mantidos localmente
- Licitações e boletins da API real

### Frontend
- Queries TanStack para cache inteligente
- Estados de loading e erro
- Atualização automática de dados