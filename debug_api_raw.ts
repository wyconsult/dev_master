
import { conLicitacaoAPI } from './server/conlicitacao-api';

async function debugApiRaw(conlicitacaoId: number, boletimId: number) {
  console.log(`\n🔍 Inspecionando JSON cru para Licitação ${conlicitacaoId} no Boletim ${boletimId}...\n`);

  try {
    const boletimData = await conLicitacaoAPI.getLicitacoesFromBoletim(boletimId);
    
    const licitacao = boletimData.licitacoes.find((l: any) => Number(l.id) === conlicitacaoId);
    
    if (licitacao) {
        console.log("✅ Objeto Licitação encontrado:");
        console.log(JSON.stringify(licitacao, null, 2));
    } else {
        console.log("❌ Não encontrado nas licitações.");
        // Tentar acompanhamentos
        const acomp = boletimData.acompanhamentos.find((a: any) => 
            (a.licitacao_id && Number(a.licitacao_id) === conlicitacaoId) || 
            (a.conlicitacao_id && Number(a.conlicitacao_id) === conlicitacaoId)
        );
        if (acomp) {
             console.log("✅ Objeto Acompanhamento encontrado:");
             console.log(JSON.stringify(acomp, null, 2));
        } else {
             console.log("❌ Não encontrado em lugar nenhum do boletim.");
        }
    }

  } catch (error) {
    console.error("Erro:", error);
  }
}

const id = parseInt(process.argv[2]);
const boletimId = parseInt(process.argv[3]);

if (!id || !boletimId) {
  console.log('Uso: npx tsx debug_api_raw.ts <ID_LICITACAO> <ID_BOLETIM>');
  process.exit(1);
}

debugApiRaw(id, boletimId);
