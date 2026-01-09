
import { db } from './server/db';
import { biddings } from './shared/schema';
import { eq } from 'drizzle-orm';
import { conLicitacaoAPI } from './server/conlicitacao-api';
import { syncService } from './server/sync-service';

function expandTruncatedStatus(status: string): string {
    const truncatedMappings: Record<string, string> = {
      "EM_ANAL": "EM ANÁLISE",
      "PRORROG": "PRORROGADA",
      "ALTERA": "ALTERADA",
      "ALTER": "ALTERADA",
      "FINALI": "FINALIZADA",
      "SUSP": "SUSPENSA",
      "CANCEL": "CANCELADA",
      "DESERTA": "DESERTA",
      "FRACAS": "FRACASSADA"
    };

    const upperStatus = status.toString().toUpperCase().trim();
    
    if (truncatedMappings[upperStatus]) {
      return truncatedMappings[upperStatus];
    }
    
    for (const [truncated, full] of Object.entries(truncatedMappings)) {
      if (truncated.startsWith(upperStatus) || upperStatus.startsWith(truncated)) {
        return full;
      }
    }
    
    return upperStatus;
}

async function forceUpdateBidding(conlicitacaoId: number, targetBoletimId: number) {
  console.log(`\n🛠️ Forçando atualização da Licitação ID: ${conlicitacaoId}`);
  console.log(`   Usando Boletim Alvo: ${targetBoletimId}\n`);

  try {
    // 1. Buscar dados frescos da API usando o boletim mais recente
    console.log(`1. Buscando dados do Boletim ${targetBoletimId} na API...`);
    const boletimData = await conLicitacaoAPI.getLicitacoesFromBoletim(targetBoletimId);
    
    // Tentar encontrar na lista de licitações
    let biddingData = boletimData.licitacoes.find((l: any) => Number(l.id) === conlicitacaoId);
    
    // Se não achar, tentar na lista de acompanhamentos
    if (!biddingData) {
        const acomp = boletimData.acompanhamentos.find((a: any) => 
            (a.licitacao_id && Number(a.licitacao_id) === conlicitacaoId) || 
            (a.conlicitacao_id && Number(a.conlicitacao_id) === conlicitacaoId)
        );
        if (acomp) {
            console.log("   ⚠️ Encontrado como ACOMPANHAMENTO (pode ter dados limitados)");
            biddingData = acomp;
            // Normalizar ID se necessário
            if (!biddingData.id && biddingData.licitacao_id) biddingData.id = biddingData.licitacao_id;
            if (!biddingData.id && biddingData.conlicitacao_id) biddingData.id = biddingData.conlicitacao_id;
        }
    }

    if (!biddingData) {
        console.log(`❌ ERRO: Licitação ${conlicitacaoId} não encontrada dentro do Boletim ${targetBoletimId}.`);
        console.log("   Verifique se o ID do Boletim está correto.");
        process.exit(1);
    }

    console.log("✅ Dados encontrados na API!");
    console.log(`   Situação: ${biddingData.situacao}`);
    console.log(`   Data Abertura: ${biddingData.datahora_abertura}`);

    // 2. Usar o SyncService para processar e atualizar o banco
    // Precisamos simular a estrutura que o SyncService espera (lista de licitações)
    console.log("\n2. Enviando para o SyncService processar...");
    
    // O SyncService.syncBoletim espera processar um boletim inteiro, mas aqui vamos tentar atualizar apenas este registro
    // Vamos usar uma abordagem direta de update via Drizzle para ser cirúrgico
    
    // Preparar objeto de update
    // Expandir status truncado (ex: "ALTER" -> "ALTERADA")
  const situacaoOriginal = biddingData.situacao || 'NOVA';
  const situacaoExpandida = expandTruncatedStatus(situacaoOriginal);

  // Fallback de data inteligente
  const dataFinal = biddingData.datahora_abertura || biddingData.datahora_documento || biddingData.datahora_prazo || null;

  const updateData: any = {
    boletim_id: targetBoletimId,
    situacao: situacaoExpandida,
    objeto: (biddingData.objeto || 'Não informado').substring(0, 1000),
    datahora_abertura: dataFinal,
    updated_at: new Date(),
    synced_at: new Date()
  };

    // Campos opcionais
    if (biddingData.orgao) {
        updateData.orgao_nome = biddingData.orgao.nome;
        updateData.orgao_cidade = biddingData.orgao.cidade;
        updateData.orgao_uf = biddingData.orgao.uf;
    }

    // Executar Update
    const result = await db.update(biddings)
        .set(updateData)
        .where(eq(biddings.conlicitacao_id, conlicitacaoId));

    console.log(`✅ Banco de Dados Atualizado com Sucesso!`);
    
    // 3. Verificar resultado
    const updated = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, conlicitacaoId));
    console.log("\n--- Resultado Final no DB ---");
    console.log(`Boletim ID: ${updated[0].boletim_id}`);
    console.log(`Situação: ${updated[0].situacao}`);
    console.log(`Data Abertura: ${updated[0].datahora_abertura}`);

  } catch (error) {
    console.error("❌ Erro fatal:", error);
  }
  process.exit(0);
}

const id = parseInt(process.argv[2]);
const boletimId = parseInt(process.argv[3]);

if (!id || !boletimId) {
  console.log('Uso: npx tsx force_update_bidding.ts <ID_LICITACAO> <ID_BOLETIM_NOVO>');
  process.exit(1);
}

forceUpdateBidding(id, boletimId);
