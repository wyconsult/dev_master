# Como executar no Windows

## Método mais simples

1. **Abra o PowerShell ou CMD na pasta do projeto**

2. **Execute este comando único:**
```cmd
npx tsx server/index.ts
```

3. **Acesse:** http://localhost:5000

## Se der erro de "tsx não encontrado"

Execute antes:
```cmd
npm install -g tsx
```

Depois:
```cmd
tsx server/index.ts
```

## Método alternativo

Se nada funcionar, execute:
```cmd
node -r esbuild-register server/index.ts
```

Ou instale o esbuild-register:
```cmd
npm install -g esbuild-register
```