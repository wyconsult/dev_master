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
import { type Bidding } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";



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

export default function Favorites() {
  const { user } = useAuth();
  const [numeroControle, setNumeroControle] = useState("");
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{from?: Date, to?: Date}>({});
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    // Only apply date filters if both from and to are selected
    if (dateRange.from && dateRange.to) {
      params.append('dateFrom', format(dateRange.from, 'yyyy-MM-dd'));
      params.append('dateTo', format(dateRange.to, 'yyyy-MM-dd'));
    }
    return params.toString();
  };

  const { data: favorites = [], isLoading } = useQuery<Bidding[]>({
    queryKey: [`/api/favorites/${user?.id}`, buildQueryParams()],
    enabled: !!user,
  });

  // Extrair órgãos únicos dos favoritos
  const uniqueOrgaos = Array.from(new Set(favorites.map(b => b.orgao_nome))).sort();

  // Filter favorites based on form filters
  const filteredFavorites = favorites.filter(bidding => {
    const matchesNumeroControle = !numeroControle || 
      bidding.conlicitacao_id?.toString().includes(numeroControle);
    
    const matchesOrgao = selectedOrgaos.length === 0 || 
      selectedOrgaos.includes(bidding.orgao_nome);
    
    const matchesUF = selectedUFs.length === 0 || 
      selectedUFs.includes(bidding.orgao_uf);

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
    setDateRange({});
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white mb-6 shadow-lg">
            <Heart className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-red-700 bg-clip-text text-transparent mb-3">
            Favoritas
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Suas Preferidas ❤️
          </p>
          <p className="text-gray-500">
            Suas licitações marcadas como favoritas
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
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
                        : selectedUFs.map(uf => UF_OPTIONS.find(opt => opt.code === uf)?.code || uf).join(", ")
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
                {selectedUFs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
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

              {/* Selecionar período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar período
                </label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                        ) : (
                          format(dateRange.from, "dd/MM/yy")
                        )
                      ) : (
                        "Escolha o período"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                      onSelect={(range) => {
                        if (range) {
                          setDateRange({ from: range.from, to: range.to });
                        } else {
                          setDateRange({});
                        }
                      }}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {(dateRange.from && dateRange.to) && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {`${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`}
                      <button
                        onClick={() => setDateRange({})}
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
                {(numeroControle || selectedOrgaos.length > 0 || selectedUFs.length > 0 || (dateRange.from && dateRange.to)) && (
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