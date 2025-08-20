#!/usr/bin/env node
// Script para diagnosticar problemas na produção
const https = require('https');

console.log('🔍 DIAGNÓSTICO DE PRODUÇÃO - LicitaTraker');
console.log('==========================================');

// 1. Verificar IP atual
function getExternalIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

// 2. Testar API ConLicitação
function testConLicitacaoAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'consultaonline.conlicitacao.com.br',
      port: 443,
      path: '/api/filtros',
      method: 'GET',
      headers: {
        'X-AUTH-TOKEN': '27a24a9a-44ce-4de8-a8ac-82cc58ca9f6e',
        'Content-Type': 'application/json',
        'User-Agent': 'LicitaTraker/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function runDiagnostic() {
  try {
    // IP atual
    console.log('1. Verificando IP externo...');
    const currentIP = await getExternalIP();
    console.log(`   IP atual: ${currentIP}`);
    
    const authorizedIPs = ['35.227.80.200', '31.97.26.138', '104.196.156.252'];
    const isAuthorized = authorizedIPs.includes(currentIP);
    console.log(`   Status: ${isAuthorized ? '✅ AUTORIZADO' : '❌ NÃO AUTORIZADO'}`);
    
    if (!isAuthorized) {
      console.log(`   IPs autorizados: ${authorizedIPs.join(', ')}`);
    }

    // Teste API
    console.log('\n2. Testando API ConLicitação...');
    const apiResponse = await testConLicitacaoAPI();
    console.log(`   Status HTTP: ${apiResponse.statusCode}`);
    
    if (apiResponse.statusCode === 200) {
      console.log('   ✅ API funcionando corretamente');
      try {
        const data = JSON.parse(apiResponse.data);
        if (data.filtros && data.filtros.length > 0) {
          console.log(`   📊 ${data.filtros.length} filtros encontrados`);
        }
      } catch (e) {
        console.log('   ⚠️ Resposta não é JSON válido');
      }
    } else {
      console.log('   ❌ API com problemas');
      console.log(`   Resposta: ${apiResponse.data.substring(0, 200)}...`);
    }

  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }

  console.log('\n==========================================');
  console.log('📋 RESUMO:');
  console.log('- Se IP não autorizado: Contactar ConLicitação para adicionar');
  console.log('- Se API com erro: Verificar token ou configuração');
  console.log('- Se tudo OK: Limpar cache do browser mobile');
  console.log('==========================================');
}

runDiagnostic();