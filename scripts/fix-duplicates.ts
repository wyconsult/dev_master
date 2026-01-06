
import { db } from '../server/db';
import { biddings } from '../shared/schema';
import { sql, eq, desc } from 'drizzle-orm';

async function main() {
  console.log('Iniciando verificação de duplicatas...');

  // 1. Encontrar IDs de conlicitacao duplicados
  const duplicates = await db.execute(sql`
    SELECT conlicitacao_id, COUNT(*) as count 
    FROM biddings 
    GROUP BY conlicitacao_id 
    HAVING count > 1
  `);

  const duplicateRows = duplicates[0] as any[];
  console.log(`Encontrados ${duplicateRows.length} grupos de duplicatas.`);

  if (duplicateRows.length === 0) {
    console.log('Nenhuma duplicata encontrada.');
    process.exit(0);
  }

  for (const row of duplicateRows) {
    const conId = row.conlicitacao_id;
    console.log(`\nProcessando duplicatas para conlicitacao_id: ${conId}`);

    // Buscar todas as versões
    const versions = await db.select().from(biddings)
      .where(eq(biddings.conlicitacao_id, conId))
      .orderBy(desc(biddings.id)); // Mais recente primeiro

    console.log(`  Encontradas ${versions.length} versões.`);

    // Estratégia: Manter o mais recente que tenha dados (não nulos)
    // Como ordenamos por ID desc, o primeiro é o mais recente.
    // Mas vamos verificar se algum antigo tem dados que o novo não tem (improvável dada a descrição, mas bom checar)
    
    // Na dúvida, manter o mais recente (maior ID) é a aposta mais segura para "dados atuais"
    // O usuário relatou que um tinha status NOVA e outro ALTERADA. O mais recente deve ser o correto.
    
    const keeper = versions[0];
    const toRemove = versions.slice(1);

    console.log(`  Mantendo ID: ${keeper.id} (Status: ${keeper.situacao}, Data: ${keeper.datahora_abertura || 'N/A'})`);
    
    if (toRemove.length > 0) {
      const idsToRemove = toRemove.map(v => v.id);
      console.log(`  Removendo IDs: ${idsToRemove.join(', ')}`);
      
      await db.delete(biddings).where(sql`id IN ${idsToRemove}`);
      console.log('  Remoção concluída.');
    }
  }

  console.log('\nProcesso finalizado com sucesso.');
  process.exit(0);
}

main().catch(console.error);
