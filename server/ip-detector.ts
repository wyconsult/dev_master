import fetch from 'node-fetch';

export async function getCurrentExternalIP(): Promise<string> {
  const services = [
    'https://api.ipify.org',
    'https://ifconfig.me/ip',
    'https://ipinfo.io/ip'
  ];

  for (const service of services) {
    try {
      const response = await fetch(service, { timeout: 5000 });
      const ip = (await response.text()).trim();
      
      // Validar se é um IP válido
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        return ip;
      }
    } catch (error) {
      console.log(`Falha ao obter IP de ${service}`);
    }
  }
  
  throw new Error('Não foi possível detectar o IP externo');
}

export async function logCurrentIP(): Promise<void> {
  try {
    const currentIP = await getCurrentExternalIP();
    // IPs autorizados na ConLicitação API
    const authorizedIPs = [
      '104.196.156.252', // IP de desenvolvimento (Replit - antigo)
      '35.227.80.200',   // IP de desenvolvimento (Replit - atual)
      '31.97.26.138'     // IP do servidor de produção
    ];
    
    console.log(`🌐 IP externo atual: ${currentIP}`);
    console.log(`✅ IPs autorizados na ConLicitação: ${authorizedIPs.join(', ')}`);
    
    if (authorizedIPs.includes(currentIP)) {
      console.log(`✅ IP atual está autorizado - API deve funcionar`);
    } else {
      console.log(`⚠️ IP atual (${currentIP}) não está na lista de IPs autorizados`);
      console.log(`💡 Para acesso completo aos dados, execute em ambiente com IP autorizado:`);
      console.log(`   - Desenvolvimento: ${authorizedIPs[0]}`);
      console.log(`   - Produção: ${authorizedIPs[1]}`);
    }
  } catch (error) {
    console.log('❌ Não foi possível detectar o IP externo automaticamente');
  }
}