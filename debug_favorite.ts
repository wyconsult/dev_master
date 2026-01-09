
import { db } from './server/db';
import { favorites, biddings } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkFavorite(conlicitacaoId: number) {
  console.log(`\n🔍 Verificando Favoritos para Licitação ID: ${conlicitacaoId}\n`);

  // 1. Encontrar o ID interno da licitação
  const dbResult = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, conlicitacaoId));
  
  if (dbResult.length === 0) {
    console.log('❌ Licitação NÃO encontrada no banco de dados local.');
    process.exit(0);
  }

  const bidding = dbResult[0];
  console.log(`ID Interno: ${bidding.id}`);
  
  // 2. Buscar favoritos para este ID
  const favs = await db.select().from(favorites).where(eq(favorites.biddingId, bidding.id));
  
  if (favs.length === 0) {
    console.log('❌ Nenhum favorito encontrado para esta licitação.');
  } else {
    console.log(`✅ Encontrados ${favs.length} favoritos:`);
    favs.forEach(f => {
      console.log(`   - User ID: ${f.userId}`);
      console.log(`     Status Personalizado: ${f.status || '(null)'}`);
      console.log(`     Categoria: ${f.category}`);
      console.log(`     Criado em: ${f.createdAt}`);
    });
  }

  process.exit(0);
}

const id = parseInt(process.argv[2]);
if (!id) {
  console.log('Uso: npx tsx debug_favorite.ts <ID_LICITACAO>');
  process.exit(1);
}

checkFavorite(id);
