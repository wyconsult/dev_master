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

  const { data: favoriteStatus } = useQuery({
    queryKey: [`/api/favorites/${user?.id}/${bidding.id}`],
    enabled: !!user && showFavoriteIcon,
  });

  const isFavorite = favoriteStatus?.isFavorite || false;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "em andamento":
        return "bg-green-100 text-green-800";
      case "agendada":
        return "bg-blue-100 text-blue-800";
      case "publicada":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleFavoriteClick = () => {
    if (user) {
      toggleFavorite(bidding.id, isFavorite);
    }
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      showFavoriteIcon && isFavorite && "border-l-4 border-l-accent"
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {bidding.title}
            </h3>
            <p className="text-sm text-gray-600">
              {bidding.organization}
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
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Objeto:</span>
            <span className="text-sm font-medium text-gray-900">
              {bidding.object}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Modalidade:</span>
            <span className="text-sm font-medium text-gray-900">
              {bidding.modality}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Valor Estimado:</span>
            <span className="text-sm font-medium text-success">
              {bidding.estimatedValue}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Data de Abertura:</span>
            <span className="text-sm font-medium text-gray-900">
              {bidding.openingDate}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            getStatusColor(bidding.status)
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
            {bidding.status}
          </span>
          <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
            Ver detalhes <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
