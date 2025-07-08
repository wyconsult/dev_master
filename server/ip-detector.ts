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
    const authorizedIP = '189.89.90.102';
    
    console.log(`🌐 IP externo atual: ${currentIP}`);
    console.log(`✅ IP autorizado na ConLicitação: ${authorizedIP}`);
    
    if (currentIP === authorizedIP) {
      console.log(`✅ IP atual coincide com o autorizado - API deve funcionar`);
    } else {
      console.log(`⚠️ IP atual (${currentIP}) diferente do autorizado (${authorizedIP})`);
      console.log(`💡 Execute a aplicação no ambiente com IP ${authorizedIP} para acesso completo`);
    }
  } catch (error) {
    console.log('❌ Não foi possível detectar o IP externo automaticamente');
  }
}