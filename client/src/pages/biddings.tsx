import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BiddingCard } from "@/components/bidding-card";
import { Filter, Search } from "lucide-react";
import { type Bidding } from "@shared/schema";
import { BiddingsFilters, type FiltersState } from "@/components/biddings-filters";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Biddings() {
  // Estado centralizado dos filtros
  const [filters, setFilters] = useState<FiltersState>({
    numeroControle: "",
    selectedOrgaos: [],
    selectedUFs: [],
    cidade: "",
    objeto: "",
    valorMinimo: "",
    valorMaximo: "",
    mostrarSemValor: false,
    dataInicio: "",
    dataFim: "",
    tipoData: "abertura"
  });

  // Paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Ao mudar de página, rola para o topo
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Query com paginação
  const { data: biddingsResp, isLoading, error, isFetching, refetch } = useQuery<{ biddings: Bidding[]; total: number; page: number; per_page: number; }>({
    queryKey: ["/api/biddings", filters, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.numeroControle) params.append('numero_controle', filters.numeroControle);
      if (filters.cidade) params.append('cidade', filters.cidade);
      
      // Enviar objeto apenas se tiver 3 ou mais caracteres (mantendo lógica anterior) ou se o usuário explicitamente buscar
      if (filters.objeto && filters.objeto.trim().length >= 3) params.append('objeto', filters.objeto);
      
      if (filters.valorMinimo) params.append('valor_min', filters.valorMinimo);
      if (filters.valorMaximo) params.append('valor_max', filters.valorMaximo);
      if (filters.mostrarSemValor) params.append('mostrar_sem_valor', 'true');
      
      if (filters.dataInicio) params.append('data_inicio', filters.dataInicio);
      if (filters.dataFim) params.append('data_fim', filters.dataFim);
      if (filters.tipoData) params.append('tipo_data', filters.tipoData);

      if (filters.selectedOrgaos.length) filters.selectedOrgaos.forEach(orgao => params.append('orgao', orgao));
      if (filters.selectedUFs.length) filters.selectedUFs.forEach(uf => params.append('uf', uf));
      
      params.append('page', String(page));
      params.append('per_page', String(perPage));
      
      const response = await fetch(`/api/biddings?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar licitações');
      return await response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: true,
    refetchInterval: false,
  });
  
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/biddings/refresh', { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao atualizar boletins');
      await refetch();
    } catch (e) {
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const allBiddings = (biddingsResp?.biddings ?? []) as Bidding[];
  const totalBiddings = biddingsResp?.total ?? allBiddings.length;
  const totalPages = Math.max(1, Math.ceil(totalBiddings / perPage));

  // Extrair órgãos únicos dos dados reais
  const uniqueOrgaos = Array.from(new Set(allBiddings.map(b => b.orgao_nome))).sort();

  // Filtro dinâmico em tempo real - SIMPLIFICADO (todos filtros tratados no servidor)
  const filteredBiddings = allBiddings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 md:mb-12 text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white mb-4 md:mb-6 shadow-lg">
            <Search className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-green-700 bg-clip-text text-transparent mb-2 md:mb-3">
            Licitações
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-1 md:mb-2">
            Busca Inteligente 🔍
          </p>
          <p className="text-sm md:text-base text-gray-500">
            Encontre e acompanhe processos licitatórios ({totalBiddings.toLocaleString()} total)
          </p>
        </div>

        <BiddingsFilters
          uniqueOrgaos={uniqueOrgaos}
          onFiltersChange={setFilters}
          isRefreshing={isRefreshing}
          isFetching={isFetching}
          onManualRefresh={handleManualRefresh}
        />

        {/* Results */}
        <div className="space-y-3 md:space-y-4 px-4">
          {error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-lg mb-4">
                Erro ao carregar licitações
              </div>
              <p className="text-gray-600">
                Tente recarregar a página ou entre em contato com o suporte.
              </p>
            </div>
          ) : (isLoading && !allBiddings.length) ? (
            <LoadingSpinner message="Carregando licitações..." size="lg" />
          ) : filteredBiddings.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-12 text-center">
                <Search className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Nenhuma licitação encontrada</h3>
                <p className="text-sm md:text-base text-gray-600">Não há licitações que correspondam aos seus critérios de pesquisa.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredBiddings.map((bidding) => (
                <BiddingCard key={bidding.id} bidding={bidding} showFavoriteIcon={true} />
              ))}
            </>
          )}

          {/* Pagination controls - moved to bottom */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Página {page} de {totalPages} — {totalBiddings} resultados</div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={perPage}
                onChange={(e) => { setPage(1); setPerPage(parseInt(e.target.value) || 50); }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
