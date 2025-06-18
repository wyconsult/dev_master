import { useEffect, useState, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

interface Boletim {
  id: number;
  titulo: string;
  data: string;
  periodo: "manha" | "tarde" | "noite";
}

export default function Boletins() {
  const { user } = useAuth();
  const [boletins, setBoletins] = useState<Boletim[]>([]);
  const [visualizados, setVisualizados] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetch("/api/boletins")
      .then(res => res.json())
      .then(setBoletins)
      .catch(err => console.error("Erro ao buscar boletins", err));
  }, []);

  const formatDate = (d: Date) => format(d, "yyyy-MM-dd");
  const boletinsPorData = useMemo(() => {
    const map: Record<string, Boletim[]> = {};
    for (const b of boletins) {
      if (!map[b.data]) map[b.data] = [];
      map[b.data].push(b);
    }
    return map;
  }, [boletins]);

  const marcarComoVisualizado = (data: string, periodo: string) => {
    setVisualizados(prev => ({
      ...prev,
      [data]: [...new Set([...(prev[data] || []), periodo])],
    }));
  };

  const getCor = (data: string, periodo: string) =>
    (visualizados[data] || []).includes(periodo)
      ? "bg-gray-400 text-white"
      : "bg-green-500 text-white";

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Calendário */}
          <Card className="md:col-span-3 p-6">
            <h2 className="text-3xl font-bold mb-4">Calendário</h2>
            <Calendar
              className="w-full"
              locale="pt-BR"
              value={selectedDate}
              onChange={date => date instanceof Date && setSelectedDate(date)}
              tileContent={props => {
                const dia = formatDate(props.date);
                const boletinsDia = boletinsPorData[dia] || [];
                return (
                  <div className="mt-1 text-[10px] space-y-0.5">
                    {boletinsDia.map(b => (
                      <div
                        key={b.id}
                        className={`rounded px-1 ${getCor(dia, b.periodo)} cursor-pointer truncate`}
                        title={b.titulo}
                        onClick={e => {
                          e.stopPropagation();
                          marcarComoVisualizado(dia, b.periodo);
                        }}
                      >
                        {b.titulo}
                      </div>
                    ))}
                  </div>
                );
              }}
              tileClassName={({ date }) =>
                formatDate(date) === formatDate(new Date())
                  ? "border border-blue-500 rounded-md"
                  : ""
              }
            />
            <div className="flex gap-6 mt-6 text-sm">
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 bg-green-500 rounded-sm"></span>
                <span>Não visualizado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 bg-gray-400 rounded-sm"></span>
                <span>Visualizado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 bg-blue-500 rounded-sm"></span>
                <span>Visualizado por outro usuário da organização</span>
              </div>
            </div>
          </Card>

          {/* Boletins do dia */}
          <Card className="md:col-span-2 p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Boletins de {format(selectedDate, "dd 'de' MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="space-y-4">
              {(boletinsPorData[formatDate(selectedDate)] || []).map(b => (
                <div
                  key={b.id}
                  className={`p-3 rounded shadow ${getCor(b.data, b.periodo)} cursor-pointer w-full`}
                  onClick={() => marcarComoVisualizado(b.data, b.periodo)}
                >
                  <p className="font-medium text-base">{b.titulo}</p>
                  <p className="text-sm">Período: {b.periodo}</p>
                </div>
              ))}
              {!(boletinsPorData[formatDate(selectedDate)] || []).length && (
                <p className="text-gray-500">Nenhum boletim para este dia.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
