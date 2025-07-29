/// <reference types="vite/client" />

// Tipagem do Vite para variáveis de ambiente
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  // adicione mais variáveis conforme necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Tipagem para Node.js
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      DATABASE_URL?: string
      PORT?: string
      // adicione mais variáveis conforme necessário
    }
  }
}

export {}