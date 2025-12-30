import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiddingCard } from "@/components/bidding-card";
import { Filter, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { type Bidding } from "@shared/schema";



// Lista de UFs com nomes completos para evitar confusão
const UF_OPTIONS = [
  { code: "AC", name: "AC - Acre" },
  { code: "AL", name: "AL - Alagoas" },
  { code: "AP", name: "AP - Amapá" },
  { code: "AM", name: "AM - Amazonas" },
  { code: "BA", name: "BA - Bahia" },
  { code: "CE", name: "CE - Ceará" },
  { code: "DF", name: "DF - Distrito Federal" },
  { code: "ES", name: "ES - Espírito Santo" },
  { code: "GO", name: "GO - Goiás" },
  { code: "MA", name: "MA - Maranhão" },
  { code: "MT", name: "MT - Mato Grosso" },
  { code: "MS", name: "MS - Mato Grosso do Sul" },
  { code: "MG", name: "MG - Minas Gerais" },
  { code: "PA", name: "PA - Pará" },
  { code: "PB", name: "PB - Paraíba" },
  { code: "PR", name: "PR - Paraná" },
  { code: "PE", name: "PE - Pernambuco" },
  { code: "PI", name: "PI - Piauí" },
  { code: "RJ", name: "RJ - Rio de Janeiro" },
  { code: "RN", name: "RN - Rio Grande do Norte" },
  { code: "RS", name: "RS - Rio Grande do Sul" },
  { code: "RO", name: "RO - Rondônia" },
  { code: "RR", name: "RR - Roraima" },
  { code: "SC", name: "SC - Santa Catarina" },
  { code: "SP", name: "SP - São Paulo" },
  { code: "SE", name: "SE - Sergipe" },
  { code: "TO", name: "TO - Tocantins" }
];

export default function Biddings() {
  // Estados existentes
  const [numeroControle, setNumeroControle] = useState(""); // Input do usuário
  const [numeroControlePesquisado, setNumeroControlePesquisado] = useState(""); // Valor efetivamente pesquisado
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);

  // Novos estados para filtros adicionais
  const [cidade, setCidade] = useState("");
  const [objeto, setObjeto] = useState("");
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");
  const [mostrarSemValor, setMostrarSemValor] = useState(false);

  // Estados para filtros de data
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoData, setTipoData] = useState<"abertura" | "documento">(
    "abertura"
  );

  // Estado para controlar expansão dos filtros avançados
  const [filtrosAvancadosExpandidos, setFiltrosAvancadosExpandidos] = useState(false);

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
  }, [cidade, numeroControlePesquisado, selectedOrgaos, selectedUFs]);

  const buildFilters = () => {
    const filters: any = {};
    if (numeroControlePesquisado) filters.numero_controle = numeroControlePesquisado;
    if (selectedOrgaos.length > 0) filters.orgao = selectedOrgaos;
    if (selectedUFs.length > 0) filters.uf = selectedUFs;
    return filters;
  };

  // Função para executar pesquisa por número de controle
  const executarPesquisa = () => {
    setNumeroControlePesquisado(numeroControle);
  };

  // Query com paginação
  const { data: biddingsResp, isLoading, error, isFetching, refetch } = useQuery<{ biddings: Bidding[]; total: number; page: number; per_page: number; }>({
    queryKey: ["/api/biddings", numeroControlePesquisado, selectedOrgaos, selectedUFs, cidade, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (numeroControlePesquisado) params.append('numero_controle', numeroControlePesquisado);
      if (cidade) params.append('cidade', cidade);
      if (selectedOrgaos.length) selectedOrgaos.forEach(orgao => params.append('orgao', orgao));
      if (selectedUFs.length) selectedUFs.forEach(uf => params.append('uf', uf));
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

  // Função para converter valor string para número
  const parseValor = (valor: string): number => {
    if (!valor) return 0;
    // Remove caracteres não numéricos exceto vírgulas e pontos
    const cleanValue = valor.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(cleanValue) || 0;
  };

  // Função para verificar se data está no range
  const isDateInRange = (
    dateString: string,
    inicio: string,
    fim: string
  ): boolean => {
    if (!dateString || (!inicio && !fim)) return true;

    const date = new Date(dateString);
    const startDate = inicio ? new Date(inicio) : null;
    const endDate = fim ? new Date(fim) : null;

    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;

    return true;
  };

  // Filtro dinâmico em tempo real - SIMPLIFICADO (todos filtros tratados no servidor)
  const filteredBiddings = allBiddings;

  const toggleOrgao = (orgao: string) => {
    setSelectedOrgaos(prev => 
      prev.includes(orgao) 
        ? prev.filter(o => o !== orgao)
        : [...prev, orgao]
    );
  };

  const toggleUF = (uf: string) => {
    setSelectedUFs(prev => 
      prev.includes(uf) 
        ? prev.filter(u => u !== uf)
        : [...prev, uf]
    );
  };

  const clearFilters = () => {
    setNumeroControle("");
    setNumeroControlePesquisado(""); // Limpar também o valor pesquisado
    setSelectedOrgaos([]);
    setSelectedUFs([]);
    setCidade("");
    setObjeto("");
    setValorMinimo("");
    setValorMaximo("");
    setMostrarSemValor(false);
    setDataInicio("");
    setDataFim("");
  };

  const toggleTipoData = () => {
    setTipoData((prev) => (prev === "abertura" ? "documento" : "abertura"));
  };

  const toggleFiltrosAvancados = () => {
    setFiltrosAvancadosExpandidos(!filtrosAvancadosExpandidos);
  };

  if (isLoading && !allBiddings.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando licitações...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">
              Erro ao carregar licitações
            </div>
            <p className="text-gray-600">
              Tente recarregar a página ou entre em contato com o suporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Filtros Principais - Sempre Visíveis */}
        <Card className="mb-4 border-0 shadow-xl bg-white/80 backdrop-blur-sm mx-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Filter className="h-4 w-4 md:h-5 md:w-5" />
              Filtros Principais
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 space-y-4">
            {/* Filtros principais em grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Número de Controle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° Controle
                </label>
                <Input
                  placeholder="Ex. 13157470"
                  value={numeroControle}
                  onChange={(e) => setNumeroControle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      executarPesquisa();
                    }
                  }}
                  className="border-gray-300 text-gray-700 placeholder:text-gray-400 h-10"
                />
              </div>

              {/* Filtrar Órgão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar Órgão
                </label>
                <Popover open={orgaoPopoverOpen} onOpenChange={setOrgaoPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between border-gray-300 text-gray-700 h-10"
                    >
                      {selectedOrgaos.length === 0
                        ? "Selecione órgão(s)"
                        : `${selectedOrgaos.length} órgão(s)`
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 z-50 bg-white border border-gray-200 shadow-lg">
                    <Command>
                      <CommandInput placeholder="Buscar órgão..." />
                      <CommandEmpty>Nenhum órgão encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {uniqueOrgaos.map((orgao) => (
                          <CommandItem
                            key={orgao}
                            onSelect={() => toggleOrgao(orgao)}
                            className="flex items-center gap-2"
                          >
                            <Checkbox 
                              checked={selectedOrgaos.includes(orgao)}
                              onChange={() => toggleOrgao(orgao)}
                            />
                            <span className="flex-1 text-sm">{orgao}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade
                </label>
                <Input
                  placeholder="Ex. São Paulo"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="border-gray-300 text-gray-700 placeholder:text-gray-400 h-10"
                />
              </div>

              {/* Estado (UF) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado (UF)
                </label>
                <Popover open={ufPopoverOpen} onOpenChange={setUfPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between border-gray-300 text-gray-700 h-10"
                    >
                      {selectedUFs.length === 0
                        ? "Selecione UF(s)"
                        : selectedUFs.join(", ")
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 z-50 bg-white border border-gray-200 shadow-lg">
                    <Command>
                      <CommandInput placeholder="Buscar UF..." />
                      <CommandEmpty>Nenhuma UF encontrada.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {UF_OPTIONS.map((uf) => (
                          <CommandItem
                            key={uf.code}
                            onSelect={() => toggleUF(uf.code)}
                            className="flex items-center gap-2"
                          >
                            <Checkbox 
                              checked={selectedUFs.includes(uf.code)}
                              onChange={() => toggleUF(uf.code)}
                            />
                            <span>{uf.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tags de filtros selecionados */}
            <div className="space-y-2">
              {selectedOrgaos.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedOrgaos.map((orgao) => (
                    <Badge key={orgao} variant="secondary" className="text-xs">
                      {orgao.length > 30 ? `${orgao.substring(0, 30)}...` : orgao}
                      <button
                        onClick={() => toggleOrgao(orgao)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {selectedUFs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedUFs.map((uf) => (
                    <Badge key={uf} variant="secondary" className="text-xs">
                      {UF_OPTIONS.find(opt => opt.code === uf)?.name || uf}
                      <button
                        onClick={() => toggleUF(uf)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg"
                onClick={executarPesquisa}
              >
                <Search className="mr-2 h-4 w-4" />
                Pesquisar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleManualRefresh} 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isRefreshing || isFetching}
              >
                {isRefreshing ? 'Atualizando...' : 'Atualizar boletins'}
              </Button>
              {(numeroControle || selectedOrgaos.length > 0 || selectedUFs.length > 0 || cidade || objeto || valorMinimo || valorMaximo || mostrarSemValor || dataInicio || dataFim) && (
                <Button variant="outline" onClick={clearFilters} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros Avançados - Expansível Compacto */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm mx-4">
          <CardHeader className="pb-2 py-3">
            <button
              onClick={toggleFiltrosAvancados}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Opções Avançadas de Filtros
              </CardTitle>
              {filtrosAvancadosExpandidos ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </CardHeader>
          {filtrosAvancadosExpandidos && (
            <CardContent className="px-3 md:px-6 py-4 space-y-3">
              {/* Filtro de objeto */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Objeto da Licitação
                </label>
                <Input
                  placeholder="Ex. Aquisição de equipamentos (mín. 3 caracteres)"
                  value={objeto}
                  onChange={(e) => setObjeto(e.target.value)}
                  className="border-gray-300 text-gray-700 placeholder:text-gray-400 h-9 text-sm"
                />
              </div>

              {/* Filtros de valor */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-700">Filtros de Valor</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valor Mínimo (R$)
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex. 1000"
                      value={valorMinimo}
                      onChange={(e) => setValorMinimo(e.target.value)}
                      className="border-gray-300 text-gray-700 placeholder:text-gray-400 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valor Máximo (R$)
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex. 50000"
                      value={valorMaximo}
                      onChange={(e) => setValorMaximo(e.target.value)}
                      className="border-gray-300 text-gray-700 placeholder:text-gray-400 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mostrarSemValor"
                    checked={mostrarSemValor}
                    onCheckedChange={(checked) => setMostrarSemValor(checked === true)}
                  />
                  <label
                    htmlFor="mostrarSemValor"
                    className="text-xs font-medium text-gray-700"
                  >
                    Mostrar apenas licitações sem valor informado
                  </label>
                </div>
              </div>

              {/* Filtros de data */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-700">Filtros de Data</h4>
                
                {/* Seletor do tipo de data */}
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-600">Filtrar por:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="abertura"
                      name="tipoData"
                      checked={tipoData === "abertura"}
                      onChange={() => setTipoData("abertura")}
                      className="text-green-600 w-3 h-3"
                    />
                    <label htmlFor="abertura" className="text-xs text-gray-700">
                      Data de Abertura
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="documento"
                      name="tipoData"
                      checked={tipoData === "documento"}
                      onChange={() => setTipoData("documento")}
                      className="text-green-600 w-3 h-3"
                    />
                    <label htmlFor="documento" className="text-xs text-gray-700">
                      Data do Documento
                    </label>
                  </div>
                </div>

                {/* Campos de data */}
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Data Início
                    </label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="border-gray-300 text-gray-700 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Data Fim
                    </label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="border-gray-300 text-gray-700 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Results */}
        <div className="space-y-3 md:space-y-4 px-4">
          {filteredBiddings.length === 0 ? (
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
