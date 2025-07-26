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
    const normalizedStatus = status.toString().toUpperCase();
    
    switch (normalizedStatus) {
      case "NOVA":
        return "bg-green-500";
      case "ABERTA":
        return "bg-blue-500";
      case "EM_ANALISE":
      case "EM ANÁLISE":
        return "bg-yellow-500";
      case "URGENTE":
        return "bg-red-500";
      case "PRORROGADA":
        return "bg-orange-500";
      case "ALTERADA":
        return "bg-purple-500";
      case "FINALIZADA":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "-";
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("pt-BR");
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
    let documentLink = "";

    if (bidding.documento_url) {
      documentLink = bidding.documento_url.startsWith("http")
        ? bidding.documento_url
        : `${baseUrl}${bidding.documento_url}`;
    } else if (bidding.link_edital) {
      documentLink = bidding.link_edital;
    }

    if (documentLink && documentLink.trim() !== "") {
      window.open(documentLink, "_blank", "noopener,noreferrer");
    } else if (bidding.conlicitacao_id) {
      const url = `${baseUrl}/licitacao/visualizar/${bidding.conlicitacao_id}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const searchUrl = `${baseUrl}/busca?q=${encodeURIComponent(bidding.edital || "")}`;
      window.open(searchUrl, "_blank", "noopener,noreferrer");
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
                className={cn("h-4 w-4", isFavorite && "fill-current")}
              />
            </Button>
          )}
        </div>

        {/* Status badge */}
        <div className="flex justify-end mb-3">
          <div
            className={cn(
              "rounded text-white",
              getStatusColor(bidding.situacao || "")
            )}
            style={{
              padding: "8px 16px",
              minWidth: "100px",
              width: "auto",
              maxWidth: "none",
              whiteSpace: "nowrap",
              overflow: "visible",
              textOverflow: "clip",
              wordWrap: "normal",
              wordBreak: "keep-all",
              display: "inline-block",
              boxSizing: "border-box",
              fontSize: "12px",
              fontWeight: "bold",
              textAlign: "center",
              lineHeight: "1.3",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
          >
            {bidding.situacao?.toUpperCase() || "NOVA"}
          </div>
        </div>

        {/* Main info grid */}
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
              <strong>Nº ConLicitação:</strong> {bidding.conlicitacao_id}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-700">
              <strong>Órgão:</strong> {bidding.orgao_codigo ? `${bidding.orgao_codigo} - ${bidding.orgao_nome}` : bidding.orgao_nome}
            </span>
            <span className="text-gray-700">
              <strong>Status da Sessão:</strong> {bidding.situacao}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              <strong>Cidade:</strong> {bidding.orgao_cidade} - {bidding.orgao_uf}
            </span>
            <a
              href="#"
              className="text-blue-600 hover:text-blue-800 underline text-sm cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick();
              }}
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
