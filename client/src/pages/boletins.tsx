import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Boletim {
  id: number;
  numero_edicao: number;
  data: string;
  datahora_fechamento: string;
  filtro_id: number;
  quantidade_licitacoes: number;
  quantidade_acompanhamentos: number;
  status: "Publicado" | "Em Processamento" | "Arquivado";
  visualizado: boolean;
}

export default function Boletins() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: boletins = [], isLoading } = useQuery<Boletim[]>({
    queryKey: ["/api/boletins"],
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get boletins for the selected date
  const selectedDateBoletins = selectedDate 
    ? boletins.filter(boletim => 
        isSameDay(new Date(boletim.data), selectedDate)
      )
    : [];

  const getBoletinsForDate = (date: Date) => {
    return boletins.filter(boletim => 
      isSameDay(new Date(boletim.data), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Publicado":
        return "bg-green-500";
      case "Em Processamento":
        return "bg-gray-500";
      case "Arquivado":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Calendário</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">
                    {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for previous month */}
                  {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="h-24 p-1"></div>
                  ))}

                  {/* Calendar days */}
                  {daysInMonth.map(day => {
                    const dayBoletins = getBoletinsForDate(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 relative flex flex-col",
                          isSelected && "bg-blue-100 border-blue-500",
                          isTodayDate && "bg-blue-600 text-white"
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className={cn(
                          "text-sm font-medium mb-1 flex-shrink-0",
                          isTodayDate ? "text-white" : "text-gray-900",
                          !isSameMonth(day, currentDate) && "text-gray-400"
                        )}>
                          {format(day, "d")}
                        </div>
                        
                        {/* Show boletins for this day - Always 3 per day */}
                        <div className="flex-1 flex flex-col justify-start gap-0.5 min-h-0">
                          {dayBoletins.slice(0, 3).map((boletim, index) => {
                            const getTurno = (fechamento: string) => {
                              const hora = fechamento.split(' ')[1]?.split(':')[0];
                              if (hora === '11') return 'M';
                              if (hora === '17') return 'T';
                              if (hora === '23') return 'N';
                              return 'M';
                            };
                            
                            return (
                              <div
                                key={`${boletim.id}-${index}`}
                                className={cn(
                                  "text-xs px-0.5 py-0.5 rounded text-white text-center flex-shrink-0 leading-none",
                                  boletim.visualizado ? "bg-gray-400" : getStatusColor(boletim.status)
                                )}
                                style={{ fontSize: '9px', minHeight: '14px', lineHeight: '14px' }}
                              >
                                {getTurno(boletim.datahora_fechamento)} {boletim.numero_edicao}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Não visualizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                    <span>Visualizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                    <span>Visualizado por outro usuário da organização</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Boletins Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate 
                    ? `Boletins de ${format(selectedDate, "dd 'de' MMMM yyyy", { locale: ptBR })}`
                    : "Selecione uma data"
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Clique em um dia do calendário para ver os boletins</p>
                  </div>
                ) : selectedDateBoletins.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum boletim para este dia.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateBoletins.map((boletim) => {
                      const getTurnoCompleto = (fechamento: string) => {
                        const hora = fechamento.split(' ')[1]?.split(':')[0];
                        if (hora === '11') return 'Manhã';
                        if (hora === '17') return 'Tarde';
                        if (hora === '23') return 'Noite';
                        return 'Manhã';
                      };

                      return (
                        <Card key={boletim.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">Boletim #{boletim.numero_edicao}</h4>
                                <p className="text-xs text-gray-500">{getTurnoCompleto(boletim.datahora_fechamento)}</p>
                              </div>
                              <Badge 
                                variant={boletim.visualizado ? "secondary" : "default"}
                                className={cn(
                                  !boletim.visualizado && getStatusColor(boletim.status)
                                )}
                              >
                                {boletim.status}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>Licitações: {boletim.quantidade_licitacoes}</p>
                              <p>Acompanhamentos: {boletim.quantidade_acompanhamentos}</p>
                              <p>Fechamento: {new Date(boletim.datahora_fechamento).toLocaleString('pt-BR')}</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full mt-3">
                              <Eye className="h-4 w-4 mr-2" />
                              Acessar documento
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