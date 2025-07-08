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
    // IPs autorizados - adicione novos IPs conforme necessário para produção
    const authorizedIPs = [
      '189.89.90.102' // IP de desenvolvimento autorizado
      // Adicionar IP do servidor de produção quando autorizado
    ];
    
    console.log(`🌐 IP externo atual: ${currentIP}`);
    console.log(`✅ IPs autorizados na ConLicitação: ${authorizedIPs.join(', ')}`);
    
    if (authorizedIPs.includes(currentIP)) {
      console.log(`✅ IP atual está autorizado - API deve funcionar`);
    } else {
      console.log(`⚠️ IP atual (${currentIP}) não está na lista de IPs autorizados`);
      console.log(`💡 Para acesso completo aos dados:`);
      console.log(`   - Desenvolvimento: Execute no ambiente com IP ${authorizedIPs[0]}`);
      console.log(`   - Produção: Solicite autorização do IP do servidor de produção`);
    }
  } catch (error) {
    console.log('❌ Não foi possível detectar o IP externo automaticamente');
  }
}