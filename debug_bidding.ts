
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
  } else {
    const dbBidding = dbResult[0];
    console.log('✅ Encontrada no banco!');
    console.log('ID Interno:', dbBidding.id);
    console.log('Boletim ID:', dbBidding.boletim_id);
    console.log('Objeto:', dbBidding.objeto);
    console.log('Orgão:', dbBidding.orgao_nome);
    console.log('Data Abertura:', dbBidding.datahora_abertura);
    console.log('Situação (DB):', dbBidding.situacao);
    console.log('Link Edital:', dbBidding.link_edital);
    console.log('Synced At:', dbBidding.synced_at);

    // 2. Buscar na API (usando o boletim_id do banco)
    if (dbBidding.boletim_id) {
        console.log(`\n--- ☁️ API (Usando Boletim ID do Banco: ${dbBidding.boletim_id}) ---`);
        try {
            const boletimData = await conLicitacaoAPI.getBoletimData(dbBidding.boletim_id);
            const apiBiddings = boletimData.licitacoes || [];
            
            const apiBidding = apiBiddings.find((b: any) => Number(b.id) === conlicitacaoId);

            if (!apiBidding) {
              console.log(`❌ Licitação ${conlicitacaoId} NÃO encontrada dentro do Boletim ${dbBidding.boletim_id} na API.`);
            } else {
              console.log('✅ Encontrada na API!');
              console.log('ID:', apiBidding.id);
              console.log('Objeto:', apiBidding.objeto);
              console.log('Orgão:', apiBidding.orgao?.nome);
              console.log('Data Abertura:', apiBidding.datahora_abertura);
              console.log('Situação RAW (API):', apiBidding.situacao);
              
              // Verificar se expansão de status altera algo
              // Simulação da lógica do frontend/backend
              const expandStatus = (s: string) => {
                 const map: any = { "ALTERA": "ALTERADA", "PRORROG": "PRORROGADA" }; 
                 // ... (simplificado)
                 if (map[s]) return map[s];
                 return s;
              };
              // console.log('Situação Expandida (Simulada):', expandStatus(apiBidding.situacao));

              // 3. Comparação
              console.log('\n--- ⚖️ COMPARAÇÃO (DB vs API) ---');
              const compare = (label: string, dbVal: any, apiVal: any) => {
                const match = String(dbVal || '').trim() === String(apiVal || '').trim();
                console.log(`${label}: ${match ? '✅ Igual' : '❌ DIFERENTE'} (DB: "${dbVal}", API: "${apiVal}")`);
              };

              compare('Situação', dbBidding.situacao, apiBidding.situacao);
            }
        } catch (error) {
            console.error('Erro ao buscar na API:', error);
        }
    }
  }
  process.exit(0);
}

const id = parseInt(process.argv[2]);
if (!id) {
  console.log('Uso: npx tsx debug_bidding.ts <ID_LICITACAO>');
  process.exit(1);
}

debugBidding(id);
