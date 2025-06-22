import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiddingCard } from "@/components/bidding-card";
import { Filter, Search, X, Calendar as CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Bidding {
  id: number;
  orgao: string;
  codigo: string;
  cidade: string;
  uf: string;
  endereco: string;
  telefone: string;
  site: string;
  objeto: string;
  situacao: string;
  datahora_abertura: string;
  datahora_documento: string;
  datahora_retirada: string;
  datahora_visita: string;
  datahora_prazo: string;
  edital: string;
  link_edital: string;
  processo: string;
  observacao: string;
  item: string;
  preco_edital: string;
  valor_estimado: string;
  conlicitacao_id: number;
}

// Lista de órgãos únicos
const ORGAOS_OPTIONS = [
  "Empresa Maranhense de Serviços Hospitalares - EMSERH",
  "Secretaria Estadual de Saúde", 
  "Prefeitura Municipal de Mairiporã",
  "AGEPEN-Agência Estadual de Administracao do Sistema Penitenciário",
  "MINISTÉRIO DA EDUCAÇÃO - Universidade Federal de Viçosa",
  "NUCLEBRÁS-Nuclebrás Equipamentos Pesados S/A"
];

// Lista de UFs
const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", 
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", 
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Favorites() {
  const [numeroControle, setNumeroControle] = useState("");
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedDate) {
      params.append('date', format(selectedDate, 'yyyy-MM-dd'));
    }
    return params.toString();
  };

  const { data: favorites = [], isLoading } = useQuery<Bidding[]>({
    queryKey: ["/api/favorites", buildQueryParams()],
  });

  // Filter favorites based on form filters
  const filteredFavorites = favorites.filter(bidding => {
    const matchesNumeroControle = !numeroControle || 
      bidding.codigo?.toLowerCase().includes(numeroControle.toLowerCase()) ||
      bidding.processo?.toLowerCase().includes(numeroControle.toLowerCase());
    
    const matchesOrgao = selectedOrgaos.length === 0 || 
      selectedOrgaos.some(orgao => 
        bidding.orgao.toLowerCase().includes(orgao.toLowerCase())
      );
    
    const matchesUF = selectedUFs.length === 0 || 
      selectedUFs.includes(bidding.uf);

    return matchesNumeroControle && matchesOrgao && matchesUF;
  });

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
    setSelectedOrgaos([]);
    setSelectedUFs([]);
    setSelectedDate(undefined);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Favoritas</h1>
          <p className="text-gray-600">Suas licitações marcadas como favoritas</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Número de Controle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Controle
                </label>
                <div className="relative">
                  <Input
                    placeholder="Ex. 13157470"
                    value={numeroControle}
                    onChange={(e) => setNumeroControle(e.target.value)}
                  />
                </div>
              </div>

              {/* Filtrar Órgão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Órgão
                </label>
                <Popover open={orgaoPopoverOpen} onOpenChange={setOrgaoPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedOrgaos.length === 0
                        ? "Selecione um ou mais órgãos"
                        : `${selectedOrgaos.length} selecionado(s)`
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar órgão..." />
                      <CommandEmpty>Nenhum órgão encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {ORGAOS_OPTIONS.map((orgao) => (
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
                {selectedOrgaos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedOrgaos.map((orgao) => (
                      <Badge key={orgao} variant="secondary" className="text-xs">
                        {orgao.length > 20 ? `${orgao.substring(0, 20)}...` : orgao}
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
                      className="w-full justify-between"
                    >
                      {selectedUFs.length === 0
                        ? "Selecione um ou mais UFs"
                        : selectedUFs.join(", ")
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput placeholder="Buscar UF..." />
                      <CommandEmpty>Nenhuma UF encontrada.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {UF_OPTIONS.map((uf) => (
                          <CommandItem
                            key={uf}
                            onSelect={() => toggleUF(uf)}
                            className="flex items-center gap-2"
                          >
                            <Checkbox 
                              checked={selectedUFs.includes(uf)}
                              onChange={() => toggleUF(uf)}
                            />
                            <span>{uf}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedUFs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedUFs.map((uf) => (
                      <Badge key={uf} variant="secondary" className="text-xs">
                        {uf}
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

              {/* Selecionar data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar data
                </label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Escolha a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {format(selectedDate, "dd/MM/yyyy")}
                      <button
                        onClick={() => setSelectedDate(undefined)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                )}
              </div>

              {/* Search Button */}
              <div className="flex items-end gap-2">
                <Button className="flex-1" variant="default">
                  <Search className="mr-2 h-4 w-4" />
                  Pesquisar
                </Button>
                {(numeroControle || selectedOrgaos.length > 0 || selectedUFs.length > 0 || selectedDate) && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {filteredFavorites.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum favorito encontrado</h3>
                <p className="text-gray-600">
                  {favorites.length === 0 
                    ? "Você ainda não marcou nenhuma licitação como favorita."
                    : "Não há favoritos que correspondam aos seus critérios de pesquisa."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFavorites.map((bidding) => (
              <BiddingCard key={bidding.id} bidding={bidding} showFavoriteIcon={true} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}