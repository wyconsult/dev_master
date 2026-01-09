import { db } from './db.js';
import { biddings, boletins, filtros, acompanhamentos } from '@shared/schema';
import { conLicitacaoAPI } from './conlicitacao-api.js';
import { eq, sql, desc } from 'drizzle-orm';

export interface SyncResult {
  success: boolean;
  syncType: 'full' | 'incremental' | 'manual';
  filtrosSynced: number;
  boletinsSynced: number;
  biddingsSynced: number;
  acompanhamentosSynced: number;
  duration: number;
  error?: string;
}

export class SyncService {
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncResult: SyncResult | null = null;
  private lastSyncTime: Date | null = null;

  constructor() {
  }

  // Retorna o status atual da sincronização
  getStatus(): {
    isSyncing: boolean;
    autoSyncEnabled: boolean;
    lastSyncTime: string | null;
    lastSyncResult: SyncResult | null;
  } {
    return {
      isSyncing: this.isSyncing,
      autoSyncEnabled: this.autoSyncTimer !== null,
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      lastSyncResult: this.lastSyncResult
    };
  }

  // Log de sincronização no banco
  private async logSync(syncType: string, status: 'running' | 'success' | 'failed', itemsSynced: number = 0, errorMessage?: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        INSERT INTO sync_log (sync_type, status, items_synced, error_message)
        VALUES (${syncType}, ${status}, ${itemsSynced}, ${errorMessage || null})
      `);
      return (result as any)[0].insertId;
    } catch (error) {
      console.error('❌ [SyncService] Erro ao registrar log:', error);
      return 0;
    }
  }

  private async updateSyncLog(id: number, status: 'success' | 'failed', itemsSynced: number, errorMessage?: string): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE sync_log 
        SET status = ${status}, completed_at = NOW(), items_synced = ${itemsSynced}, error_message = ${errorMessage || null}
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('❌ [SyncService] Erro ao atualizar log:', error);
    }
  }

  // Sincronizar filtros da API para o banco
  async syncFiltros(): Promise<number> {
    try {
      const response = await conLicitacaoAPI.getFiltros();
      const filtrosData = response.filtros || [];

      let synced = 0;
      for (const filtro of filtrosData) {
        await db.insert(filtros).values({
          id: filtro.id,
          descricao: filtro.descricao || 'Sem descrição',
          cliente_id: filtro.cliente?.id || null,
          cliente_razao_social: filtro.cliente?.razao_social || null,
          manha: filtro.manha ?? true,
          tarde: filtro.tarde ?? true,
          noite: filtro.noite ?? true,
        }).onDuplicateKeyUpdate({
          set: {
            descricao: filtro.descricao || 'Sem descrição',
            manha: filtro.manha ?? true,
            tarde: filtro.tarde ?? true,
            noite: filtro.noite ?? true,
          }
        });
        synced++;
      }

      return synced;
    } catch (error: any) {
      console.error('❌ [SyncService] Erro ao sincronizar filtros:', error.message);
      throw error;
    }
  }

  // Sincronizar boletins de um filtro
  async syncBoletins(filtroId: number, limit: number = 50): Promise<number> {
    try {
      const response = await conLicitacaoAPI.getBoletins(filtroId, 1, limit, 'desc');
      const boletinsData = response.boletins || [];

      let synced = 0;
      for (const boletim of boletinsData) {
        await db.insert(boletins).values({
          id: boletim.id,
          numero_edicao: boletim.numero_edicao,
          datahora_fechamento: boletim.datahora_fechamento,
          filtro_id: filtroId,
          quantidade_licitacoes: boletim.quantidade_licitacoes || 0,
          quantidade_acompanhamentos: boletim.quantidade_acompanhamentos || 0,
          visualizado: false,
        }).onDuplicateKeyUpdate({
          set: {
            quantidade_licitacoes: boletim.quantidade_licitacoes || 0,
            quantidade_acompanhamentos: boletim.quantidade_acompanhamentos || 0,
          }
        });
        synced++;
      }

      return synced;
    } catch (error: any) {
      console.error(`❌ [SyncService] Erro ao sincronizar boletins do filtro ${filtroId}:`, error.message);
      throw error;
    }
  }

  // Sincronizar licitações de um boletim
  async syncLicitacoesFromBoletim(boletimId: number): Promise<{ licitacoes: number; acompanhamentos: number }> {
    try {
      const { licitacoes, acompanhamentos: acompanhamentosData } = await conLicitacaoAPI.getLicitacoesFromBoletim(boletimId);

      const licitacoesSynced = await this.syncLicitacoesData(licitacoes, boletimId);

      // Sincronizar acompanhamentos
      let acompanhamentosSynced = 0;
      for (const acomp of acompanhamentosData) {
        await db.insert(acompanhamentos).values({
          conlicitacao_id: acomp.id,
          licitacao_id: acomp.licitacao_id || null,
          orgao_nome: acomp.orgao?.nome || 'Não informado',
          orgao_cidade: acomp.orgao?.cidade || null,
          orgao_uf: acomp.orgao?.uf || null,
          objeto: (acomp.objeto || 'Não informado').substring(0, 1000),
          sintese: acomp.sintese?.substring(0, 1000) || null,
          data_fonte: acomp.data_fonte || null,
          edital: acomp.edital || null,
          processo: acomp.processo || null,
          boletim_id: boletimId,
        }).onDuplicateKeyUpdate({
          set: {
            sintese: acomp.sintese?.substring(0, 1000) || null,
          }
        });
        acompanhamentosSynced++;
      }

      return { licitacoes: licitacoesSynced, acompanhamentos: acompanhamentosSynced };
    } catch (error: any) {
      console.error(`❌ [SyncService] Erro ao sincronizar boletim ${boletimId}:`, error.message);
      throw error;
    }
  }

  // Nova função para sincronizar dados já obtidos (evita dupla requisição)
  async syncLicitacoesData(licitacoes: any[], boletimId: number): Promise<number> {
    let licitacoesSynced = 0;
    try {
      for (const lic of licitacoes) {
        const normalizedId = Number(lic.id);

        // Processar link do edital (mesma lógica do storage)
        const documentoItem = lic.documento?.[0];
        let documentoUrl = '';
        if (documentoItem) {
          const baseUrl = 'https://consultaonline.conlicitacao.com.br';
          if (typeof documentoItem === 'string') {
            documentoUrl = documentoItem.startsWith('http') ? documentoItem : baseUrl + documentoItem;
          } else if (documentoItem.url) {
            documentoUrl = documentoItem.url.startsWith('http') ? documentoItem.url : baseUrl + documentoItem.url;
          }
        }
        // Fallback para link_edital ou documento_url se vierem direto
        const finalLinkEdital = documentoUrl || lic.link_edital || lic.documento_url || null;

        // Processar telefones
        const telefones = lic.orgao?.telefone?.map((tel: any) => 
          `${tel.ddd ? '(' + tel.ddd + ')' : ''} ${tel.numero}${tel.ramal ? ' ramal ' + tel.ramal : ''}`
        ).join(', ') || lic.orgao_telefone || null;

        // Verificar se já existe (para evitar duplicatas pois não temos unique key no conlicitacao_id)
        const existing = await db.select().from(biddings).where(eq(biddings.conlicitacao_id, normalizedId));
        
        if (existing.length > 0) {
          // Se houver duplicatas, manter a primeira e remover as outras
          const targetId = existing[0].id;
          
          // Remover duplicatas extras se existirem
          if (existing.length > 1) {
            const idsToRemove = existing.slice(1).map(e => e.id);
            await db.delete(biddings).where(sql`id IN ${idsToRemove}`);
            console.log(`[SyncService] Removidas ${idsToRemove.length} duplicatas para licitação ${normalizedId}`);
          }
          
          // Atualizar o registro existente
          await db.update(biddings).set({
            orgao_nome: lic.orgao?.nome || 'Não informado',
            orgao_codigo: lic.orgao?.codigo || null,
            orgao_cidade: lic.orgao?.cidade || 'Não informado',
            orgao_uf: lic.orgao?.uf || 'XX',
            orgao_endereco: lic.orgao?.endereco || null,
            orgao_telefone: telefones,
            orgao_site: lic.orgao?.site || null,
            objeto: (lic.objeto || 'Não informado').substring(0, 1000),
            situacao: lic.situacao || 'N/A',
            // Correção de Data: Fallback para datahora_documento se datahora_abertura estiver vazia
            datahora_abertura: lic.datahora_abertura || lic.datahora_documento || lic.datahora_prazo || null,
            datahora_documento: lic.datahora_documento || null,
            datahora_retirada: lic.datahora_retirada || null,
            datahora_visita: lic.datahora_visita || null,
            datahora_prazo: lic.datahora_prazo || null,
            edital: lic.edital || null,
            link_edital: finalLinkEdital,
            documento_url: finalLinkEdital,
            processo: lic.processo || null,
            observacao: lic.observacao?.substring(0, 1000) || null,
            item: lic.item?.substring(0, 500) || null,
            preco_edital: lic.preco_edital || null,
            valor_estimado: lic.valor_estimado || null,
            boletim_id: boletimId,
            updated_at: new Date(), // Garantir atualização do timestamp
            synced_at: new Date(),
          }).where(eq(biddings.id, targetId));
          
        } else {
          // Inserir novo
          await db.insert(biddings).values({
            conlicitacao_id: normalizedId,
            orgao_nome: lic.orgao?.nome || 'Não informado',
            orgao_codigo: lic.orgao?.codigo || null,
            orgao_cidade: lic.orgao?.cidade || 'Não informado',
            orgao_uf: lic.orgao?.uf || 'XX',
            orgao_endereco: lic.orgao?.endereco || null,
            orgao_telefone: telefones,
            orgao_site: lic.orgao?.site || null,
            objeto: (lic.objeto || 'Não informado').substring(0, 1000),
            situacao: lic.situacao || 'N/A',
            // Correção de Data: Fallback para datahora_documento se datahora_abertura estiver vazia
            datahora_abertura: lic.datahora_abertura || lic.datahora_documento || lic.datahora_prazo || null,
            datahora_documento: lic.datahora_documento || null,
            datahora_retirada: lic.datahora_retirada || null,
            datahora_visita: lic.datahora_visita || null,
            datahora_prazo: lic.datahora_prazo || null,
            edital: lic.edital || null,
            link_edital: finalLinkEdital,
            documento_url: finalLinkEdital,
            processo: lic.processo || null,
            observacao: lic.observacao?.substring(0, 1000) || null,
            item: lic.item?.substring(0, 500) || null,
            preco_edital: lic.preco_edital || null,
            valor_estimado: lic.valor_estimado || null,
            boletim_id: boletimId,
            synced_at: new Date(),
            updated_at: new Date(),
          });
        }
        licitacoesSynced++;
      }
      return licitacoesSynced;
    } catch (error: any) {
      console.error(`❌ [SyncService] Erro ao sincronizar dados de licitações:`, error.message);
      throw error;
    }
  }

  // Sincronização completa
  async fullSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncType: 'full',
        filtrosSynced: 0,
        boletinsSynced: 0,
        biddingsSynced: 0,
        acompanhamentosSynced: 0,
        duration: 0,
        error: 'Sincronização já em andamento'
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const logId = await this.logSync('full', 'running');

    let result: SyncResult = {
      success: false,
      syncType: 'full',
      filtrosSynced: 0,
      boletinsSynced: 0,
      biddingsSynced: 0,
      acompanhamentosSynced: 0,
      duration: 0,
    };

    try {
      // 1. Sincronizar filtros
      result.filtrosSynced = await this.syncFiltros();

      // 2. Buscar todos os filtros do banco
      const allFiltros = await db.select().from(filtros);

      // 3. Para cada filtro, sincronizar TODOS os boletins (sem limite prático)
      for (const filtro of allFiltros) {
        const boletinsSynced = await this.syncBoletins(filtro.id, 1000); // Sem limite prático
        result.boletinsSynced += boletinsSynced;

        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 4. Buscar TODOS os boletins e sincronizar licitações de cada um
      const allBoletins = await db.select().from(boletins).orderBy(desc(boletins.id));

      for (const boletim of allBoletins) {
        const { licitacoes, acompanhamentos } = await this.syncLicitacoesFromBoletim(boletim.id);
        result.biddingsSynced += licitacoes;
        result.acompanhamentosSynced += acompanhamentos;

        // Pequena pausa para não sobrecarregar a API (reduzido para acelerar sync)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      await this.updateSyncLog(logId, 'success', result.biddingsSynced + result.boletinsSynced);

    } catch (error: any) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      await this.updateSyncLog(logId, 'failed', 0, error.message);
      console.error('❌ [SyncService] Erro na sincronização completa:', error.message);
    } finally {
      this.isSyncing = false;
      this.lastSyncResult = result;
      this.lastSyncTime = new Date();
    }

    return result;
  }

  // Sincronização incremental (apenas boletins novos)
  async incrementalSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncType: 'incremental',
        filtrosSynced: 0,
        boletinsSynced: 0,
        biddingsSynced: 0,
        acompanhamentosSynced: 0,
        duration: 0,
        error: 'Sincronização já em andamento'
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const logId = await this.logSync('incremental', 'running');

    let result: SyncResult = {
      success: false,
      syncType: 'incremental',
      filtrosSynced: 0,
      boletinsSynced: 0,
      biddingsSynced: 0,
      acompanhamentosSynced: 0,
      duration: 0,
    };

    try {
      // Buscar filtros existentes
      const allFiltros = await db.select().from(filtros);

      if (allFiltros.length === 0) {
        // Se não tem filtros, fazer sync full
        this.isSyncing = false;
        return this.fullSync();
      }

      // Sincronizar os últimos 50 boletins de cada filtro para garantir que nada foi perdido
      for (const filtro of allFiltros) {
        const boletinsSynced = await this.syncBoletins(filtro.id, 50);
        result.boletinsSynced += boletinsSynced;
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Sincronizar licitações de TODOS os boletins recentes (últimos 7 dias)
      // Isso garante que mesmo se houver muitos boletins, todos serão processados
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Converter para string no formato que o banco espera (se necessário) ou usar filtro de data
      // Como datahora_fechamento é varchar, vamos pegar os últimos 100 IDs para garantir
      const recentBoletins = await db.select()
        .from(boletins)
        .orderBy(desc(boletins.id))
        .limit(100); // Aumentado de 5 para 100 para cobrir todas as atualizações da semana

      console.log(`[SyncService] Iniciando processamento de ${recentBoletins.length} boletins recentes...`);

      for (const boletim of recentBoletins) {
        // Otimização: Se o boletim é muito antigo (mais de 1 mês), pular
        // Mas como pegamos por ID desc, já são os novos.
        
        const { licitacoes, acompanhamentos } = await this.syncLicitacoesFromBoletim(boletim.id);
        result.biddingsSynced += licitacoes;
        result.acompanhamentosSynced += acompanhamentos;
        
        // Pausa menor para processar mais rápido
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      await this.updateSyncLog(logId, 'success', result.biddingsSynced);

    } catch (error: any) {
      result.error = error.message;
      result.duration = Date.now() - startTime;
      await this.updateSyncLog(logId, 'failed', 0, error.message);
      console.error('❌ [SyncService] Erro na sincronização incremental:', error.message);
    } finally {
      this.isSyncing = false;
      this.lastSyncResult = result;
      this.lastSyncTime = new Date();
    }

    return result;
  }

  // Iniciar sincronização automática
  startAutoSync(intervalMs: number = 5 * 60 * 1000): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    // Executar sync inicial após 10 segundos
    setTimeout(() => {
      this.fullSync().catch(err => console.error('Erro no sync inicial:', err));
    }, 10000);

    // Configurar sync periódico
    this.autoSyncTimer = setInterval(() => {
      this.incrementalSync().catch(err => console.error('Erro no sync periódico:', err));
    }, intervalMs);
  }

  // Parar sincronização automática
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }
}

// Instância única do serviço
export const syncService = new SyncService();

