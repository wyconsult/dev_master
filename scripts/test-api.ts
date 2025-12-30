
import { conLicitacaoAPI } from '../server/conlicitacao-api';

async function runTest() {
  console.log('🚀 Iniciando teste de diagnóstico da API ConLicitação...');

  try {
    // 1. Testar conexão e Filtros
    console.log('\n📡 Testando Filtros...');
    const filtros = await conLicitacaoAPI.getFiltros();
    console.log(`✅ Filtros encontrados: ${filtros.filtros.length}`);
    
    if (filtros.filtros.length === 0) {
      console.error('❌ Nenhum filtro encontrado. Abortando teste.');
      return;
    }

    const filtroId = filtros.filtros[0].id;
    console.log(`ℹ️ Usando Filtro ID: ${filtroId} (${filtros.filtros[0].descricao})`);

    // 2. Testar Limite de Paginação (Request de 180 itens)
    console.log('\n🧪 Teste 1: Requisitando 180 boletins de uma vez...');
    try {
      const responseLarge = await conLicitacaoAPI.getBoletins(filtroId, 1, 180);
      const count = responseLarge.boletins?.length || 0;
      console.log(`📊 Resultado: Solicitado 180 -> Retornado ${count}`);
      
      if (count < 180) {
        console.warn('⚠️ ALERTA: A API retornou menos itens do que o solicitado. Isso indica um limite no servidor (Hard Limit).');
        console.warn('   -> A solução de paginação (loop) implementada no código principal resolverá isso.');
      } else {
        console.log('✅ A API aceitou a requisição grande sem cortes.');
      }
    } catch (e: any) {
      console.error('❌ Erro no Teste 1:', e.message);
    }

    // 3. Testar Paginação Padrão (Request de 50 itens)
    console.log('\n🧪 Teste 2: Requisitando página padrão de 50 itens...');
    try {
      const responseStandard = await conLicitacaoAPI.getBoletins(filtroId, 1, 50);
      const countStd = responseStandard.boletins?.length || 0;
      console.log(`📊 Resultado: Solicitado 50 -> Retornado ${countStd}`);
    } catch (e: any) {
      console.error('❌ Erro no Teste 2:', e.message);
    }

  } catch (error: any) {
    console.error('\n❌ Erro Geral de Conexão:', error.message);
    if (error.message === 'IP_NOT_AUTHORIZED') {
      console.error('🚫 IP Não Autorizado. Execute este teste no servidor de produção.');
    }
  }

  console.log('\n🏁 Teste finalizado.');
  process.exit(0);
}

runTest();
