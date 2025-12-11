import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiddingCard } from "@/components/bidding-card";
import { Filter, Search, X, Calendar as CalendarIcon, Heart, Eraser, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { type Bidding } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";



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

// Tipos de filtro de data
const DATE_FILTER_OPTIONS = [
  { value: "favorito", label: "Data de inclusão favorito" },
  { value: "realizacao", label: "Data de realização" }
];

// Opções de datas de realização
const REALIZACAO_DATE_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "abertura", label: "Abertura" },
  { value: "prazo", label: "Prazo" },
  { value: "documento", label: "Documento" },
  { value: "retirada", label: "Retirada" },
  { value: "visita", label: "Visita" },
] as const;

export default function Favorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [numeroControle, setNumeroControle] = useState("");
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{from?: Date, to?: Date}>({});
  const [dateFilterType, setDateFilterType] = useState<"favorito" | "realizacao">("favorito");
  const [realizacaoDateKind, setRealizacaoDateKind] = useState<"todos" | "abertura" | "prazo" | "documento" | "retirada" | "visita">("todos");
  const [realizacaoPopoverOpen, setRealizacaoPopoverOpen] = useState(false);
  const [orgaoPopoverOpen, setOrgaoPopoverOpen] = useState(false);
  const [ufPopoverOpen, setUfPopoverOpen] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  // Ao mudar de página, rola para o topo
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Selecionar por padrão o usuário logado; se não houver, usar o primeiro da lista
  const effectiveUserId = selectedUserId ?? user?.id ?? users[0]?.id;
  
  const { data: favoritesResp, isLoading, isFetching } = useQuery<{ favorites: Bidding[]; total: number; page?: number; per_page?: number; }>({
    queryKey: [`/api/favorites/${effectiveUserId}`, page, perPage],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('per_page', String(perPage));
      const res = await fetch(`/api/favorites/${effectiveUserId}?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao carregar favoritos');
      return await res.json();
    },
  });

  const favorites = (favoritesResp?.favorites ?? []) as Bidding[];
  const totalFavorites = favoritesResp?.total ?? favorites.length;
  const totalPages = Math.max(1, Math.ceil(totalFavorites / perPage));
  
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

    // Date filter logic - check by type of date filter selected
    let matchesDateRange = true;
    if (dateRange.from && dateRange.to) {
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      // Normalize range bounds
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (dateFilterType === "favorito") {
        // Filter by favorite creation date
        const favoriteData = bidding as any;
        const biddingDate = favoriteData.createdAt ? new Date(favoriteData.createdAt) : new Date();
        biddingDate.setHours(0, 0, 0, 0);
        matchesDateRange = biddingDate >= startDate && biddingDate <= endDate;
      } else {
        // Filtro por realização: conforme tipo selecionado no dropdown
        const keyMap: Record<typeof realizacaoDateKind, keyof Bidding | string> = {
          todos: 'todos',
          abertura: 'datahora_abertura',
          prazo: 'datahora_prazo',
          documento: 'datahora_documento',
          retirada: 'datahora_retirada',
          visita: 'datahora_visita',
        };

        if (realizacaoDateKind === 'todos') {
          const dateKeys = [
            'datahora_abertura',
            'datahora_prazo', 
            'datahora_documento',
            'datahora_retirada',
            'datahora_visita'
          ] as const;
          matchesDateRange = dateKeys.some((key) => {
            const val = (bidding as any)[key];
            if (!val || typeof val !== 'string' || val.trim() === '') return false;
            const d = new Date(val);
            if (isNaN(d.getTime())) return false;
            d.setHours(0, 0, 0, 0);
            return d >= startDate && d <= endDate;
          });
        } else {
          const key = keyMap[realizacaoDateKind] as string;
          const val = (bidding as any)[key];
          if (!val || typeof val !== 'string' || val.trim() === '') {
            matchesDateRange = false;
          } else {
            const d = new Date(val);
            if (isNaN(d.getTime())) {
              matchesDateRange = false;
            } else {
              d.setHours(0, 0, 0, 0);
              matchesDateRange = d >= startDate && d <= endDate;
            }
          }
        }
      }
    }

    return matchesNumeroControle && matchesOrgao && matchesUF && matchesDateRange;
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
    const htmlContent = createPDFContent();
    
    // Abrir nova janela para impressão/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Definir título da janela para evitar exibir about:blank no cabeçalho
      try { printWindow.document.title = 'Relatório de Novos Processos - JLG Consultoria'; } catch {}
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  };

  // Função para criar o conteúdo HTML do PDF
  const createPDFContent = () => {
    const dateFromStr = dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "";
    const dateToStr = dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "";
    const realizacaoLabelMap: Record<typeof realizacaoDateKind, string> = {
      todos: "Todos",
      abertura: "Abertura",
      prazo: "Prazo",
      documento: "Documento",
      retirada: "Retirada",
      visita: "Visita",
    };
    const filterTypeLabel = dateFilterType === "favorito" 
      ? "Data de inclusão favorito" 
      : `Data de realização${realizacaoDateKind === 'todos' ? '' : ` - ${realizacaoLabelMap[realizacaoDateKind]}`}`;
    const logoUrl = `${window.location.origin}/logo.jpeg`;
    
    // CORREÇÃO: Ordenar favoritos por data cronológica crescente antes de gerar PDF
    // "Não informado" sempre por último
    const sortedFavorites = [...filteredFavorites].sort((a, b) => {
      // Função para extrair data com prioridade P1-P5
      const getEarliestDate = (bidding: any) => {
        const datePriorities = [
          'datahora_abertura',
          'datahora_prazo', 
          'datahora_documento',
          'datahora_retirada',
          'datahora_visita'
        ];

        for (const dateKey of datePriorities) {
          const dateValue = bidding[dateKey];
          if (dateValue && dateValue.trim() !== "") {
            try {
              return new Date(dateValue);
            } catch (error) {
              continue;
            }
          }
        }
        return null; // Não informado
      };

      const dateA = getEarliestDate(a);
      const dateB = getEarliestDate(b);

      // Lógica de ordenação: datas válidas primeiro (crescente), "Não informado" por último
      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime(); // Ordem cronológica crescente
      } else if (dateA && !dateB) {
        return -1; // A tem data, B não - A vem primeiro
      } else if (!dateA && dateB) {
        return 1; // A não tem data, B tem - B vem primeiro
      } else {
        return 0; // Ambos "Não informado" - manter ordem original
      }
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
      
      // Usar órgão editado se disponível
      const orgao = (any.orgaoLicitante && any.orgaoLicitante.trim()) || bidding.orgao_nome || "";
      // Usar status editado se disponível
      const status = (any.status && any.status.trim()) || (bidding.situacao || "");
      const normStatus = status.trim().toLowerCase();
      const colorAdjust = "-webkit-print-color-adjust: exact; print-color-adjust: exact;";
      let statusStyle = "";
      if (normStatus === "nova") {
        statusStyle = `${colorAdjust}background-color:#00AEEF;color:#000;`;
      } else if (normStatus === "urgente") {
        statusStyle = `${colorAdjust}background-color:#FFFFFF;color:#D32F2F;`;
      } else if (normStatus) {
        statusStyle = `${colorAdjust}background-color:#FFFF00;color:#000;`;
      }
      
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
      
      let valorEstimado = "Não Informado";
      if (any.valorEstimado) {
        let cleanValue = any.valorEstimado.toString().replace(/[^\d.,-]/g, '');
        if (cleanValue.includes(',') && cleanValue.includes('.')) {
          cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
        } else if (cleanValue.includes(',')) {
          cleanValue = cleanValue.replace(',', '.');
        } else if (cleanValue.includes('.')) {
          const parts = cleanValue.split('.');
          if (parts.length > 2) {
            cleanValue = cleanValue.replace(/\./g, '');
          } else if (parts.length === 2 && parts[1].length === 3) {
            cleanValue = cleanValue.replace('.', '');
          }
        }
        const numericValue = parseFloat(cleanValue);
        if (!isNaN(numericValue)) {
          valorEstimado = `R$ ${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
          valorEstimado = any.valorEstimado;
        }
      } else if (bidding.valor_estimado) {
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
          <td style="${statusStyle}"><strong>${status.toUpperCase()}</strong></td>
        </tr>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Novos Processos - JLG Consultoria</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            font-size: 12px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand img {
            height: 40px;
          }
          .header-center {
            flex: 1;
            text-align: center;
          }
          .header-center h1 {
            margin: 0;
            font-size: 18px;
          }
          .generated {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #555;
          }
          .header-right {
            min-width: 240px;
            text-align: right;
          }
          .header-right a {
            color: #1a73e8;
            text-decoration: none;
          }
          .header-right a:hover {
            text-decoration: underline;
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
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .info { page-break-after: avoid; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <img src="${logoUrl}" alt="JLG Consultoria" />
          </div>
          <div class="header-center">
            <h1>JLG Consultoria - Relatório de Novos Processos</h1>
            <p class="generated">Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          </div>
          <div class="header-right">
            <p><strong>Contato:</strong> Junior</p>
            <p><strong>E-mail:</strong> <a href="mailto:comercial@jlglicitacoes.com.br">comercial@jlglicitacoes.com.br</a></p>
            <p><strong>Tel:</strong> <a href="tel:+5511934616200">(11) 93461-6200</a></p>
          </div>
        </div>

        <div class="info">
          <p><strong>Filtro aplicado:</strong> ${filterTypeLabel}</p>
          <p><strong>Período:</strong> ${dateFromStr} até ${dateToStr}</p>
          <p><strong>Total de registros:</strong> ${sortedFavorites.length}</p>
        </div>
        
        <table>
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
              <th>STATUS</th>
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
              {/* Dropdown de realização agora abre ao clicar na label da opção "Data de realização" abaixo */}
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

              {/* Selecionar período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar período
                </label>
                
                {/* Seletor de tipo de data */}
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Filtrar por:
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {DATE_FILTER_OPTIONS.map((option) => (
                      option.value === 'realizacao' ? (
                        <Popover key={option.value} open={realizacaoPopoverOpen} onOpenChange={setRealizacaoPopoverOpen}>
                          <PopoverTrigger asChild>
                            <label
                              className="cursor-pointer hover:bg-white/60 p-2 rounded-lg transition-colors"
                              onClick={() => { setDateFilterType('realizacao'); setRealizacaoPopoverOpen(true); }}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                  dateFilterType === option.value 
                                    ? "border-blue-600 bg-blue-600 shadow-md" 
                                    : "border-gray-400 hover:border-blue-400"
                                )}>
                                  {dateFilterType === option.value && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                  )}
                                </div>
                                <span className={cn(
                                  "text-sm font-medium transition-colors",
                                  dateFilterType === option.value 
                                    ? "text-blue-800" 
                                    : "text-gray-700 hover:text-blue-700"
                                )}>
                                  {option.label}
                                </span>
                              </div>
                              {dateFilterType === 'realizacao' && (
                                <span
                                  className={cn(
                                    "mt-1 ml-8 text-sm font-medium",
                                    dateFilterType === option.value 
                                      ? "text-blue-800" 
                                      : "text-gray-700"
                                  )}
                                >
                                  {REALIZACAO_DATE_OPTIONS.find(o => o.value === realizacaoDateKind)?.label || 'Todos'}
                                </span>
                              )}
                            </label>
                          </PopoverTrigger>
                          <PopoverContent side="right" align="start" className="w-56 p-1 z-50 bg-white border border-blue-200 shadow-lg">
                            <div className="flex flex-col">
                              {REALIZACAO_DATE_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  className={cn(
                                    "text-left px-3 py-2 rounded-md hover:bg-blue-50 text-sm",
                                    realizacaoDateKind === opt.value ? "bg-blue-100 text-blue-800 font-semibold" : "text-gray-700"
                                  )}
                                  onClick={() => { setRealizacaoDateKind(opt.value); setRealizacaoPopoverOpen(false); }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <label 
                          key={option.value} 
                          className="flex items-center gap-3 cursor-pointer hover:bg-white/60 p-2 rounded-lg transition-colors"
                          onClick={() => setDateFilterType(option.value as "favorito" | "realizacao")}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            dateFilterType === option.value 
                              ? "border-blue-600 bg-blue-600 shadow-md" 
                              : "border-gray-400 hover:border-blue-400"
                          )}>
                            {dateFilterType === option.value && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span className={cn(
                            "text-sm font-medium transition-colors",
                            dateFilterType === option.value 
                              ? "text-blue-800" 
                              : "text-gray-700 hover:text-blue-700"
                          )}>
                            {option.label}
                          </span>
                        </label>
                      )
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-1">
                  {/* Data de Início */}
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm h-10 px-3 border-gray-300 text-gray-700",
                            !dateRange.from && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm h-10 px-3 border-gray-300 text-gray-700",
                            !dateRange.to && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
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
          {filteredFavorites.length > 0 && filteredFavorites.length !== totalFavorites && (
            <span className="text-xs md:text-sm text-gray-500">
              {totalFavorites} total
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
                  {totalFavorites === 0 
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
                  site: (bidding as any).site,
                  orgaoLicitante: (bidding as any).orgaoLicitante,
                  status: (bidding as any).status
                }}
              />
            ))
          )}

          {/* Pagination controls - moved to bottom */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Página {page} de {totalPages} — {totalFavorites} resultados</div>
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
