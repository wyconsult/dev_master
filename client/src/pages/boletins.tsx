// src/pages/boletins.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowLeft
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { BiddingCard } from "@/components/bidding-card";
import type { Boletim, Bidding, Acompanhamento } from "@shared/schema";

export default function Boletins() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBoletim, setSelectedBoletim] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"licitacoes" | "acompanhamentos">("licitacoes");
  const queryClient = useQueryClient();

  // 1) lista de boletins
  const { data: boletins = [], isLoading } = useQuery<Boletim[]>({
    queryKey: ["/api/boletins"],
    queryFn: () =>
      apiRequest("GET", "/api/boletins").then(res =>
        (res.json() as Promise<Boletim[]>)
      ),
  });

  // 2) detalhe do boletim selecionado
  const {
    data: boletimData,
    isLoading: isLoadingBoletimData
  } = useQuery<{
    boletim: Boletim;
    licitacoes: Bidding[];
    acompanhamentos: Acompanhamento[];
  }>(
    {
      queryKey: [`/api/boletim/${selectedBoletim}`],
      enabled: !!selectedBoletim,
      queryFn: () =>
        apiRequest("GET", `/api/boletim/${selectedBoletim}`)
          .then(res =>
            (res.json() as Promise<{
              boletim: Boletim;
              licitacoes: Bidding[];
              acompanhamentos: Acompanhamento[];
            }>)
          ),
    }
  );

  // 3) mutation para marcar como visualizado
  const markAsViewedMutation = useMutation({
    mutationFn: (boletimId: number) =>
      apiRequest("POST", `/api/boletins/${boletimId}/mark-viewed`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    },
  });

  // Helpers de turno, status...
  const getTurno = (datahora: string) => {
    const h = new Date(datahora).getHours();
    if (h >= 6 && h < 12) return "M";
    if (h >= 12 && h < 18) return "T";
    return "N";
  };
  const getTurnoCompleto = (datahora: string) => {
    const d = new Date(datahora);
    const h = d.getHours();
    const turno = h < 12 ? "Manhã" : h < 18 ? "Tarde" : "Noite";
    return `${turno} - ${d.toLocaleDateString("pt-BR")}`;
  };
  const getStatusColor = (v: boolean) =>
    v ? "bg-gray-400 text-white" : "bg-green-500 text-white";
  const getStatusText = (v: boolean) =>
    v ? "Visualizado" : "Não visualizado";

  // Datas do mês
  const monthStart = startOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: endOfMonth(currentDate),
  });

  // Filtra boletins por data
  const getBoletinsForDate = (date: Date) =>
    boletins.filter(b => isSameDay(new Date(b.datahora_fechamento!), date));
  const selectedDateBoletins = selectedDate ? getBoletinsForDate(selectedDate) : [];

  // busca detalhes em paralelo para counts
  const boletimDetails = useQueries({
    queries: selectedDateBoletins.map(b => ({
      queryKey: ["boletim-detail", b.id] as const,
      queryFn: () =>
        apiRequest("GET", `/api/boletim/${b.id}`)
          .then(res =>
            (res.json() as Promise<{
              boletim: Boletim;
              licitacoes: Bidding[];
              acompanhamentos: Acompanhamento[];
            }>)
          ),
      enabled: selectedDate !== null,
      staleTime: 5 * 60_000,
    })),
  });

  // Navegação de mês
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleBoletimClick = (id: number) => {
    markAsViewedMutation.mutate(id);
    setSelectedBoletim(id);
    setActiveTab("licitacoes"); // reseta aba
  };
  const handleBackToCalendar = () => setSelectedBoletim(null);

  // Loading geral
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-96 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Página de detalhe
  if (selectedBoletim && boletimData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header e botão de voltar */}
          <div className="mb-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBackToCalendar}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Calendário
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Boletim #{boletimData.boletim.numero_edicao}
              </h1>
              <p className="text-gray-600">
                {boletimData.licitacoes.length} licitações encontradas
              </p>
            </div>
          </div>

          {isLoadingBoletimData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* Abas estilizadas */}
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setActiveTab("licitacoes")}
                  className={cn(
                    "px-4 py-2 rounded-md font-medium transition",
                    activeTab === "licitacoes"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  Licitações {boletimData.licitacoes.length}
                </button>
                <button
                  onClick={() => setActiveTab("acompanhamentos")}
                  className={cn(
                    "px-4 py-2 rounded-md font-medium transition",
                    activeTab === "acompanhamentos"
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  Acompanhamentos {boletimData.acompanhamentos.length}
                </button>
              </div>

              {/* Conteúdo das abas */}
              {activeTab === "licitacoes" ? (
                <div className="grid gap-6">
                  {boletimData.licitacoes.map(l => (
                    <BiddingCard key={l.id} bidding={l} showFavoriteIcon />
                  ))}
                </div>
              ) : (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Acompanhamentos
                  </h2>
                  <div className="space-y-4">
                    {boletimData.acompanhamentos.map(a => (
                      <Card key={a.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                          <h3 className="font-medium text-gray-900">{a.objeto}</h3>
                          <p className="text-sm text-gray-600 mt-1">{a.sintese}</p>
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p><strong>Órgão:</strong> {a.orgao_nome}</p>
                            <p><strong>Processo:</strong> {a.processo}</p>
                            <p><strong>Data:</strong> {new Date(a.data_fonte!).toLocaleString("pt-BR")}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Calendário + mini-cards
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-6 shadow-lg">
            <Calendar className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent mb-3">
            Boletins
          </h1>
          <p className="text-xl text-gray-600 mb-2">Calendário Inteligente 📅</p>
          <p className="text-gray-500">Visualize boletins de licitações organizados por data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* calendário */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
                    <div key={d} className="p-2 text-center text-sm font-medium text-gray-500">{d}</div>
                  ))}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={i} className="p-2" />
                  ))}
                  {daysInMonth.map(date => {
                    const dayBoletins = getBoletinsForDate(date);
                    const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
                    const isCurrentDay = isToday(date);
                    return (
                      <div key={date.toISOString()} className="relative">
                        <button
                          onClick={() => { setSelectedDate(date); setSelectedBoletim(null); }}
                          className={cn(
                            "w-full p-2 text-sm rounded-md border transition-colors",
                            {
                              "bg-blue-500 text-white border-blue-500": isSelected,
                              "bg-blue-100 border-blue-300": isCurrentDay && !isSelected,
                              "hover:bg-gray-100 border-gray-300": !isSelected && !isCurrentDay,
                              "text-gray-400 border-gray-200": !isSameMonth(date, currentDate),
                            }
                          )}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <span>{date.getDate()}</span>
                            {dayBoletins.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {dayBoletins.slice(0,3).map((b,i) => (
                                  <div key={`${b.id}-${i}`} className={cn(
                                    "text-[9px] px-0.5 py-0.5 rounded text-white text-center",
                                    getStatusColor(b.visualizado!)
                                  )}>
                                    {getTurno(b.datahora_fechamento!)} {b.numero_edicao}
                                  </div>
                                ))}
                                {dayBoletins.length > 3 && <div className="text-xs text-gray-500">+{dayBoletins.length - 3}</div>}
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Não visualizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded" />
                    <span>Visualizado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            {/* lista de boletins do dia */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>
                  {selectedDate !== null
                    ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                    : "Selecione uma data"}
                </CardTitle>
                <CardDescription>
                  {selectedDate !== null
                    ? `${selectedDateBoletins.length} boletim(s) encontrado(s)`
                    : "Clique em uma data no calendário para ver os boletins"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDate !== null && selectedDateBoletins.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum boletim encontrado para esta data.
                  </p>
                )}
                {selectedDateBoletins.length > 0 && (
                  <div className="space-y-4">
                    {selectedDateBoletins.map((boletim, idx) => {
                      const detail = boletimDetails[idx].data;
                      const licCount = detail?.licitacoes.length ?? boletim.quantidade_licitacoes;
                      const acompCount = detail?.acompanhamentos.length ?? boletim.quantidade_acompanhamentos;
                      return (
                        <Card
                          key={boletim.id}
                          className="border border-gray-300 border-l-4 border-l-blue-500"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">Boletim #{boletim.numero_edicao}</h4>
                                <p className="text-xs text-gray-500">
                                  {getTurnoCompleto(boletim.datahora_fechamento!)}
                                </p>
                              </div>
                              <Badge className={getStatusColor(boletim.visualizado!)}>
                                {getStatusText(boletim.visualizado!)}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>Licitações: {licCount}</p>
                              <p>Acompanhamentos: {acompCount}</p>
                              <p>
                                Fechamento:{" "}
                                {new Date(
                                  boletim.datahora_fechamento!
                                ).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3 border-gray-300"
                              onClick={() => handleBoletimClick(boletim.id)}
                              disabled={markAsViewedMutation.isPending}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {markAsViewedMutation.isPending ? "Acessando..." : "Ver Licitações"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
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
