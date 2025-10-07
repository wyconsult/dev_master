# Configuração Local - LicitaTraker

## Instruções para Execução Local

### 1. Dependências Necessárias
Certifique-se de ter instalado:
- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**

### 2. Instalação dos Pacotes
Execute o comando para instalar todas as dependências:
```bash
npm install
```

### 3. Configuração de Tipos TypeScript
O projeto já inclui todas as configurações necessárias para TypeScript:
- `env.d.ts` - Definições de tipos para Vite e Node.js
- `tsconfig.json` - Configuração otimizada para desenvolvimento local
- `@types/node` já está incluído no package.json

### 4. Execução Local
Para executar o projeto localmente:
```bash
npm run dev
```

O aplicativo estará disponível em: `http://localhost:5000`

### 5. Problemas Comuns e Soluções

#### Erro "Cannot find type definition file for 'node'"
**Solução**: Os tipos já estão configurados no `env.d.ts`. Se o problema persistir:
```bash
npm install --save-dev @types/node@latest
```

#### Erro "Cannot find type definition file for 'vite/client'"
**Solução**: O arquivo `env.d.ts` já inclui as referências necessárias do Vite.

#### Problemas de Cache TypeScript
Se houver problemas de cache:
```bash
# Limpar cache TypeScript
rm -rf node_modules/.cache
rm -rf .tsbuildinfo

# Reinstalar dependências
npm install
```

### 6. Estrutura de Arquivos
```
projeto/
├── client/src/          # Frontend React
├── server/              # Backend Node.js/Express
├── shared/              # Tipos compartilhados
├── env.d.ts            # Definições de tipos
├── tsconfig.json       # Configuração TypeScript
└── package.json        # Dependências
```

### 7. IP Autorizado para API ConLicitação
O projeto está configurado para funcionar com IP autorizado na API ConLicitação:
- **Desenvolvimento**: 35.227.80.200 (Replit)
- **Produção**: 31.97.26.138

Para executar localmente com dados reais, seu IP precisa estar autorizado na API ConLicitação.

### 8. Comandos Disponíveis
```bash
npm run dev     # Execução em desenvolvimento
npm run build   # Build para produção
npm run start   # Execução em produção
npm run check   # Verificação de tipos TypeScript
```

## Suporte
Se encontrar outros problemas, verifique:
1. Versão do Node.js (18+)
2. Cache do npm limpo
3. Dependências instaladas corretamente