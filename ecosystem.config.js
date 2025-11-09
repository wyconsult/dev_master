// Configuração PM2 para deploy em produção
module.exports = {
  apps: [{
    name: 'licitatraker',
    script: 'dist/index.js',
    cwd: '/caminho/para/sua/aplicacao',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Forçar resolução DNS priorizando IPv4 para chamadas externas
      NODE_OPTIONS: '--dns-result-order=ipv4first'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};