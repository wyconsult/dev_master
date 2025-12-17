
import { conLicitacaoStorage } from '../server/conlicitacao-storage';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function verify() {
  console.log('🚀 Iniciando verificação da migração...');

  try {
    // 1. Verificar conexão DB
    console.log('1. Testando conexão com banco de dados...');
    const result = await db.execute(sql`SELECT 1`);
    console.log('✅ Conexão OK:', result ? 'Success' : 'Fail');

    // 2. Verificar Debug Info
    console.log('\n2. Buscando Debug Info...');
    const debugInfo = await conLicitacaoStorage.getDataSourcesDebugInfo();
    console.log('📊 Debug Info:', debugInfo);

    // 3. Verificar Biddings (sem filtro)
    console.log('\n3. Buscando Biddings (primeiros 5)...');
    const biddings = await conLicitacaoStorage.getBiddingsPaginated({}, 1, 5);
    console.log(`📦 Encontrados ${biddings.biddings.length} biddings. Total: ${biddings.total}`);
    if (biddings.biddings.length > 0) {
      console.log('   Exemplo:', biddings.biddings[0].orgao_nome, '-', biddings.biddings[0].objeto?.substring(0, 50));
    }

    // 4. Verificar Biddings (com filtro UF)
    // Assumindo que temos dados. Se não, isso pode retornar vazio, mas não erro.
    const uf = 'SP';
    console.log(`\n4. Buscando Biddings com filtro UF=${uf}...`);
    const biddingsUf = await conLicitacaoStorage.getBiddingsPaginated({ uf: [uf] }, 1, 5);
    console.log(`📦 Encontrados ${biddingsUf.biddings.length} biddings em ${uf}.`);
    
    // 5. Verificar Sync Manual (Simulado)
    console.log('\n5. Testando Sync Manual...');
    const syncResult = await conLicitacaoStorage.manualRefreshBoletins();
    console.log('✅ Sync iniciado:', syncResult);

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  } finally {
    process.exit(0);
  }
}

verify();
