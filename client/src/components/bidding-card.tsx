import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
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

  // Normaliza “URGEN” para “URGENTE”
  const rawStatus = bidding.situacao?.toUpperCase() || "NOVA";
  const displayStatus = rawStatus === "URGEN" ? "URGENTE" : rawStatus;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NOVA": return "bg-green-500";
      case "ABERTA": return "bg-blue-500";
      case "EM_ANALISE":
      case "EM ANÁLISE": return "bg-yellow-500";
      case "URGENTE": return "bg-red-500";
      case "PRORROGADA": return "bg-orange-500";
      case "ALTERADA": return "bg-purple-500";
      case "FINALIZADA": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "-";
    try {
      return new Date(dateTime).toLocaleString("pt-BR");
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
    const baseUrl = "https://consultaonline.conlicitacao.com.br";
    let url = "";

    if (bidding.documento_url) {
      url = bidding.documento_url.startsWith("http")
        ? bidding.documento_url
        : baseUrl + bidding.documento_url;
    } else if (bidding.link_edital) {
      url = bidding.link_edital;
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (bidding.conlicitacao_id) {
      window.open(
        `${baseUrl}/licitacao/visualizar/${bidding.conlicitacao_id}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else {
      window.open(
        `${baseUrl}/busca?q=${encodeURIComponent(bidding.edital || "")}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow border border-gray-200 bg-white",
        showFavoriteIcon && isFavorite && "border-l-4 border-l-blue-500"
      )}
    >
      <CardContent className="p-4 relative overflow-visible">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <p className="text-sm text-gray-900 mb-1 flex-1">
            <span className="font-semibold">Objeto:</span> {bidding.objeto}
          </p>
          {showFavoriteIcon && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              onClick={handleFavoriteClick}
              className={cn(
                "transition-colors ml-2 flex-shrink-0",
                isFavorite ? "text-accent hover:text-accent/80" : "text-gray-400 hover:text-accent"
              )}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </Button>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex justify-end mb-3">
          <span
            className={cn(
              "inline-block rounded font-semibold text-white text-xs sm:text-sm px-3 py-1 whitespace-nowrap",
              getStatusColor(displayStatus)
            )}
          >
            {displayStatus}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-700">
              <strong>Datas:</strong> {formatDateTime(bidding.datahora_abertura)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-700">
              <strong>Edital:</strong> {bidding.edital}
            </span>
            <span className="text-gray-700">
              <strong>Nº Controle:</strong> {bidding.conlicitacao_id}
            </span>
          </div>

          <div className="flex justify-between flex-wrap items-start gap-2">
            <span className="text-gray-700 max-w-full">
              <strong>Órgão:</strong> {bidding.orgao_nome}
            </span>
            <span className="text-gray-700 whitespace-nowrap flex-shrink-0">
              <strong>Status da Sessão:</strong> {displayStatus}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              <strong>Cidade:</strong> {bidding.orgao_cidade} - {bidding.orgao_uf}
            </span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick();
              }}
              className="text-blue-600 hover:text-blue-800 underline text-sm cursor-pointer"
              style={{ userSelect: "none" }}
            >
              <strong>Link:</strong> Acessar documento
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
