
import { db } from './server/db';
import { biddings, favorites } from './shared/schema';
import { eq } from 'drizzle-orm';
import { conLicitacaoAPI } from './server/conlicitacao-api';

async function debugBiddingFull(conlicitacaoId: number) {
  console.log(`\n🔍 Investigando Licitação ID: ${conlicitacaoId} (Análise Completa)\n`);

  // 1. Buscar no Banco de Dados (Biddings)
  console.log('--- 🏦 BANCO DE DADOS (Licitação Original) ---');
  const dbResult = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, conlicitacaoId));
  
  let dbBidding: any = null;
  if (dbResult.length === 0) {
    console.log('❌ Licitação NÃO encontrada na tabela "biddings".');
  } else {
    dbBidding = dbResult[0];
    console.log('✅ Encontrada na tabela "biddings"!');
    console.log('   ID Interno:', dbBidding.id);
    console.log('   Boletim ID (Origem):', dbBidding.boletim_id);
    console.log('   Situação:', dbBidding.situacao);
    console.log('   Data Abertura:', dbBidding.datahora_abertura);
    console.log('   Data Documento:', dbBidding.datahora_documento);
    console.log('   Data Retirada:', dbBidding.datahora_retirada);
    console.log('   Data Visita:', dbBidding.datahora_visita);
    console.log('   Data Prazo:', dbBidding.datahora_prazo);
    console.log('   Synced At:', dbBidding.synced_at);
  }

  // 2. Buscar no Banco de Dados (Favoritos)
  console.log('\n--- ⭐ FAVORITOS (Dados Salvos no Favorito) ---');
  const favResult = await db.select().from(favorites).where(eq(favorites.conlicitacao_id, conlicitacaoId)); // Corrigido para conlicitacao_id
  
  if (favResult.length === 0) {
      // Tentar buscar por bidding_id se dbBidding existir
      if (dbBidding) {
         const favById = await db.select().from(favorites).where(eq(favorites.biddingId, dbBidding.id));
         if (favById.length > 0) {
            console.log(`✅ Encontrado favorito via ID interno (${favById.length} registros)`);
            favById.forEach(f => {
                console.log(`   - User ${f.userId}: Status="${f.status}", Data Abertura="${f.datahora_abertura}"`);
            });
         } else {
             console.log('❌ Nenhum favorito encontrado.');
         }
      } else {
        console.log('❌ Nenhum favorito encontrado (busca por conlicitacao_id).');
      }
  } else {
    console.log(`✅ Encontrados ${favResult.length} favoritos vinculados ao ID da licitação:`);
    favResult.forEach(f => {
        console.log(`   - User ID: ${f.userId}`);
        console.log(`     Status Personalizado: ${f.status}`);
        console.log(`     Data Abertura (Salva no Favorito): ${f.datahora_abertura}`);
        console.log(`     Criado em: ${f.createdAt}`);
    });
  }

  // 3. Buscar na API (usando o boletim_id do banco se existir)
  if (dbBidding && dbBidding.boletim_id) {
    console.log(`\n--- ☁️ API (Boletim ${dbBidding.boletim_id}) ---`);
    try {
        const boletimData = await conLicitacaoAPI.getBoletimData(dbBidding.boletim_id);
        const apiBiddings = boletimData.licitacoes || [];
        const apiBidding = apiBiddings.find((b: any) => Number(b.id) === conlicitacaoId);

        if (apiBidding) {
            console.log('✅ Dados RAW da API (Boletim Armazenado):');
            console.log('   Situação:', apiBidding.situacao);
            console.log('   Data Abertura:', apiBidding.datahora_abertura);
            console.log('   Data Documento:', apiBidding.datahora_documento);
            console.log('   Data Entrega:', apiBidding.datahora_entrega); // Possível campo extra
            console.log('   Data Disputa:', apiBidding.datahora_disputa); // Possível campo extra
        } else {
            console.log('❌ Licitação não encontrada neste boletim na API.');
        }
    } catch (e) {
        console.log('❌ Erro ao buscar boletim na API:', e);
    }
  }

  process.exit(0);
}

const id = parseInt(process.argv[2]);
if (!id) {
  console.log('Uso: npx tsx debug_bidding_full.ts <ID_LICITACAO>');
  process.exit(1);
}

debugBiddingFull(id);
