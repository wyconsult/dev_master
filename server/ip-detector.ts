import fetch from 'node-fetch';

export async function getCurrentExternalIP(): Promise<string> {
  const services = [
    'https://api.ipify.org',
    'https://ifconfig.me/ip',
    'https://ipinfo.io/ip'
  ];

  for (const service of services) {
    try {
      const response = await fetch(service);
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
  // Logs removed as per user request
}