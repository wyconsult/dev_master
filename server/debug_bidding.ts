import { conLicitacaoAPI } from './conlicitacao-api.js';
import { syncService } from './sync-service.js';
import { db } from './db.js';
import { biddings } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const biddingId = 18517141;
  const boletimId = 135352375;

  console.log(`\n=== Debugging Bidding ${biddingId} ===\n`);

  // 1. Check DB
  console.log('--- Database State ---');
  const dbRecords = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, biddingId));
  if (dbRecords.length === 0) {
    console.log('Record NOT FOUND in database.');
  } else {
    const record = dbRecords[0];
    console.log(`ID: ${record.id}`);
    console.log(`Link Edital: ${record.link_edital}`);
    console.log(`Synced At: ${record.synced_at}`);
    console.log(`Updated At: ${record.updated_at}`);
    console.log(`Prazo: ${record.datahora_prazo}`);
  }

  // 2. Check API
  console.log('\n--- API State ---');
  try {
    console.log(`Fetching bulletin ${boletimId}...`);
    const boletimData = await conLicitacaoAPI.getBoletimData(boletimId);
    
    if (!boletimData.licitacoes) {
      console.log('API returned no biddings for this bulletin.');
    } else {
      const apiRecord = boletimData.licitacoes.find((b: any) => b.id === biddingId);
      if (!apiRecord) {
        console.log('Bidding NOT FOUND in API bulletin response.');
      } else {
        console.log('Bidding FOUND in API.');
        console.log(`Link Edital: ${apiRecord.link_edital}`);
        console.log(`Prazo: ${apiRecord.datahora_prazo}`);
        
        // 3. Compare and Sync
        console.log('\n--- Comparison & Sync Test ---');
        let needsSync = true;
        if (dbRecords.length > 0) {
            const dbLink = dbRecords[0].link_edital;
            const apiLink = apiRecord.link_edital;
            if (dbLink !== apiLink) {
                console.log('MISMATCH DETECTED: Link Edital differs.');
                console.log('DB:', dbLink);
                console.log('API:', apiLink);
            } else {
                console.log('Link Edital matches.');
                // Force sync anyway to test
            }
        }

        console.log('Attempting manual sync via SyncService...');
        // Note: syncLicitacoesData signature is (licitacoes: any[], boletimId: number)
        const result = await syncService.syncLicitacoesData([apiRecord], boletimId);
        console.log(`SyncService returned: ${result}`);

        // 4. Verify DB again
        console.log('\n--- Database State After Sync ---');
        const afterRecords = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, biddingId));
        if (afterRecords.length > 0) {
            const record = afterRecords[0];
            console.log(`Link Edital: ${record.link_edital}`);
            console.log(`Synced At: ${record.synced_at}`);
            console.log(`Updated At: ${record.updated_at}`);
            
            if (record.link_edital === apiRecord.link_edital) {
                console.log('SUCCESS: Database updated successfully.');
            } else {
                console.log('FAILURE: Database NOT updated.');
            }
        }
      }
    }
  } catch (error) {
    console.error('API Error:', error);
  }
  
  process.exit(0);
}

main();
