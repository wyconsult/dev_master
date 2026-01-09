
import { db } from './server/db';
import { biddings } from './shared/schema';
import { eq } from 'drizzle-orm';
import { conLicitacaoAPI } from './server/conlicitacao-api';

async function debugBidding(conlicitacaoId: number) {
  console.log(`\n🔍 Investigando Licitação ID: ${conlicitacaoId}\n`);

  // 1. Buscar no Banco de Dados
  console.log('--- 🏦 BANCO DE DADOS ---');
  const dbResult = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, conlicitacaoId));
  
  if (dbResult.length === 0) {
    console.log('❌ Licitação NÃO encontrada no banco de dados local.');
    process.exit(0);
  }

  const dbBidding = dbResult[0];
  console.log('✅ Encontrada no banco!');
  console.log('ID Interno:', dbBidding.id);
  console.log('Boletim ID:', dbBidding.boletim_id);
  console.log('Objeto:', dbBidding.objeto);
  console.log('Orgão:', dbBidding.orgao_nome);
  console.log('Data Abertura:', dbBidding.datahora_abertura);
  console.log('Situação:', dbBidding.situacao);
  console.log('Link Edital:', dbBidding.link_edital);
  console.log('Synced At:', dbBidding.synced_at);

  // 2. Buscar na API (usando o boletim_id do banco)
  if (!dbBidding.boletim_id) {
    console.log('\n⚠️ Sem Boletim ID no banco, não é possível buscar na API.');
    process.exit(0);
  }

  console.log(`\n--- ☁️ API (Boletim ${dbBidding.boletim_id}) ---`);
  try {
    const boletimData = await conLicitacaoAPI.getBoletimData(dbBidding.boletim_id);
    const apiBiddings = boletimData.licitacoes || [];
    
    // Encontrar a licitação específica na lista do boletim
    // Nota: A API pode retornar o ID como string ou número
    const apiBidding = apiBiddings.find((b: any) => Number(b.id) === conlicitacaoId);

    if (!apiBidding) {
      console.log(`❌ Licitação ${conlicitacaoId} NÃO encontrada dentro do Boletim ${dbBidding.boletim_id} na API.`);
      console.log('IDs disponíveis no boletim:', apiBiddings.map((b: any) => b.id).slice(0, 10), '...');
    } else {
      console.log('✅ Encontrada na API!');
      console.log('ID:', apiBidding.id);
      console.log('Objeto:', apiBidding.objeto);
      console.log('Orgão:', apiBidding.orgao?.nome);
      console.log('Data Abertura:', apiBidding.datahora_abertura);
      console.log('Situação:', apiBidding.situacao);
      //console.log('Raw API Data:', JSON.stringify(apiBidding, null, 2));

      // 3. Comparação
      console.log('\n--- ⚖️ COMPARAÇÃO (DB vs API) ---');
      const compare = (label: string, dbVal: any, apiVal: any) => {
        const match = String(dbVal || '').trim() === String(apiVal || '').trim();
        console.log(`${label}: ${match ? '✅ Igual' : '❌ DIFERENTE'}`);
        if (!match) {
            console.log(`   DB : "${dbVal}"`);
            console.log(`   API: "${apiVal}"`);
        }
      };

      compare('Objeto', dbBidding.objeto, apiBidding.objeto);
      compare('Orgão', dbBidding.orgao_nome, apiBidding.orgao?.nome);
      compare('Situação', dbBidding.situacao, apiBidding.situacao);
      compare('Data Abertura', dbBidding.datahora_abertura, apiBidding.datahora_abertura);
    }

  } catch (error) {
    console.error('Erro ao buscar na API:', error);
  }

  process.exit(0);
}

// Executar
const id = parseInt(process.argv[2]);
if (!id) {
  console.log('Uso: npx tsx debug_bidding.ts <ID_LICITACAO>');
  process.exit(1);
}

debugBidding(id);
