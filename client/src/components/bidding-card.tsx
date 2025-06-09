import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import { type Bidding } from "@shared/schema";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface BiddingCardProps {
  bidding: Bidding;
  showFavoriteIcon?: boolean;
}

export function BiddingCard({ bidding, showFavoriteIcon = true }: BiddingCardProps) {
  const { user } = useAuth();
  const { toggleFavorite, isLoading } = useFavorites();

  const { data: favoriteStatus } = useQuery<{ isFavorite: boolean }>({
    queryKey: [`/api/favorites/${user?.id}/${bidding.id}`],
    enabled: !!user && showFavoriteIcon,
  });

  const isFavorite = favoriteStatus?.isFavorite || false;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "nova":
        return "bg-green-500";
      case "aberta":
        return "bg-blue-500";
      case "em_analise":
        return "bg-yellow-500";
      case "urgente":
        return "bg-red-500";
      case "prorrogada":
        return "bg-orange-500";
      case "alterada":
        return "bg-purple-500";
      case "finalizada":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return "-";
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('pt-BR');
    } catch {
      return dateTime;
    }
  };

  const handleFavoriteClick = () => {
    if (user) {
      toggleFavorite(bidding.id, isFavorite);
    }
  };

  const handleLinkClick = () => {
    window.open(bidding.link_edital, '_blank');
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow border border-gray-200",
      showFavoriteIcon && isFavorite && "border-l-4 border-l-accent"
    )}>
      <CardContent className="p-4">
        {/* Header with favorite */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <p className="text-sm text-gray-900 mb-1">
              <span className="font-semibold">Objeto:</span> {bidding.objeto}
            </p>
          </div>
          {showFavoriteIcon && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteClick}
              disabled={isLoading}
              className={cn(
                "transition-colors ml-2 flex-shrink-0",
                isFavorite 
                  ? "text-accent hover:text-accent/80" 
                  : "text-gray-400 hover:text-accent"
              )}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isFavorite && "fill-current"
                )} 
              />
            </Button>
          )}
        </div>

        {/* Main info grid */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700"><strong>Datas:</strong> {formatDateTime(bidding.datahora_abertura)}</span>
            <span className={cn(
              "px-2 py-1 rounded text-xs font-medium text-white",
              getStatusColor(bidding.situacao)
            )}>
              {bidding.situacao}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-700"><strong>Edital:</strong> {bidding.edital}</span>
            <span className="text-gray-700"><strong>Nº ConLicitação:</strong> {bidding.conlicitacao_id}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-700"><strong>Órgão:</strong> {bidding.orgao}</span>
            <span className="text-gray-700"><strong>Status da Sessão:</strong> {bidding.situacao}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-700"><strong>Cidade:</strong> {bidding.cidade} - {bidding.uf}</span>
            <Button 
              variant="link" 
              size="sm" 
              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
              onClick={handleLinkClick}
            >
              <strong>Link:</strong> Acessar documento
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
