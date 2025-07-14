import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiddingCard } from "@/components/bidding-card";
import {
  Filter,
  Search,
  X,
  Calendar as CalendarIcon,
  Heart,
  Eraser,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Bidding } from "@shared/schema";
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
  { code: "TO", name: "TO - Tocantins" },
];

export default function Favorites() {
  const { user } = useAuth();
  const [numeroControle, setNumeroControle] = useState("");
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);

  const { data: favorites = [], isLoading } = useQuery<Bidding[]>({
    queryKey: [`/api/favorites/${user?.id}`],
    enabled: !!user,
  });

  // Extrair órgãos únicos dos favoritos
  const uniqueOrgaos = Array.from(
    new Set(favorites.map((b) => b.orgao_nome))
  ).sort();

  // Filtra os favoritos conforme os filtros
  const filteredFavorites = favorites.filter((b) => {
    const matchesNumeroControle =
      !numeroControle ||
      b.conlicitacao_id?.toString().includes(numeroControle);

    const matchesOrgao =
      selectedOrgaos.length === 0 || selectedOrgaos.includes(b.orgao_nome);

    const matchesUF =
      selectedUFs.length === 0 || selectedUFs.includes(b.orgao_uf);

    let matchesDateRange = true;
    if (dateRange.from && dateRange.to) {
      const bidDate = new Date(b.datahora_abertura || "");
      const start = new Date(dateRange.from);
      const end = new Date(dateRange.to);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      matchesDateRange = bidDate >= start && bidDate <= end;
    }

    return (
      matchesNumeroControle && matchesOrgao && matchesUF && matchesDateRange
    );
  });

  const toggleOrgao = (orgao: string) => {
    setSelectedOrgaos((prev) =>
      prev.includes(orgao) ? prev.filter((o) => o !== orgao) : [...prev, orgao]
    );
  };
  const toggleUF = (uf: string) => {
    setSelectedUFs((prev) =>
      prev.includes(uf) ? prev.filter((u) => u !== uf) : [...prev, uf]
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
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded mb-4" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white mb-6 shadow-lg">
            <Heart className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-red-700 mb-3">
            Favoritas
          </h1>
          <p className="text-xl text-gray-600 mb-2">Suas Preferidas ❤️</p>
          <p className="text-gray-500">Suas licitações marcadas como favoritas</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros de Pesquisa
              </div>
              {(numeroControle ||
                selectedOrgaos.length > 0 ||
                selectedUFs.length > 0 ||
                (dateRange.from && dateRange.to)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 w-8 p-0"
                >
                  <Eraser className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Número de Controle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Controle
                </label>
                <Input
                  value={numeroControle}
                  onChange={(e) => setNumeroControle(e.target.value)}
                  placeholder="Ex. 13157470"
                  className="h-10"
                />
              </div>

              {/* Órgão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Órgão
                </label>
                <Popover
                  open={orgaoPopoverOpen}
                  onOpenChange={setOrgaoPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-10 justify-between"
                    >
                      {selectedOrgaos.length === 0
                        ? "Selecione um ou mais órgãos"
                        : `${selectedOrgaos.length} selecionado(s)`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 shadow-lg">
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
                              onCheckedChange={() => toggleOrgao(orgao)}
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
                        {orgao.length > 20 ? `${orgao.slice(0, 20)}…` : orgao}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado (UF)
                </label>
                <Popover open={ufPopoverOpen} onOpenChange={setUfPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-10 justify-between"
                    >
                      {selectedUFs.length === 0
                        ? "Selecione um ou mais UFs"
                        : selectedUFs.join(", ")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 shadow-lg">
                    <Command>
                      <CommandInput placeholder="Buscar UF..." />
                      <CommandEmpty>Nenhuma UF encontrada.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {UF_OPTIONS.map((opt) => (
                          <CommandItem
                            key={opt.code}
                            onSelect={() => toggleUF(opt.code)}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              checked={selectedUFs.includes(opt.code)}
                              onCheckedChange={() => toggleUF(opt.code)}
                            />
                            <span>{opt.name}</span>
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

              {/* Selecionar período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecionar período
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {/* Início */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left",
                          !dateRange.from && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>
                          {dateRange.from
                            ? format(dateRange.from, "dd/MM/yyyy")
                            : "Início"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(d) =>
                          setDateRange((prev) => ({ ...prev, from: d }))
                        }
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  {/* Fim */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left",
                          !dateRange.to && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span>
                          {dateRange.to
                            ? format(dateRange.to, "dd/MM/yyyy")
                            : "Fim"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(d) =>
                          setDateRange((prev) => ({ ...prev, to: d }))
                        }
                        locale={ptBR}
                        disabled={(d) =>
                          dateRange.from ? d < dateRange.from : false
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredFavorites.length === 0
              ? "Nenhum favorito encontrado"
              : `${filteredFavorites.length} favorito${
                  filteredFavorites.length > 1 ? "s" : ""
                } encontrado${
                  filteredFavorites.length > 1 ? "s" : ""
                }`}
          </h2>
          {filteredFavorites.length > 0 &&
            filteredFavorites.length !== favorites.length && (
              <span className="text-sm text-gray-500">
                {favorites.length} total
              </span>
            )}
        </div>

        <div className="space-y-4">
          {filteredFavorites.length === 0 ? (
            <Card>
              <CardContent className="text-center p-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum favorito encontrado
                </h3>
                <p className="text-gray-600">
                  {favorites.length === 0
                    ? "Você ainda não marcou nenhuma licitação como favorita."
                    : "Não há favoritos que correspondam aos seus critérios de pesquisa."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFavorites.map((b) => (
              <BiddingCard key={b.id} bidding={b} showFavoriteIcon />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
