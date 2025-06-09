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
        return "bg-blue-100 text-blue-800";
      case "aberta":
        return "bg-green-100 text-green-800";
      case "em_analise":
        return "bg-yellow-100 text-yellow-800";
      case "finalizada":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      "hover:shadow-md transition-shadow",
      showFavoriteIcon && isFavorite && "border-l-4 border-l-accent"
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {bidding.edital}
              </h3>
              <span className="text-sm text-gray-500">
                (Nº ConLicitação: {bidding.conlicitacao_id})
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              {bidding.orgao}
            </p>
            <p className="text-xs text-gray-500">
              {bidding.cidade} - {bidding.uf}
            </p>
          </div>
          {showFavoriteIcon && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteClick}
              disabled={isLoading}
              className={cn(
                "transition-colors",
                isFavorite 
                  ? "text-accent hover:text-accent/80" 
                  : "text-gray-400 hover:text-accent"
              )}
            >
              <Heart 
                className={cn(
                  "h-5 w-5",
                  isFavorite && "fill-current"
                )} 
              />
            </Button>
          )}
        </div>
        
        <div className="space-y-3 mb-4">
          <div>
            <span className="text-sm text-gray-600">Objeto:</span>
            <p className="text-sm font-medium text-gray-900 mt-1 line-clamp-3">
              {bidding.objeto}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Data Abertura:</span>
              <p className="font-medium text-gray-900">
                {formatDateTime(bidding.datahora_abertura)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Código UASG:</span>
              <p className="font-medium text-gray-900">
                {bidding.codigo}
              </p>
            </div>
          </div>
          {bidding.valor_estimado && parseFloat(bidding.valor_estimado) > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Valor Estimado:</span>
              <span className="text-sm font-medium text-success">
                R$ {parseFloat(bidding.valor_estimado).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            getStatusColor(bidding.situacao)
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
            {bidding.situacao}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-blue-700"
            onClick={handleLinkClick}
          >
            Ver edital <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
