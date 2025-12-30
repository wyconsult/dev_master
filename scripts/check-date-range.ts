
import { conLicitacaoAPI } from '../server/conlicitacao-api';

async function checkDateRange() {
  console.log('📅 Verificando cobertura de datas dos boletins...');

  try {
    const filtros = await conLicitacaoAPI.getFiltros();
    if (filtros.filtros.length === 0) {
      console.error('❌ Nenhum filtro encontrado.');
      return;
    }
    const filtroId = filtros.filtros[0].id;
    console.log(`ℹ️ Filtro: ${filtroId}`);

    // Buscar 200 boletins (4 páginas de 50)
    let allBoletins: any[] = [];
    const MAX_PAGES = 4;
    
    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(`📄 Buscando página ${page}...`);
      const response = await conLicitacaoAPI.getBoletins(filtroId, page, 50);
      const boletins = response.boletins || [];
      if (boletins.length === 0) break;
      allBoletins = [...allBoletins, ...boletins];
    }

    if (allBoletins.length === 0) {
      console.log('⚠️ Nenhum boletim retornado.');
      return;
    }

    console.log(`\n📊 Total de Boletins Recuperados: ${allBoletins.length}`);
    
    const newest = allBoletins[0];
    const oldest = allBoletins[allBoletins.length - 1];

    console.log(`🆕 Mais recente: ID ${newest.id} | Data: ${newest.datahora_fechamento}`);
    console.log(`👴 Mais antigo: ID ${oldest.id} | Data: ${oldest.datahora_fechamento}`);

    // Verificar se atingiu Novembro
    const oldestDate = new Date(oldest.datahora_fechamento);
    const targetDate = new Date('2025-11-01'); // Novembro de 2025 (assumindo ano atual do sistema)

    if (oldestDate > targetDate) {
      console.warn('\n⚠️ ALERTA: A carga de 200 boletins NÃO chegou em 1º de Novembro.');
      console.warn('   Isso explica por que os dados de Novembro não aparecem.');
      console.warn('   Precisamos aumentar o limite de carga.');
      
      // Estimar quantos precisamos
      // Diferença em dias
      const diffTime = new Date(newest.datahora_fechamento).getTime() - oldestDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      const boletinsPerDay = allBoletins.length / (diffDays || 1);
      
      console.log(`\n📉 Média estimada: ${boletinsPerDay.toFixed(2)} boletins por dia.`);
      
      const daysToNov = (new Date(newest.datahora_fechamento).getTime() - targetDate.getTime()) / (1000 * 3600 * 24);
      const estimatedNeeded = Math.ceil(daysToNov * boletinsPerDay);
      
      console.log(`🔮 Estimativa: Precisamos carregar aprox. ${estimatedNeeded} boletins para chegar em 1º de Novembro.`);
    } else {
      console.log('\n✅ A carga cobriu o mês de Novembro.');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
  process.exit(0);
}

checkDateRange();
