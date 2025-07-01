import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { 
  FileText, 
  Gavel, 
  Heart, 
  TrendingUp, 
  Clock, 
  Building,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Bidding, Boletim, Filtro } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  // Buscar dados reais da API
  const { data: filtros = [], isLoading: isLoadingFiltros } = useQuery<Filtro[]>({
    queryKey: ["/api/filtros"],
  });

  const { data: biddings = [], isLoading: isLoadingBiddings } = useQuery<Bidding[]>({
    queryKey: ["/api/biddings"],
  });

  const { data: boletins = [], isLoading: isLoadingBoletins } = useQuery<Boletim[]>({
    queryKey: ["/api/boletins"],
  });

  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery<Bidding[]>({
    queryKey: ["/api/favorites", user?.id],
    enabled: !!user?.id,
  });

  // Cálculos baseados em dados reais
  const totalLicitacoes = biddings.length;
  const licitacoesAtivas = biddings.filter(b => b.situacao === "NOVA" || b.situacao === "ATIVA").length;
  const editaisRecentes = biddings.filter(b => {
    if (!b.datahora_abertura) return false;
    try {
      const hoje = new Date();
      const dataAbertura = new Date(b.datahora_abertura);
      const diffTime = hoje.getTime() - dataAbertura.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7; // Últimos 7 dias
    } catch {
      return false;
    }
  }).length;
  
  const orgaosUnicos = new Set(biddings.map(b => b.orgao_nome)).size;
  const totalBoletins = boletins.length;
  const boletinsNaoVisualizados = boletins.filter(b => !b.visualizado).length;
  const totalFavoritos = favorites.length;

  const dashboardCards = [
    {
      title: "Boletins",
      description: "Visualize e gerencie boletins de licitações",
      icon: FileText,
      link: "/boletins",
      color: "bg-blue-500 hover:bg-blue-600",
      count: isLoadingBoletins ? "..." : `${boletinsNaoVisualizados} novos`
    },
    {
      title: "Licitações",
      description: "Explore todas as licitações disponíveis",
      icon: Gavel,
      link: "/biddings",
      color: "bg-green-500 hover:bg-green-600",
      count: isLoadingBiddings ? "..." : `${licitacoesAtivas} ativas`
    },
    {
      title: "Favoritos",
      description: "Acesse suas licitações favoritas",
      icon: Heart,
      link: "/favorites",
      color: "bg-red-500 hover:bg-red-600",
      count: isLoadingFavorites ? "..." : `${totalFavoritos} salvos`
    }
  ];

  const statsCards = [
    {
      title: "Licitações Ativas",
      value: isLoadingBiddings ? "..." : licitacoesAtivas.toString(),
      change: isLoadingBiddings ? "..." : `${totalLicitacoes} total`,
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Editais Recentes",
      value: isLoadingBiddings ? "..." : editaisRecentes.toString(),
      change: "Últimos 7 dias",
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Órgãos Monitorados",
      value: isLoadingBiddings ? "..." : orgaosUnicos.toString(),
      change: isLoadingFiltros ? "..." : `${filtros.length} filtros`,
      icon: Building,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao LicitaTraker, {user?.email}
          </h1>
          <p className="text-gray-600">
            Gerencie suas licitações e boletins em um só lugar
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className={`text-sm ${stat.color} font-medium`}>
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {dashboardCards.map((card, index) => (
            <Link key={index} href={card.link}>
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <CardContent className="p-8 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${card.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon className="h-8 w-8" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {card.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4">
                    {card.description}
                  </p>
                  
                  <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                    {card.count}
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      variant="ghost" 
                      className="group-hover:bg-gray-100 transition-colors"
                    >
                      Acessar →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>


      </div>
    </div>
  );
}