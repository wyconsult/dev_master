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

  // Nova API para contagem rápida (sem carregar todos os dados)
  const { data: biddingsCount = { count: 0 }, isLoading: isLoadingBiddingsCount } = useQuery<{count: number}>({
    queryKey: ["/api/biddings/count"],
  });

  const { data: boletinsResp = { boletins: [], total: 0 }, isLoading: isLoadingBoletins } = useQuery<{ boletins: Boletim[]; total: number }>({
    queryKey: ["/api/boletins"],
  });

  const { data: favoritesResp = { favorites: [], total: 0 }, isLoading: isLoadingFavorites } = useQuery<{ favorites: Bidding[]; total: number }>({
    queryKey: ["/api/favorites"],
    refetchOnWindowFocus: false, // Evitar refetch desnecessário ao focar na janela
    staleTime: 60000, // 1 minuto - dados de favoritos não mudam frequentemente
    refetchInterval: 30000, // Atualizar a cada 30 segundos - menos agressivo
    refetchOnMount: true,
  });

  // Cálculos baseados em dados reais da API  
  const totalLicitacoes = biddingsCount.count || 0;
  // Para estatísticas mais avançadas, usaremos estimativa baseada na contagem total
  const licitacoesAtivas = Math.round(totalLicitacoes * 0.3); // Estimativa: 30% das licitações estão ativas

  const boletins = boletinsResp.boletins || [];
  const totalBoletins = boletins.length;
  const boletinsNaoVisualizados = boletins.filter(b => !b.visualizado).length;
  const totalFavoritos = (favoritesResp.total ?? favoritesResp.favorites.length) || 0;

  const dashboardCards = [
    {
      title: "Boletins",
      description: "Visualize e gerencie os boletins",
      icon: FileText,
      link: "/boletins",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-700",
      hoverGradient: "hover:from-blue-600 hover:to-blue-800",
      count: isLoadingBoletins ? "..." : `${boletinsNaoVisualizados} novos`,
      bgPattern: "bg-blue-50"
    },
    {
      title: "Licitações",
      description: "Explore todas as licitações",
      icon: Gavel,
      link: "/biddings",
      gradient: "bg-gradient-to-br from-green-500 to-emerald-700",
      hoverGradient: "hover:from-green-600 hover:to-emerald-800",
      count: isLoadingBiddingsCount ? "..." : `${totalLicitacoes.toLocaleString()}`,
      bgPattern: "bg-green-50"
    },
    {
      title: "Favoritos",
      description: "Acesse suas licitações favoritas",
      icon: Heart,
      link: "/favorites",
      gradient: "bg-gradient-to-br from-red-500 to-pink-700",
      hoverGradient: "hover:from-red-600 hover:to-pink-800",
      count: isLoadingFavorites ? "..." : `${totalFavoritos} ${totalFavoritos === 1 ? 'salvo' : 'salvos'}`,
      bgPattern: "bg-red-50"
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 md:mb-12 text-center px-4">
          <div className="mb-4 md:mb-6">
            <img 
              src="/logo.jpeg" 
              alt="JLG Consultoria" 
              className="w-28 h-21 md:w-36 md:h-28 object-contain mx-auto"
            />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent mb-2 md:mb-3">
            Bem-vindo ao JLG Consultoria
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-1 md:mb-2">
            Olá, {user?.email?.split('@')[0]}! 👋
          </p>
          <p className="text-sm md:text-base text-gray-500">
            Gerencie suas licitações e boletins de forma inteligente
          </p>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 px-4">
          {dashboardCards.map((card, index) => (
            <Link key={index} href={card.link}>
              <Card className={`hover:shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2 transition-all duration-500 cursor-pointer group border-0 shadow-lg overflow-hidden ${card.bgPattern}/30 backdrop-blur-sm min-h-[320px]`}>
                <CardContent className="p-4 md:p-6 lg:p-8 text-center relative h-full flex flex-col justify-between">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full bg-gradient-to-br from-transparent to-black/10"></div>
                  </div>

                  <div className="flex flex-col items-center flex-grow">
                    <div className={`inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl ${card.gradient} ${card.hoverGradient} text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                      <card.icon className="h-8 w-8 md:h-10 md:w-10" />
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                      {card.title}
                    </h3>

                    <p className="text-sm md:text-base text-gray-600 mb-4 leading-relaxed">
                      {card.description}
                    </p>

                    <div className="inline-flex items-center justify-center px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/80 backdrop-blur-sm text-xs md:text-sm font-semibold text-gray-700 shadow-md border border-gray-200/50 mb-4">
                      {card.count}
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button 
                      variant="ghost" 
                      className="group-hover:bg-white/20 group-hover:backdrop-blur-sm transition-all duration-300 font-semibold text-xs md:text-sm w-full"
                    >
                      Acessar <span className="ml-1 md:ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
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