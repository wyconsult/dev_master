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

export function BiddingCard({
  bidding,
  showFavoriteIcon = true,
}: BiddingCardProps) {
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
      return new Date(dateTime).toLocaleString("pt-BR");
    } catch {
      return dateTime;
    }
  };

  // Mapeamento dinâmico dos campos de datahora
  const dateFields: { key: keyof Bidding; label: string }[] = [
    { key: "datahora_abertura", label: "Abertura" },
    { key: "datahora_documento", label: "Documento" },
    { key: "datahora_retirada", label: "Retirada" },
    { key: "datahora_visita",   label: "Visita" },
    { key: "datahora_prazo",    label: "Prazo" },
  ];

  // Filtra apenas os que vierem preenchidos
  const dateEntries = dateFields
    .map(({ key, label }) => ({
      label,
      date: bidding[key] as string | null,
    }))
    .filter((entry) => entry.date);

  const handleFavoriteClick = () => {
    if (user) toggleFavorite(bidding.id, isFavorite);
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
      <CardContent className="p-0 relative overflow-visible">
        {/* Cabeçalho com gradiente, status e favorito */}
        <div
          className={cn(
            "w-full h-10 flex justify-between items-center px-4 rounded-t-lg",
            // gradiente mais escuro em dois tons de verde
            "bg-gradient-to-r from-green-700 to-green-500"
          )}
        >
          <span
            className={cn(
              "inline-block rounded font-semibold text-white text-xs sm:text-sm px-3 py-1",
              getStatusColor(displayStatus)
            )}
          >
            {displayStatus}
          </span>

          {showFavoriteIcon && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              onClick={handleFavoriteClick}
              className={cn(
                "transition-colors flex-shrink-0",
                isFavorite
                  ? "text-white fill-current hover:text-white/80"
                  : "text-white/80 hover:text-white"
              )}
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="p-4 pt-6 space-y-3 text-sm">
          {/* Objeto */}
          <p className="text-gray-900">
            <span className="font-semibold">Objeto:</span> {bidding.objeto}
          </p>

          {/* Datas dinâmicas, sem título fixo */}
          <div className="space-y-1">
            {dateEntries.length > 0 ? (
              dateEntries.map(({ label, date }) => (
                <div key={label}>
                  <span className="text-gray-700">
                    <strong>Data {label}:</strong> {formatDateTime(date!)}
                  </span>
                </div>
              ))
            ) : (
              <div>
                <span className="text-gray-700">-</span>
              </div>
            )}
          </div>

          {/* Edital e Nº Controle */}
          <div className="flex justify-between">
            <span className="text-gray-700">
              <strong>Edital:</strong> {bidding.edital}
            </span>
            <span className="text-gray-700">
              <strong>Nº Controle:</strong> {bidding.conlicitacao_id}
            </span>
          </div>

          {/* Órgão e Status da Sessão */}
          <div className="flex justify-between flex-wrap items-start gap-2">
            <span className="text-gray-700 max-w-full">
              <strong>Órgão:</strong>{" "}
              {bidding.orgao_codigo
                ? `${bidding.orgao_codigo} - ${bidding.orgao_nome}`
                : bidding.orgao_nome}
            </span>
            <span className="text-gray-700 whitespace-nowrap flex-shrink-0">
              <strong>Status da Sessão:</strong> {displayStatus}
            </span>
          </div>

          {/* Cidade e Link */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              <strong>Cidade:</strong> {bidding.orgao_cidade} -{" "}
              {bidding.orgao_uf}
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
