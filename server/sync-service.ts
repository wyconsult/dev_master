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
    console.log('🔄 [SyncService] Inicializado');
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
    console.log('📥 [SyncService] Sincronizando filtros...');
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

      console.log(`✅ [SyncService] ${synced} filtros sincronizados`);
      return synced;
    } catch (error: any) {
      console.error('❌ [SyncService] Erro ao sincronizar filtros:', error.message);
      throw error;
    }
  }

  // Sincronizar boletins de um filtro
  async syncBoletins(filtroId: number, limit: number = 50): Promise<number> {
    console.log(`📥 [SyncService] Sincronizando boletins do filtro ${filtroId}...`);
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

      console.log(`✅ [SyncService] ${synced} boletins sincronizados para filtro ${filtroId}`);
      return synced;
    } catch (error: any) {
      console.error(`❌ [SyncService] Erro ao sincronizar boletins do filtro ${filtroId}:`, error.message);
      throw error;
    }
  }

  // Sincronizar licitações de um boletim
  async syncLicitacoesFromBoletim(boletimId: number): Promise<{ licitacoes: number; acompanhamentos: number }> {
    console.log(`📥 [SyncService] Sincronizando licitações do boletim ${boletimId}...`);
    try {
      const { licitacoes, acompanhamentos: acompanhamentosData } = await conLicitacaoAPI.getLicitacoesFromBoletim(boletimId);

      let licitacoesSynced = 0;
      for (const lic of licitacoes) {
        await db.insert(biddings).values({
          conlicitacao_id: lic.id,
          orgao_nome: lic.orgao?.nome || 'Não informado',
          orgao_codigo: lic.orgao?.codigo || null,
          orgao_cidade: lic.orgao?.cidade || 'Não informado',
          orgao_uf: lic.orgao?.uf || 'XX',
          orgao_endereco: lic.orgao?.endereco || null,
          orgao_telefone: lic.orgao?.telefone || null,
          orgao_site: lic.orgao?.site || null,
          objeto: (lic.objeto || 'Não informado').substring(0, 1000),
          situacao: lic.situacao || 'N/A',
          datahora_abertura: lic.datahora_abertura || null,
          datahora_documento: lic.datahora_documento || null,
          datahora_retirada: lic.datahora_retirada || null,
          datahora_visita: lic.datahora_visita || null,
          datahora_prazo: lic.datahora_prazo || null,
          edital: lic.edital || null,
          link_edital: lic.link_edital || null,
          documento_url: lic.documento_url || null,
          processo: lic.processo || null,
          observacao: lic.observacao?.substring(0, 1000) || null,
          item: lic.item?.substring(0, 500) || null,
          preco_edital: lic.preco_edital || null,
          valor_estimado: lic.valor_estimado || null,
          boletim_id: boletimId,
        }).onDuplicateKeyUpdate({
          set: {
            situacao: lic.situacao || 'N/A',
            datahora_abertura: lic.datahora_abertura || null,
            observacao: lic.observacao?.substring(0, 1000) || null,
          }
        });
        licitacoesSynced++;
      }

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

      console.log(`✅ [SyncService] Boletim ${boletimId}: ${licitacoesSynced} licitações, ${acompanhamentosSynced} acompanhamentos`);
      return { licitacoes: licitacoesSynced, acompanhamentos: acompanhamentosSynced };
    } catch (error: any) {
      console.error(`❌ [SyncService] Erro ao sincronizar boletim ${boletimId}:`, error.message);
      throw error;
    }
  }

  // Sincronização completa
  async fullSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ [SyncService] Sincronização já em andamento, ignorando...');
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
      console.log('🚀 [SyncService] Iniciando sincronização completa...');

      // 1. Sincronizar filtros
      result.filtrosSynced = await this.syncFiltros();

      // 2. Buscar todos os filtros do banco
      const allFiltros = await db.select().from(filtros);

      // 3. Para cada filtro, sincronizar boletins (últimos 50)
      for (const filtro of allFiltros) {
        const boletinsSynced = await this.syncBoletins(filtro.id, 50);
        result.boletinsSynced += boletinsSynced;

        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 4. Buscar TODOS os boletins e sincronizar licitações de cada um
      const allBoletins = await db.select().from(boletins).orderBy(desc(boletins.id));
      console.log(`📊 [SyncService] Sincronizando licitações de ${allBoletins.length} boletins...`);

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
      console.log(`✅ [SyncService] Sincronização completa finalizada em ${result.duration}ms`);
      console.log(`   📊 Resultados: ${result.filtrosSynced} filtros, ${result.boletinsSynced} boletins, ${result.biddingsSynced} licitações, ${result.acompanhamentosSynced} acompanhamentos`);

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
      console.log('🔄 [SyncService] Iniciando sincronização incremental...');

      // Buscar filtros existentes
      const allFiltros = await db.select().from(filtros);

      if (allFiltros.length === 0) {
        // Se não tem filtros, fazer sync full
        console.log('⚠️ [SyncService] Nenhum filtro encontrado, executando fullSync...');
        this.isSyncing = false;
        return this.fullSync();
      }

      // Sincronizar apenas os últimos 5 boletins de cada filtro
      for (const filtro of allFiltros) {
        const boletinsSynced = await this.syncBoletins(filtro.id, 5);
        result.boletinsSynced += boletinsSynced;
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Sincronizar licitações dos últimos 5 boletins
      const recentBoletins = await db.select().from(boletins).orderBy(desc(boletins.id)).limit(5);

      for (const boletim of recentBoletins) {
        const { licitacoes, acompanhamentos } = await this.syncLicitacoesFromBoletim(boletim.id);
        result.biddingsSynced += licitacoes;
        result.acompanhamentosSynced += acompanhamentos;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      await this.updateSyncLog(logId, 'success', result.biddingsSynced);
      console.log(`✅ [SyncService] Sincronização incremental finalizada em ${result.duration}ms`);

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

    console.log(`⏰ [SyncService] Auto-sync configurado para cada ${intervalMs / 1000 / 60} minutos`);

    // Executar sync inicial após 10 segundos
    setTimeout(() => {
      console.log('🚀 [SyncService] Executando sincronização inicial...');
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
      console.log('⏹️ [SyncService] Auto-sync parado');
    }
  }
}

// Instância única do serviço
export const syncService = new SyncService();

