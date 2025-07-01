import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Boletim } from "@shared/schema";

export default function Boletins() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const { data: boletins = [], isLoading } = useQuery<Boletim[]>({
    queryKey: ["/api/boletins"],
  });

  const markAsViewedMutation = useMutation({
    mutationFn: async (boletimId: number) => {
      return apiRequest("POST", `/api/boletins/${boletimId}/mark-viewed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boletins"] });
    },
  });

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
      if (hora >= 12 && hora < 18) return "T";
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
      else if (hora >= 12 && hora < 18) turno = "Tarde";
      else turno = "Noite";
      return `${turno} - ${data.toLocaleDateString('pt-BR')}`;
    } catch {
      return "Manhã";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Boletins</h1>
          <p className="text-gray-600">
            Visualize boletins de licitações organizados por data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
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
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="p-2"></div>
                  ))}
                  
                  {daysInMonth.map((date, index) => {
                    const dayBoletins = getBoletinsForDate(date);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isCurrentMonth = isSameMonth(date, currentDate);
                    const isCurrentDay = isToday(date);

                    return (
                      <div key={index} className="relative">
                        <button
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                            "w-full p-2 text-sm rounded-md border transition-colors",
                            {
                              "bg-blue-500 text-white": isSelected,
                              "bg-blue-100 border-blue-300": isCurrentDay && !isSelected,
                              "hover:bg-gray-100": !isSelected && !isCurrentDay,
                              "text-gray-400": !isCurrentMonth,
                            }
                          )}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <span>{date.getDate()}</span>
                            {dayBoletins.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 justify-center max-w-full">
                                {dayBoletins.slice(0, 3).map((boletim, idx) => (
                                  <div
                                    key={`${boletim.id}-${idx}`}
                                    className={cn(
                                      "text-xs px-0.5 py-0.5 rounded text-white text-center flex-shrink-0 leading-none",
                                      getStatusColor(boletim.visualizado)
                                    )}
                                    style={{ fontSize: '9px', minHeight: '14px', lineHeight: '14px' }}
                                  >
                                    {getTurno(boletim.datahora_fechamento)} {boletim.numero_edicao}
                                  </div>
                                ))}
                                {dayBoletins.length > 3 && (
                                  <div className="text-xs text-gray-500">+{dayBoletins.length - 3}</div>
                                )}
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
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Não visualizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                    <span>Visualizado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                </CardTitle>
                <CardDescription>
                  {selectedDate && selectedDateBoletins.length > 0 
                    ? `${selectedDateBoletins.length} boletim(s) encontrado(s)`
                    : selectedDate 
                      ? "Nenhum boletim nesta data"
                      : "Clique em uma data no calendário para ver os boletins"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDate && selectedDateBoletins.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum boletim encontrado para esta data.
                  </p>
                )}
                
                {selectedDateBoletins.length > 0 && (
                  <div className="space-y-4">
                    {selectedDateBoletins.map((boletim) => (
                      <Card key={boletim.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">Boletim #{boletim.numero_edicao}</h4>
                              <p className="text-xs text-gray-500">{getTurnoCompleto(boletim.datahora_fechamento)}</p>
                            </div>
                            <Badge className={getStatusColor(boletim.visualizado)}>
                              {getStatusText(boletim.visualizado)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Licitações: {boletim.quantidade_licitacoes}</p>
                            <p>Acompanhamentos: {boletim.quantidade_acompanhamentos}</p>
                            <p>Fechamento: {new Date(boletim.datahora_fechamento).toLocaleString('pt-BR')}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => markAsViewedMutation.mutate(boletim.id)}
                            disabled={markAsViewedMutation.isPending}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {markAsViewedMutation.isPending ? "Acessando..." : "Acessar documento"}
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