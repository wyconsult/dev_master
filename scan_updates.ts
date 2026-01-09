
import { db } from './server/db';
import { biddings, filtros, boletins } from './shared/schema';
import { conLicitacaoAPI } from './server/conlicitacao-api';
import { eq, desc, inArray, sql } from 'drizzle-orm';

// IDs problemáticos informados pelo usuário
const TARGET_IDS = [18514809, 18513996];

// Mapeamento de status truncados
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
    "FRACAS": "FRACASSADA",
    "ADJUDIC": "ADJUDICADA",
    "HOMOLOG": "HOMOLOGADA",
    "REVOG": "REVOGADA",
    "ANUL": "ANULADA"
  };
  return truncatedMappings[status] || status;
}

// Helper para converter data DD/MM/YYYY para objeto Date
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return null;
}

async function scanUpdates() {
  console.log('🚀 Iniciando busca profunda por atualizações na API...');
  console.log(`🎯 Alvos: ${TARGET_IDS.join(', ')}`);

  try {
    // 1. Obter filtros ativos
    const filters = await db.select().from(filtros);
    if (filters.length === 0) {
      console.log('⚠️ Nenhum filtro encontrado no banco. Tentando buscar da API...');
      const apiFilters = await conLicitacaoAPI.getFiltros();
      // Não vamos salvar agora, apenas usar os IDs
      filters.push(...apiFilters.filtros);
    }
    console.log(`📋 Filtros a verificar: ${filters.length}`);

    let foundCount = 0;

    // 2. Para cada filtro, varrer boletins RECENTES (últimos 100)
    for (const filtro of filters) {
      console.log(`\n🔎 Verificando filtro ID: ${filtro.id} (${filtro.descricao || 'Sem descrição'})`);
      
      // Buscar lista de boletins (últimos 100 para ter certeza)
      const boletinsResponse = await conLicitacaoAPI.getBoletins(filtro.id, 1, 100);
      const boletinsList = boletinsResponse.boletins || [];
      console.log(`   📦 Encontrados ${boletinsList.length} boletins recentes.`);

      // 3. Iterar sobre boletins
      for (const bol of boletinsList) {
        // Otimização: Se já achamos todos, podemos parar? Não, pois pode haver atualizações mais recentes.
        // Mas para debug, vamos olhar todos os recentes.

        try {
          // Buscar dados do boletim
          // console.log(`      📄 Lendo boletim ${bol.id}...`); // Verbose demais
          const bolData = await conLicitacaoAPI.getBoletimData(bol.id);
          const licitacoes = bolData.licitacoes || [];

          // 4. Procurar os IDs alvo neste boletim
          const matches = licitacoes.filter((l: any) => TARGET_IDS.includes(l.id));

          if (matches.length > 0) {
            console.log(`\n✨ ENCONTRADO(S) no Boletim ${bol.id} (Data: ${bol.datahora_fechamento})!`);
            
            for (const match of matches) {
              console.log(`   🆔 ID: ${match.id}`);
              console.log(`      Status na API: ${match.situacao}`);
              console.log(`      Data Abertura API: ${match.datahora_abertura}`);
              
              // Verificar se precisa atualizar no banco
              const expandedStatus = expandTruncatedStatus(match.situacao);
              
              // Atualizar no banco
              await db.insert(biddings).values({
                conlicitacao_id: match.id,
                orgao_nome: match.orgao_nome || 'Desconhecido',
                orgao_codigo: match.orgao_codigo,
                orgao_cidade: match.orgao_cidade || 'Desconhecido',
                orgao_uf: match.orgao_uf || 'XX',
                orgao_endereco: match.orgao_endereco,
                orgao_telefone: match.orgao_telefone,
                orgao_site: match.orgao_site,
                objeto: match.objeto || 'Sem objeto',
                situacao: expandedStatus,
                datahora_abertura: match.datahora_abertura,
                datahora_documento: match.datahora_documento,
                datahora_retirada: match.datahora_retirada,
                datahora_visita: match.datahora_visita,
                datahora_prazo: match.datahora_prazo,
                edital: match.edital,
                link_edital: match.link_edital,
                documento_url: match.documento_url,
                processo: match.processo,
                observacao: match.observacao,
                item: match.item,
                preco_edital: match.preco_edital ? match.preco_edital.toString() : null,
                valor_estimado: match.valor_estimado ? match.valor_estimado.toString() : null,
                boletim_id: bol.id,
                synced_at: new Date(),
                updated_at: new Date()
              }).onDuplicateKeyUpdate({
                set: {
                  situacao: expandedStatus,
                  datahora_abertura: match.datahora_abertura,
                  boletim_id: bol.id,
                  synced_at: new Date(),
                  updated_at: new Date(),
                  // Atualizar outros campos importantes se mudaram
                  objeto: match.objeto,
                  link_edital: match.link_edital
                }
              });

              console.log(`      ✅ Banco de dados atualizado para ID ${match.id}`);
              foundCount++;
            }
          }
        } catch (err) {
          // Ignorar erros de boletim individual
          // console.error(`Erro ao ler boletim ${bol.id}:`, err);
        }
      }
    }

    if (foundCount === 0) {
      console.log('\n❌ Nenhuma atualização encontrada nos últimos 100 boletins.');
      console.log('Isso indica que ou os IDs não estão nesses boletins ou a API não retornou dados para eles.');
    } else {
      console.log(`\n✅ Processo finalizado. ${foundCount} atualizações processadas.`);
    }

  } catch (error) {
    console.error('❌ Erro fatal no script:', error);
  } finally {
    process.exit(0);
  }
}

scanUpdates();
