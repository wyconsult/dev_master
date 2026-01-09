import { syncService } from './server/sync-service';

async function run() {
  console.log('🚀 Iniciando Sincronização Completa (Full Sync)...');
  console.log('Isso irá percorrer TODOS os filtros e TODOS os boletins para garantir que os dados estejam atualizados.');
  console.log('A nova lógica de correção de status ("ALTERADA") e datas será aplicada a todos os registros.');
  console.log('⏳ Isso pode levar alguns minutos dependendo da quantidade de dados. Por favor, aguarde...\n');

  try {
    const result = await syncService.fullSync();
    console.log('\n✅ Sincronização Finalizada com Sucesso!');
    console.log('----------------------------------------');
    console.log(`Filtros Sincronizados: ${result.filtrosSynced}`);
    console.log(`Boletins Sincronizados: ${result.boletinsSynced}`);
    console.log(`Licitações Atualizadas/Inseridas: ${result.biddingsSynced}`);
    console.log(`Acompanhamentos Sincronizados: ${result.acompanhamentosSynced}`);
    console.log(`Duração: ${(result.duration / 1000).toFixed(2)} segundos`);
    console.log('----------------------------------------');
    
    if (result.error) {
        console.error('⚠️ Houve um erro parcial:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Erro crítico durante a sincronização:', error);
  }
  process.exit(0);
}

run();