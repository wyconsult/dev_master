import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiddingCard } from "@/components/bidding-card";
import {
  Filter,
  Search,
  X,
  Calendar as CalendarIcon,
  Heart,
  Eraser,
  FileText,
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
import { type Bidding } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { date } from "drizzle-orm/pg-core";

// Lista de UFs
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

// Tipos de filtro de data
const DATE_FILTER_OPTIONS = [
  { value: "favorito", label: "Data de inclusão favorito" },
  { value: "realizacao", label: "Data de realização" },
];

// Opções de datas de realização
const DATE_OPTIONS = [
  { key: "datahora_abertura", label: "Abertura" },
  { key: "datahora_prazo", label: "Prazo" },
  { key: "datahora_documento", label: "Documento" },
  { key: "datahora_retirada", label: "Retirada" },
  { key: "datahora_visita", label: "Visita" },
];

export default function Favorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [numeroControle, setNumeroControle] = useState("");
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [dateFilterType, setDateFilterType] = useState<"favorito" | "realizacao">("favorito");
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);

  // Estado para armazenar quais datas estão selecionadas no filtro (default: todas)
  const [selectedDates, setSelectedDates] = useState<string[]>(DATE_OPTIONS.map(d => d.key));

  // Buscar lista de usuários
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Usar o primeiro usuário disponível se nenhum estiver selecionado
  const effectiveUserId = selectedUserId || users[0]?.id || user?.id;

  const { data: favorites = [], isLoading } = useQuery<Bidding[]>({
    queryKey: [`/api/favorites/${effectiveUserId}`],
    enabled: !!effectiveUserId,
  });

  // Extrair órgãos únicos dos favoritos
  const uniqueOrgaos = Array.from(new Set(favorites.map(b => b.orgao_nome))).sort();

  // Filter favorites based on form filters
  const filteredFavorites = favorites.filter(bidding => {
    const matchesNumeroControle =
      !numeroControle ||
      bidding.conlicitacao_id?.toString().includes(numeroControle);

    const matchesOrgao =
      selectedOrgaos.length === 0 || selectedOrgaos.includes(bidding.orgao_nome);

    const matchesUF =
      selectedUFs.length === 0 || selectedUFs.includes(bidding.orgao_uf);

    // Lógica de filtro por data
    let matchesDateRange = true;
    if (dateRange.from && dateRange.to) {
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (dateFilterType === "favorito") {
        // Filtrar pela data de inclusão do favorito (createdAt)
        const fav = bidding as any;
        const createdAtValue = fav?.createdAt ? new Date(fav.createdAt) : null;
        if (!createdAtValue) return false;
        createdAtValue.setHours(0, 0, 0, 0);
        matchesDateRange =
          createdAtValue >= startDate && createdAtValue <= endDate;
      } else if (dateFilterType === "realizacao"){
        // Filtrar pelas 5 datas selecionadas (Abertura, Prazo, Documento, Retirada, Visita)
        matchesDateRange = selectedDates.some(dateKey => {
          const value = bidding[dateKey as keyof Bidding] as string | undefined;
          if (!value) return false;
          const biddingDate = new Date(value);
          biddingDate.setHours(0, 0, 0, 0);
          return biddingDate >= startDate && biddingDate <= endDate;
        });
      }
    }

    return (
      matchesNumeroControle &&
      matchesOrgao &&
      matchesUF &&
      matchesDateRange
    );
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
    // Não limpar usuário selecionado para manter contexto
    setNumeroControle("");
    setSelectedOrgaos([]);
    setSelectedUFs([]);
    setDateRange({});
  };

  // Função para gerar PDF
  const generatePDF = () => {
    if (!dateRange.from || !dateRange.to) { 
      toast({
        title: "Erro",
        description: "Selecione um período de datas para gerar o PDF",
        variant: "destructive",
      });
      return;
    }

    // Criar conteúdo HTML para o PDF usando apenas favoritos filtrados por data
    const htmlContent = createPDFContent(filteredFavorites);
    
    // Abrir nova janela para impressão/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  };

  // Função para criar o conteúdo HTML do PDF
  const createPDFContent = (favoritesList: Bidding[]) => {
    const dateFromStr = dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "";
    const dateToStr = dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "";
    const filterTypeLabel = dateFilterType === "favorito" ? "Data de inclusão favorito" : "Data de realização";
    
    // CORREÇÃO: Ordenar favoritos por data cronológica crescente antes de gerar PDF
    // "Não informado" sempre por último
    const sortedFavorites = [...favoritesList].sort((a, b) => {
      // Função para extrair data com prioridade P1-P5
      const getRelevantDate = (bidding: any): Date | null => {
        if (dateFilterType === "favorito") {
          return bidding?.createdAt ? new Date(bidding.createdAt) : null;
        }
        // realizações: usar prioridade P1-P5 
      const datePriorities = [
          'datahora_abertura',
          'datahora_prazo', 
          'datahora_documento',
          'datahora_retirada',
          'datahora_visita'
        ];

        for (const Key of datePriorities) {
          const Value = bidding[Key];
          if (Value) {
            return new Date(Value);
            } 
        }
        return null; // Não informado
      };

      const dateA = getRelevantDate(a);
      const dateB = getRelevantDate(b);

      if(dateA && dateB) return dateA.getTime() - dateB.getTime();
      if(dateA && !dateB) return -1;
      if(!dateA && dateB) return 1;
      return 0;
    });    
    let htmlRows = "";
    
    sortedFavorites.forEach((bidding) => {
      const any = bidding as any;
      
      // Extrair dados do bidding
      const controle = bidding.conlicitacao_id || "";
      
      // Função para extrair data com prioridade P1-P5
      const getDateWithPriority = (bidding: any) => {
        // P1 = Abertura, P2 = Prazo, P3 = Documento, P4 = Retirada, P5 = Visita
        // Nomes dos campos conforme documentação oficial da API ConLicitação
        const datePriorities = [
          { key: 'datahora_abertura', label: 'Abertura' },
          { key: 'datahora_prazo', label: 'Prazo' },
          { key: 'datahora_documento', label: 'Documento' },
          { key: 'datahora_retirada', label: 'Retirada' },
          { key: 'datahora_visita', label: 'Visita' }
        ];

        for (const priority of datePriorities) {
          const dateValue = bidding[priority.key];
          if (dateValue && dateValue.trim() !== "") {
            try {
              const formattedDate = format(new Date(dateValue), "dd/MM/yyyy");
              const formattedTime = format(new Date(dateValue), "HH:mm");
              return {
                dateLabel: formattedDate, // Remover prefixo, manter apenas data
                time: formattedTime,
                rawDate: dateValue
              };
            } catch (error) {
              // Se houver erro na formatação, continua para próxima data
              continue;
            }
          }
        }

        // Se nenhuma data foi encontrada
        return {
          dateLabel: "Não informado",
          time: "",
          rawDate: null
        };
      };

      const dateInfo = getDateWithPriority(bidding);
      const data = dateInfo.dateLabel;
      const pregao = bidding.edital || "";
      const hora = dateInfo.time;
      
      // Data extraída seguindo prioridade P1-P5 sem prefixos
      const orgao = bidding.orgao_nome || "";
      
      // USAR CATEGORIA TABULADA NO LUGAR DO OBJETO ORIGINAL
      // Mostrar apenas a categoria (segundo nível da hierarquia)
      let objeto = bidding.objeto || "";
      
      // Sistema otimizado para dados reais da API ConLicitação
      
      if (any.customCategory?.trim()) {
        // Se há categoria personalizada, usar ela
        objeto = any.customCategory.trim();
      } else if (any.category?.trim()) {
        // Extrair apenas a categoria (segundo nível)
        const categoryStr = any.category.trim();
        
        // Verificar se usa separador "|" (dados salvos) ou " → " (exibição)
        if (categoryStr.includes('|')) {
          const parts = categoryStr.split('|').map((p: string) => p.trim());
          // Usar apenas a segunda parte (Categoria): "Alimentação|Auxiliar de Cozinha|Especialização"
          objeto = parts[1] || parts[0] || objeto;

        } else if (categoryStr.includes(' → ')) {
          const parts = categoryStr.split(' → ').map((p: string) => p.trim());
          // Usar apenas a segunda parte (Categoria)
          objeto = parts[1] || parts[0] || objeto;

        } else {
          // Se não tem separador, usar a categoria como está
          objeto = categoryStr;
        }
      }
      
      const uf = any.uf || bidding.orgao_uf || "";
      const site = any.site || "";
      const codigoUnidade = any.codigoUasg || bidding.orgao_codigo || "";
      
      // Debug log para verificar dados do site no PDF
      console.log(`🔍 PDF DEBUG - Licitação ID ${bidding.id}:`, {
        biddingId: bidding.id,
        siteFromAny: any.site,
        site: site,
        categoria: any.category,
        customCategory: any.customCategory,
        todasPropriedades: Object.keys(any)
      });
      
      // Formatação correta do valor estimado
      let valorEstimado = "Não Informado";
      if (any.valorEstimado) {
        // Se valor estimado foi preenchido na categorização
        let cleanValue = any.valorEstimado.toString().replace(/[^\d,.]/g, '');
        
        // Tratar formato brasileiro: R$ 65.000,00 ou R$ 65.000 ou R$ 65000
        if (cleanValue.includes('.') && cleanValue.includes(',')) {
          // Formato: 65.000,00 - ponto é separador de milhares, vírgula é decimal
          cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
        } else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
          // Formato: 65.000 - assumir que ponto é separador de milhares se valor >= 1000
          const parts = cleanValue.split('.');
          if (parts.length === 2 && parts[1].length === 3) {
            // Provável separador de milhares (ex: 65.000)
            cleanValue = cleanValue.replace('.', '');
          }
          // Se for formato decimal americano (ex: 65.50), manter como está
        }
        
        const numericValue = parseFloat(cleanValue);
        if (!isNaN(numericValue)) {
          valorEstimado = `R$ ${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
          valorEstimado = any.valorEstimado;
        }
      } else if (bidding.valor_estimado) {
        // Se há valor estimado da licitação original
        const numericValue = typeof bidding.valor_estimado === 'number' ? bidding.valor_estimado : parseFloat(bidding.valor_estimado.toString());
        if (!isNaN(numericValue)) {
          valorEstimado = `R$ ${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
          valorEstimado = bidding.valor_estimado.toString();
        }
      }
      
      htmlRows += `
        <tr>
          <td>${controle}</td>
          <td>${data}</td>
          <td>${pregao}</td>
          <td>${hora}</td>
          <td>${orgao}</td>
          <td>${objeto}</td>
          <td>${uf}</td>
          <td>${site}</td>
          <td>${codigoUnidade}</td>
          <td>${valorEstimado}</td>
        </tr>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Favoritos - JLG Consultoria</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .info {
            margin-bottom: 20px;
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 10px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 6px; 
            text-align: left;
            word-wrap: break-word;
          }
          th { 
            background-color: #f2f2f2; 
            font-weight: bold;
            font-size: 9px;
          }
          .no-break { page-break-inside: avoid; }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>JLG Consultoria - Relatório de Favoritos</h1>
          <p>Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        </div>
        
        <div class="info">
          <p><strong>Filtro aplicado:</strong> ${filterTypeLabel}</p>
          <p><strong>Período:</strong> ${dateFromStr} até ${dateToStr}</p>
          <p><strong>Total de registros:</strong> ${sortedFavorites.length}</p>
        </div>
        
        <table class="no-break">
          <thead>
            <tr>
              <th>CONTROLE</th>
              <th>DATA</th>
              <th>Nº PREGÃO</th>
              <th>HORA</th>
              <th>ÓRGÃO</th>
              <th>OBJETO</th>
              <th>UF</th>
              <th>SITE</th>
              <th>CÓDIGO UNIDADE GESTORA</th>
              <th>Valor Estimado Contratação</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
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
        <div className="mb-8 md:mb-12 text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white mb-4 md:mb-6 shadow-lg">
            <Heart className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-red-700 bg-clip-text text-transparent mb-2 md:mb-3">
            Favoritas
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-1 md:mb-2">
            Suas Preferidas ❤️
          </p>
          <p className="text-sm md:text-base text-gray-500">
            {users.find(u => u.id === effectiveUserId)?.nome ? 
              `Favoritos de ${users.find(u => u.id === effectiveUserId)?.nome}` : 
              'Suas licitações marcadas como favoritas'
            }
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm mx-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg md:text-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Filtros de Pesquisa
              </div>
              {(numeroControle || selectedOrgaos.length > 0 || selectedUFs.length > 0 || (dateRange.from && dateRange.to)) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <Eraser className="h-3 w-3 md:h-4 md:w-4 text-red-500 hover:text-red-600" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {/* Filtro de usuário separado */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="w-full sm:w-1/2 lg:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuário
                </label>
                <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between border-gray-300 text-gray-700 h-10"
                    >
                      {users.find(u => u.id === effectiveUserId)?.nome || "Selecione usuário"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 z-50 bg-white border border-gray-200 shadow-lg">
                    <Command>
                      <CommandInput placeholder="Buscar usuário..." />
                      <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {users.map((userData) => (
                          <CommandItem
                            key={userData.id}
                            onSelect={() => {
                              setSelectedUserId(userData.id);
                              setUserPopoverOpen(false);
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span className="flex-1 text-sm">
                              {userData.nome} ({userData.email})
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Demais filtros com mais espaço para o calendário */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                    className="border-gray-300 text-gray-700 placeholder:text-gray-400 h-10"
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
                      className="w-full justify-between border-gray-300 text-gray-700 h-10"
                    >
                      {selectedOrgaos.length === 0
                        ? "Selecione um ou mais órgãos"
                        : `${selectedOrgaos.length} selecionado(s)`
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
                      className="w-full justify-between border-gray-300 text-gray-700 h-10"
                    >
                      {selectedUFs.length === 0
                        ? "Selecione um ou mais UFs"
                        : selectedUFs.map(uf => UF_OPTIONS.find(opt => opt.code === uf)?.code || uf).join(", ")
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
            </div>

            {/* Tipo de Data (favorito ou realização) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Data</label>
              <div className="w-full sm:w-1/2 lg:w-1/3">
                <select
                  value={dateFilterType}
                  onChange={e => setDateFilterType(e.target.value as "favorito" | "realizacao")}
                  className="w-full border border-gray-300 p-2 rounded text-sm h-10"
                >
                  <option value="favorito">Data de Inclusão do Favorito</option>
                  <option value="realizacao">Datas de Realização</option>
                </select>
              </div>
            </div>

            {/* Checkboxes das 5 datas (só aparecem se realização for escolhido) */}
            {dateFilterType === "realizacao" && (
              <div className="mt-3 w-full sm:w-2/3 lg:w-1/2">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-800 mb-2">
                    Selecionar datas de realização:
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedDates.length === DATE_OPTIONS.length}
                        onCheckedChange={(checked) =>
                          setSelectedDates(checked ? DATE_OPTIONS.map(d => d.key) : [])
                        }
                      />
                      <span className="text-sm font-medium">Selecionar todas</span>
                    </label>
                    {DATE_OPTIONS.map(option => (
                      <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedDates.includes(option.key)}
                          onCheckedChange={(checked) =>
                            setSelectedDates(prev =>
                              checked ? [...prev, option.key] : prev.filter(d => d !== option.key)
                            )
                          }
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Período (de/até) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <div className="flex gap-2 w-full sm:w-2/3 lg:w-1/2">
                {/* Data de Início */}
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm h-10 px-2 border-gray-300 text-gray-700",
                          !dateRange.from && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        <span className="text-xs">
                          {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Início"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[60] bg-white border border-gray-200 shadow-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                        numberOfMonths={1}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data de Fim */}
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm h-10 px-2 border-gray-300 text-gray-700",
                          !dateRange.to && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        <span className="text-xs">
                          {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Fim"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[60] bg-white border border-gray-200 shadow-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                        numberOfMonths={1}
                        locale={ptBR}
                        disabled={(date) => dateRange.from ? date < dateRange.from : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Botão Gerar PDF - Seção separada */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className={cn(
                    "justify-center gap-3 h-12 font-semibold text-sm transition-all duration-300 relative overflow-hidden px-8",
                    dateRange.from && dateRange.to
                      ? "bg-gradient-to-r from-red-500 to-red-600 border-red-500 text-white hover:from-red-600 hover:to-red-700 hover:border-red-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      : "border-gray-300 text-gray-400 cursor-not-allowed opacity-50 bg-gray-50"
                  )}
                  disabled={!dateRange.from || !dateRange.to}
                  onClick={() => {
                    if (dateRange.from && dateRange.to) {
                      generatePDF();
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-full transition-colors",
                      dateRange.from && dateRange.to
                        ? "bg-white/20"
                        : "bg-transparent"
                    )}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-bold tracking-wide">Gerar PDF</span>
                  </div>
                  {dateRange.from && dateRange.to && (
                    <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3 md:mb-4 px-4 gap-2 md:gap-0">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            {filteredFavorites.length === 0 ? 'Nenhum favorito encontrado' : `${filteredFavorites.length} favorito${filteredFavorites.length > 1 ? 's' : ''} encontrado${filteredFavorites.length > 1 ? 's' : ''}`}
          </h2>
          {filteredFavorites.length > 0 && filteredFavorites.length !== favorites.length && (
            <span className="text-xs md:text-sm text-gray-500">
              {favorites.length} total
            </span>
          )}
        </div>

        {/* Results */}
        <div className="space-y-3 md:space-y-4 px-4">
          {filteredFavorites.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-12 text-center">
                <Search className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Nenhum favorito encontrado</h3>
                <p className="text-sm md:text-base text-gray-600">
                  {favorites.length === 0 
                    ? "Você ainda não marcou nenhuma licitação como favorita."
                    : "Não há favoritos que correspondam aos seus critérios de pesquisa."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFavorites.map((bidding) => (
              <BiddingCard 
                key={bidding.id} 
                bidding={bidding} 
                showFavoriteIcon={true}
                showCategorization={true}
                favoriteData={{
                  category: (bidding as any).category,
                  customCategory: (bidding as any).customCategory,
                  notes: (bidding as any).notes,
                  uf: (bidding as any).uf,
                  codigoUasg: (bidding as any).codigoUasg,
                  valorEstimado: (bidding as any).valorEstimado,
                  fornecedor: (bidding as any).fornecedor,
                  site: (bidding as any).site
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}