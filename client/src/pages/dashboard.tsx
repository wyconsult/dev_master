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
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Cálculos baseados em dados reais da API
  const totalLicitacoes = biddings.length;
  const licitacoesAtivas = biddings.filter(b => {
    const situacao = b.situacao?.toUpperCase();
    return situacao === "NOVA" || situacao === "ABERTA" || situacao === "ATIVA";
  }).length;
  
  const totalBoletins = boletins.length;
  const boletinsNaoVisualizados = boletins.filter(b => !b.visualizado).length;
  const totalFavoritos = favorites.length;

  const dashboardCards = [
    {
      title: "Boletins",
      description: "Visualize e gerencie boletins de licitações",
      icon: FileText,
      link: "/boletins",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      hoverGradient: "hover:from-blue-600 hover:to-blue-800",
      count: isLoadingBoletins ? "..." : `${boletinsNaoVisualizados} novos`,
      bgPattern: "bg-blue-50"
    },
    {
      title: "Licitações",
      description: "Explore todas as licitações disponíveis",
      icon: Gavel,
      link: "/biddings",
      gradient: "bg-gradient-to-br from-green-500 to-emerald-700",
      hoverGradient: "hover:from-green-600 hover:to-emerald-800",
      count: isLoadingBiddings ? "..." : `${licitacoesAtivas} ativas`,
      bgPattern: "bg-green-50"
    },
    {
      title: "Favoritos",
      description: "Acesse suas licitações favoritas",
      icon: Heart,
      link: "/favorites",
      gradient: "bg-gradient-to-br from-red-500 to-pink-700",
      hoverGradient: "hover:from-red-600 hover:to-pink-800",
      count: isLoadingFavorites ? "..." : `${totalFavoritos} salvos`,
      bgPattern: "bg-red-50"
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-6 shadow-lg">
            <Gavel className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent mb-3">
            Bem-vindo ao LicitaTraker
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Olá, {user?.email?.split('@')[0]}! 👋
          </p>
          <p className="text-gray-500">
            Gerencie suas licitações e boletins de forma inteligente
          </p>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {dashboardCards.map((card, index) => (
            <Link key={index} href={card.link}>
              <Card className={`hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group border-0 shadow-lg overflow-hidden ${card.bgPattern}/30 backdrop-blur-sm`}>
                <CardContent className="p-8 text-center relative">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full bg-gradient-to-br from-transparent to-black/10"></div>
                  </div>
                  
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${card.gradient} ${card.hoverGradient} text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                    <card.icon className="h-10 w-10" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {card.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {card.description}
                  </p>
                  
                  <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm text-sm font-semibold text-gray-700 shadow-md border border-gray-200/50">
                    {card.count}
                  </div>
                  
                  <div className="mt-8">
                    <Button 
                      variant="ghost" 
                      className="group-hover:bg-white/20 group-hover:backdrop-blur-sm transition-all duration-300 font-semibold"
                    >
                      Acessar <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
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