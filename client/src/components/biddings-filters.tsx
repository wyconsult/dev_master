import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";

export const UF_OPTIONS = [
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

export interface FiltersState {
  numeroControle: string;
  selectedOrgaos: string[];
  selectedUFs: string[];
  cidade: string;
  objeto: string;
  valorMinimo: string;
  valorMaximo: string;
  mostrarSemValor: boolean;
  dataInicio: string;
  dataFim: string;
  tipoData: "abertura" | "documento";
}

interface BiddingsFiltersProps {
  uniqueOrgaos: string[];
  onFiltersChange: (filters: FiltersState) => void;
  isRefreshing: boolean;
  isFetching: boolean;
  onManualRefresh: () => void;
}

export function BiddingsFilters({
  uniqueOrgaos,
  onFiltersChange,
  isRefreshing,
  isFetching,
  onManualRefresh
}: BiddingsFiltersProps) {
  // Estados locais
  const [numeroControle, setNumeroControle] = useState("");
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);
  
  const [cidade, setCidade] = useState("");
  const [objeto, setObjeto] = useState("");
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");
  const [mostrarSemValor, setMostrarSemValor] = useState(false);
  
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoData, setTipoData] = useState<"abertura" | "documento">("abertura");
  
  const [filtrosAvancadosExpandidos, setFiltrosAvancadosExpandidos] = useState(false);

  // Debounce apenas para campos de texto livre
  const debouncedCidade = useDebounce(cidade, 1000);
  const debouncedObjeto = useDebounce(objeto, 1000);
  const debouncedValorMinimo = useDebounce(valorMinimo, 1000);
  const debouncedValorMaximo = useDebounce(valorMaximo, 1000);
  const debouncedDataInicio = useDebounce(dataInicio, 1000);
  const debouncedDataFim = useDebounce(dataFim, 1000);

  // Estado para controlar quando disparar a busca por número de controle
  const [numeroControlePesquisado, setNumeroControlePesquisado] = useState("");

  const executarPesquisa = () => {
    setNumeroControlePesquisado(numeroControle);
  };

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
    setNumeroControlePesquisado("");
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

  const toggleFiltrosAvancados = () => {
    setFiltrosAvancadosExpandidos(!filtrosAvancadosExpandidos);
  };

  // Notificar o pai quando os filtros efetivos mudarem
  useEffect(() => {
    onFiltersChange({
      numeroControle: numeroControlePesquisado,
      selectedOrgaos,
      selectedUFs,
      cidade: debouncedCidade,
      objeto: debouncedObjeto,
      valorMinimo: debouncedValorMinimo,
      valorMaximo: debouncedValorMaximo,
      mostrarSemValor,
      dataInicio: debouncedDataInicio,
      dataFim: debouncedDataFim,
      tipoData
    });
  }, [
    numeroControlePesquisado,
    selectedOrgaos,
    selectedUFs,
    debouncedCidade,
    debouncedObjeto,
    debouncedValorMinimo,
    debouncedValorMaximo,
    mostrarSemValor,
    debouncedDataInicio,
    debouncedDataFim,
    tipoData
  ]);

  return (
    <>
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
              onClick={onManualRefresh} 
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
    </>
  );
}