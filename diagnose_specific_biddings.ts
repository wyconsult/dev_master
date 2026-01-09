
import { db } from './server/db';
import { biddings, boletins, filtros } from './shared/schema';
import { eq, inArray, desc } from 'drizzle-orm';
// import * as dotenv from 'dotenv';
// dotenv.config();

async function diagnose() {
  console.log('🔍 Diagnosticando licitações: 18514809 e 18513996');

  const targetIds = [18514809, 18513996];

  try {
    // 1. Buscar no banco de dados
    const results = await db.select().from(biddings).where(inArray(biddings.id, targetIds));

    console.log(`\n📊 Encontradas ${results.length} licitações no banco:`);
    
    for (const bid of results) {
      console.log('--------------------------------------------------');
      console.log(`ID: ${bid.id}`);
      console.log(`Órgão: ${bid.orgao_nome} (${bid.orgao_codigo})`);
      console.log(`Objeto: ${bid.objeto}`);
      console.log(`Status: ${bid.situacao}`);
      console.log(`Data Abertura: ${bid.data_abertura}`);
      console.log(`Boletim ID: ${bid.boletim_id}`);
      
      // Tentar buscar o boletim associado
      if (bid.boletim_id) {
        const [bol] = await db.select().from(boletins).where(eq(boletins.id, bid.boletim_id));
        if (bol) {
          console.log(`Boletim Data: ${bol.data_envio}`);
        } else {
          console.log(`Boletim ID ${bid.boletim_id} NÃO encontrado no banco.`);
        }
      }
    }

    if (results.length < targetIds.length) {
      const foundIds = results.map(r => r.id);
      const missingIds = targetIds.filter(id => !foundIds.includes(id));
      console.log(`\n⚠️ Licitações NÃO encontradas no banco: ${missingIds.join(', ')}`);
    }

    console.log('\n🏁 Diagnóstico concluído.');
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

diagnose();
