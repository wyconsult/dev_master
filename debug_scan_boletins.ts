
import { conLicitacaoAPI } from './server/conlicitacao-api';

async function scanBoletins(conlicitacaoId: number) {
  console.log(`\n🔍 Varrendo últimos boletins em busca da Licitação ID: ${conlicitacaoId}...\n`);

  try {
    // 1. Obter filtros do cliente para saber onde procurar
    const filtrosData = await conLicitacaoAPI.getFiltros();
    if (!filtrosData.filtros || filtrosData.filtros.length === 0) {
        console.log("❌ Nenhum filtro encontrado na conta.");
        return;
    }

    console.log(`Encontrados ${filtrosData.filtros.length} filtros. Verificando boletins recentes de cada um...`);

    let found = false;

    for (const filtro of filtrosData.filtros) {
        console.log(`\n📂 Filtro: ${filtro.descricao} (ID: ${filtro.id})`);
        
        // Pegar últimos 50 boletins de cada filtro (Aumentado para achar atualizações perdidas)
        const boletinsResp = await conLicitacaoAPI.getBoletins(filtro.id, 1, 50);
        
        if (!boletinsResp.boletins) continue;

        for (const boletim of boletinsResp.boletins) {
            // console.log(`   📄 Verificando Boletim ${boletim.id} (${boletim.datahora_fechamento})...`);
            
            // Buscar detalhes do boletim
            const dadosBoletim = await conLicitacaoAPI.getLicitacoesFromBoletim(boletim.id);
            const licitacao = dadosBoletim.licitacoes.find((l: any) => Number(l.id) === conlicitacaoId);
            const acompanhamento = dadosBoletim.acompanhamentos.find((a: any) => 
                (a.licitacao_id && Number(a.licitacao_id) === conlicitacaoId) || 
                (a.conlicitacao_id && Number(a.conlicitacao_id) === conlicitacaoId)
            );

            if (licitacao) {
                console.log(`   ✅ ENCONTRADA como LICITAÇÃO no Boletim ${boletim.id}!`);
                console.log(`      Data Boletim: ${boletim.datahora_fechamento}`);
                console.log(`      Situação: ${licitacao.situacao}`);
                console.log(`      Data Abertura: ${licitacao.datahora_abertura}`);
                found = true;
            }

            if (acompanhamento) {
                console.log(`   ✅ ENCONTRADA como ACOMPANHAMENTO no Boletim ${boletim.id}!`);
                console.log(`      Data Boletim: ${boletim.datahora_fechamento}`);
                console.log(`      Sintese: ${acompanhamento.sintese}`);
                found = true;
            }
        }
    }

    if (!found) {
        console.log("\n❌ Licitação não encontrada nos boletins recentes verificados.");
    }

  } catch (error) {
    console.error("Erro fatal:", error);
  }
  process.exit(0);
}

const id = parseInt(process.argv[2]);
if (!id) {
  console.log('Uso: npx tsx debug_scan_boletins.ts <ID_LICITACAO>');
  process.exit(1);
}

scanBoletins(id);
