import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Eye, ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { BiddingCard } from "@/components/bidding-card";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Boletim, Bidding, Acompanhamento } from "@shared/schema";

export default function Boletins() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBoletim, setSelectedBoletim] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'licitacoes' | 'acompanhamentos'>('licitacoes');
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: boletins = [], isLoading } = useQuery<Boletim[]>({
    queryKey: ["/api/boletins"],
  });

  // Query para buscar dados específicos do boletim selecionado
  const { data: boletimData, isLoading: isLoadingBoletimData } = useQuery<{
    boletim: Boletim;
    licitacoes: Bidding[];
    acompanhamentos: Acompanhamento[];
  }>({
    queryKey: [`/api/boletim/${selectedBoletim}`],
    enabled: !!selectedBoletim,
  });

  const markAsViewedMutation = useMutation({
    mutationFn: async (boletimId: number) => {
      return apiRequest("POST", `/api/boletins/${boletimId}/mark-viewed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    },
  });

  const handleBoletimClick = (boletimId: number) => {
    // Marcar como visualizado e depois selecionar o boletim
    markAsViewedMutation.mutate(boletimId, {
      onSuccess: () => {
        setSelectedBoletim(boletimId);
        // Invalidar todas as queries relevantes para atualização imediata
        queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
        queryClient.invalidateQueries({ queryKey: ["/api/biddings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
        queryClient.invalidateQueries({ queryKey: ["/api/filtros"] });
        // Forçar múltiplas atualizações do calendário para garantir visualização imediata
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
        }, 50);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
        }, 200);
      }
    });
  };

  const handleBackToCalendar = () => {
    setSelectedBoletim(null);
    // Invalidar todas as queries relacionadas para forçar atualização completa do calendário
    queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    queryClient.invalidateQueries({ queryKey: ["/api/biddings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    // Múltiplas atualizações para garantir que as cores das tarjas sejam atualizadas
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    }, 25);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    }, 100);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    }, 300);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBoletinsForDate = (date: Date) => {
    return boletins.filter(boletim => {
      try {
        return isSameDay(new Date(boletim.datahora_fechamento), date);
      } catch {
        return false;
      }
    });
  };

  const getBoletinsByPeriod = (date: Date, period: 'manha' | 'tarde' | 'noite') => {
    const dayBoletins = getBoletinsForDate(date);
    return dayBoletins.filter(boletim => {
      const hour = new Date(boletim.datahora_fechamento).getHours();
      switch (period) {
        case 'manha':
          return hour >= 6 && hour < 12;
        case 'tarde':
          return hour >= 12 && hour < 17;
        case 'noite':
          return hour >= 17 || hour < 6;
        default:
          return false;
      }
    });
  };

  const selectedDateBoletins = selectedDate ? getBoletinsForDate(selectedDate) : [];

  const getStatusColor = (visualizado: boolean) => {
    return visualizado ? "bg-gray-400 text-white" : "bg-green-500 text-white";
  };

  const getStatusText = (visualizado: boolean) => {
    return visualizado ? "Visualizado" : "Não visualizado";
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getTurno = (datahora: string) => {
    try {
      const hora = new Date(datahora).getHours();
      if (hora >= 6 && hora < 12) return "M";
      if (hora >= 12 && hora < 17) return "T";
      return "N";
    } catch {
      return "M";
    }
  };

  const getTurnoCompleto = (datahora: string) => {
    try {
      const data = new Date(datahora);
      const hora = data.getHours();
      let turno = "";
      if (hora >= 6 && hora < 12) turno = "Manhã";
      else if (hora >= 12 && hora < 17) turno = "Tarde";
      else turno = "Noite";
      return `${turno} - ${data.toLocaleDateString('pt-BR')}`;
    } catch {
      return "Manhã";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Se um boletim estiver selecionado, mostrar as licitações
  if (selectedBoletim && boletimData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header com botão de volta */}
          <div className="mb-6 md:mb-8 px-4">
            <Button 
              variant="outline" 
              onClick={handleBackToCalendar}
              className="mb-4 text-sm"
              size="sm"
            >
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-2" />
              Voltar ao Calendário
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Boletim #{boletimData.boletim.numero_edicao}
            </h1>

            {/* Toggle buttons para Licitações e Acompanhamentos */}
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <Button
                onClick={() => setActiveTab('licitacoes')}
                className={cn(
                  "px-4 md:px-6 py-2 rounded-lg font-medium transition-all text-sm md:text-base",
                  activeTab === 'licitacoes'
                    ? "bg-blue-500 text-white shadow-md border-0"
                    : "bg-white text-blue-500 border border-blue-500 hover:bg-blue-50"
                )}
                variant={activeTab === 'licitacoes' ? 'default' : 'outline'}
              >
                Licitações ({boletimData.licitacoes.length})
              </Button>
              <Button
                onClick={() => setActiveTab('acompanhamentos')}
                className={cn(
                  "px-4 md:px-6 py-2 rounded-lg font-medium transition-all text-sm md:text-base",
                  activeTab === 'acompanhamentos'
                    ? "bg-blue-500 text-white shadow-md border-0"
                    : "bg-white text-blue-500 border border-blue-500 hover:bg-blue-50"
                )}
                variant={activeTab === 'acompanhamentos' ? 'default' : 'outline'}
              >
                Acompanhamentos ({boletimData.acompanhamentos.length})
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {isLoadingBoletimData && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Conteúdo baseado na aba ativa */}
          {activeTab === 'licitacoes' && (
            <div className="grid gap-6">
              {boletimData.licitacoes.map((licitacao) => (
                <BiddingCard 
                  key={licitacao.id} 
                  bidding={licitacao} 
                  showFavoriteIcon={true} 
                />
              ))}
              {boletimData.licitacoes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Nenhuma licitação encontrada neste boletim.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'acompanhamentos' && (
            <div className="space-y-4">
              {boletimData.acompanhamentos.map((acomp) => (
                <Card key={acomp.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900">{acomp.objeto}</h3>
                    <p className="text-sm text-gray-600 mt-1">{acomp.sintese}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      <p><strong>Órgão:</strong> {acomp.orgao_nome}</p>
                      <p><strong>Processo:</strong> {acomp.processo}</p>
                      <p><strong>Data:</strong> {acomp.data_fonte ? new Date(acomp.data_fonte).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {boletimData.acompanhamentos.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Nenhum acompanhamento encontrado neste boletim.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 md:mb-12 text-center px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4 md:mb-6 shadow-lg">
            <Calendar className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent mb-2 md:mb-3">
            Boletins
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-1 md:mb-2">
            Calendário Inteligente 📅
          </p>
          <p className="text-sm md:text-base text-gray-500">
            Visualize boletins de licitações organizados por data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mx-2 md:mx-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="capitalize text-sm md:text-base">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</span>
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={previousMonth} className="border-gray-300 h-7 w-7 p-0">
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth} className="border-gray-300 h-7 w-7 p-0">
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 md:px-6 pb-4">
                {/* Headers dos dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="h-6 flex items-center justify-center text-xs font-medium text-gray-500">
                      {isMobile ? day.slice(0, 1) : day}
                    </div>
                  ))}
                </div>

                {/* Grade do calendário com design fixo */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="h-24 md:h-24"></div>
                  ))}
                  
                  {daysInMonth.map((date, index) => {
                    const isCurrentMonth = isSameMonth(date, currentDate);
                    const isCurrentDay = isToday(date);
                    const manhaBoletins = getBoletinsByPeriod(date, 'manha');
                    const tardeBoletins = getBoletinsByPeriod(date, 'tarde');
                    const noiteBoletins = getBoletinsByPeriod(date, 'noite');

                    const isSelectedDate = selectedDate && isSameDay(selectedDate, date);
                    const totalBoletins = manhaBoletins.length + tardeBoletins.length + noiteBoletins.length;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "relative w-full h-24 md:h-24 border rounded-lg overflow-hidden cursor-pointer transition-all",
                          isCurrentMonth ? "bg-white" : "bg-gray-50/50",
                          isCurrentDay && "ring-2 ring-blue-500",
                          isSelectedDate && "ring-2 ring-green-500 bg-green-50",
                          totalBoletins > 0 && "hover:shadow-md",
                          "border-gray-200"
                        )}
                        onClick={() => totalBoletins > 0 && setSelectedDate(date)}
                        title={totalBoletins > 0 ? `${totalBoletins} boletim(s) disponível(is)` : 'Nenhum boletim'}
                      >
                        {/* Número do dia */}
                        <div className={cn(
                          "absolute top-0.5 left-0.5 text-xs font-bold z-10",
                          isCurrentMonth ? "text-gray-900" : "text-gray-400",
                          isCurrentDay && "text-blue-600",
                          isSelectedDate && "text-green-600"
                        )}>
                          {date.getDate()}
                        </div>

                        {/* Três seções: Manhã, Tarde, Noite - Mobile otimizado */}
                        <div className="flex flex-col h-full pt-4 px-1 md:px-0.5 pb-0.5 pointer-events-none">
                          {/* Manhã */}
                          <div className={cn(
                            "h-3 md:h-5 flex items-center justify-center text-[7px] md:text-[10px] font-bold text-white rounded-sm mb-0.5 text-center w-full",
                            manhaBoletins.length > 0 
                              ? manhaBoletins.some(b => !b.visualizado) 
                                ? "bg-green-500" 
                                : "bg-gray-400"
                              : "bg-gray-100 text-gray-400"
                          )}
                          title={manhaBoletins.length > 0 ? `${manhaBoletins.length} boletim(s) - Manhã` : ''}
                          >
                            <span className="w-full text-center truncate px-0.5 md:px-1">{manhaBoletins.length > 0 ? (isMobile ? 'M' : 'Manhã') : ''}</span>
                          </div>

                          {/* Tarde */}
                          <div className={cn(
                            "h-3 md:h-5 flex items-center justify-center text-[7px] md:text-[10px] font-bold text-white rounded-sm mb-0.5 text-center w-full",
                            tardeBoletins.length > 0 
                              ? tardeBoletins.some(b => !b.visualizado) 
                                ? "bg-green-500" 
                                : "bg-gray-400"
                              : "bg-gray-100 text-gray-400"
                          )}
                          title={tardeBoletins.length > 0 ? `${tardeBoletins.length} boletim(s) - Tarde` : ''}
                          >
                            <span className="w-full text-center truncate px-0.5 md:px-1">{tardeBoletins.length > 0 ? (isMobile ? 'T' : 'Tarde') : ''}</span>
                          </div>

                          {/* Noite */}
                          <div className={cn(
                            "h-3 md:h-5 flex items-center justify-center text-[7px] md:text-[10px] font-bold text-white rounded-sm text-center w-full",
                            noiteBoletins.length > 0 
                              ? noiteBoletins.some(b => !b.visualizado) 
                                ? "bg-green-500" 
                                : "bg-gray-400"
                              : "bg-gray-100 text-gray-400"
                          )}
                          title={noiteBoletins.length > 0 ? `${noiteBoletins.length} boletim(s) - Noite` : ''}
                          >
                            <span className="w-full text-center truncate px-0.5 md:px-1">{noiteBoletins.length > 0 ? (isMobile ? 'N' : 'Noite') : ''}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded"></div>
                    <span>Não visualizado</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-gray-400 rounded"></div>
                    <span>Visualizado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 lg:mt-0">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm mx-2 md:mx-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-xl">
                  {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  {selectedDate && selectedDateBoletins.length > 0 
                    ? `${selectedDateBoletins.length} boletim(s) encontrado(s)`
                    : selectedDate 
                      ? "Nenhum boletim nesta data"
                      : "Clique em uma data no calendário para ver os boletins"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                {selectedDate && selectedDateBoletins.length === 0 && (
                  <p className="text-gray-500 text-center py-6 md:py-8 text-sm">
                    Nenhum boletim encontrado para esta data.
                  </p>
                )}
                
                {selectedDateBoletins.length > 0 && (
                  <div className="space-y-3 md:space-y-4">
                    {selectedDateBoletins.map((boletim) => (
                      <Card key={boletim.id} className="border border-gray-300 border-l-4 border-l-blue-500">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm md:text-base">Boletim #{boletim.numero_edicao}</h4>
                              <p className="text-xs text-gray-500 mt-1">{getTurnoCompleto(boletim.datahora_fechamento)}</p>
                            </div>
                            <Badge className={`${getStatusColor(boletim.visualizado)} text-xs flex-shrink-0`}>
                              {getStatusText(boletim.visualizado)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs md:text-sm text-gray-600">
                            <p>Licitações: {boletim.quantidade_licitacoes}</p>
                            <p>Acompanhamentos: {boletim.quantidade_acompanhamentos}</p>
                            <p>Fechamento: {new Date(boletim.datahora_fechamento).toLocaleString('pt-BR')}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3 border-gray-300 text-xs md:text-sm"
                            onClick={() => handleBoletimClick(boletim.id)}
                            disabled={markAsViewedMutation.isPending}
                          >
                            <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                            {markAsViewedMutation.isPending ? "Acessando..." : "Ver Licitações"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}