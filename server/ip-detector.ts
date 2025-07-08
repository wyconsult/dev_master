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
    console.log(`🌐 IP externo atual: ${currentIP}`);
    console.log(`📋 Para autorizar na ConLicitação, forneça este IP: ${currentIP}`);
  } catch (error) {
    console.log('❌ Não foi possível detectar o IP externo automaticamente');
  }
}