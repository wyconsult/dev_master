import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, FileText } from "lucide-react";
import { type Bidding } from "@shared/schema";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
// import { FavoriteCategorization } from "@/components/favorite-categorization";
import { TabulationDialog } from "./tabulation-dialog";

interface BiddingCardProps {
  bidding: Bidding;
  showFavoriteIcon?: boolean;
  showCategorization?: boolean;
  favoriteData?: {
    category?: string;
    customCategory?: string; 
    notes?: string;
    uf?: string;
    codigoUasg?: string;
    valorEstimado?: string;
    fornecedor?: string;
    site?: string;
  };
}

export function BiddingCard({ 
  bidding, 
  showFavoriteIcon = true, 
  showCategorization = false,
  favoriteData 
}: BiddingCardProps) {
  const [showTabulationDialog, setShowTabulationDialog] = useState(false);
  const { user } = useAuth();
  const { toggleFavorite, isLoading } = useFavorites();

  const { data: favoriteStatus } = useQuery<{ isFavorite: boolean }>({
    queryKey: [`/api/favorites/${user?.id}/${bidding.id}`],
    enabled: !!user && showFavoriteIcon,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache the result
  });

  const isFavorite = favoriteStatus?.isFavorite || showCategorization; // In favorites page, always show as favorited

  // Função para expandir status truncados da API
  const expandTruncatedStatus = (status: string) => {
    if (!status) return "NOVA";
    
    const truncatedMappings: { [key: string]: string } = {
      "URGEN": "URGENTE",
      "RET": "RETIFICAÇÃO", 
      "ADIA": "ADIADA",
      "PRO": "PRORROGADA",
      "ALTER": "ALTERADA",
      "REAB": "REABERTA",
      "CANCE": "CANCELADA",
      "SUS": "SUSPENSA",
      "REVO": "REVOGADA",
      "ABERTA": "ABERTA", 
      "NOVA": "NOVA",
      "EM_ANAL": "EM ANÁLISE",
      "PRORROG": "PRORROGADA",
      "ALTERA": "ALTERADA",
      "FINALI": "FINALIZADA",
      "SUSP": "SUSPENSA",
      "CANCEL": "CANCELADA",
      "DESERTA": "DESERTA",
      "FRACAS": "FRACASSADA"
    };

    const upperStatus = status.toString().toUpperCase().trim();
    
    // Procura por correspondência exata primeiro
    if (truncatedMappings[upperStatus]) {
      return truncatedMappings[upperStatus];
    }
    
    // Procura por correspondência parcial (status truncado)
    for (const [truncated, full] of Object.entries(truncatedMappings)) {
      if (truncated.startsWith(upperStatus) || upperStatus.startsWith(truncated)) {
        return full;
      }
    }
    
    return upperStatus;
  };

  const getStatusColor = (status: string) => {
    const expandedStatus = expandTruncatedStatus(status);
    
    switch (expandedStatus) {
      case "NOVA":
        return "bg-green-500";           // Verde
      case "ABERTA":
        return "bg-blue-500";            // Azul
      case "REABERTA":
        return "bg-cyan-500";            // Ciano
      case "EM ANÁLISE":
        return "bg-yellow-500";          // Amarelo
      case "URGENTE":
        return "bg-red-500";             // Vermelho
      case "PRORROGADA":
        return "bg-orange-500";          // Laranja
      case "ADIADA":
        return "bg-amber-500";           // Âmbar
      case "ALTERADA":
        return "bg-purple-500";          // Roxo
      case "RETIFICAÇÃO":
        return "bg-violet-500";          // Violeta
      case "SUSPENSA":
        return "bg-gray-500";            // Cinza
      case "CANCELADA":
        return "bg-slate-600";           // Cinza escuro
      case "REVOGADA":
        return "bg-stone-600";           // Pedra
      case "FINALIZADA":
        return "bg-zinc-500";            // Zinco
      case "DESERTA":
        return "bg-red-600";             // Vermelho escuro
      case "FRACASSADA":
        return "bg-rose-600";            // Rosa escuro
      default:
        return "bg-gray-400";            // Cinza claro padrão
    }
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return null;
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("pt-BR");
    } catch {
      return dateTime;
    }
  };

  const formatDateTimeShort = (dateTime: string | null) => {
    if (!dateTime) return null;
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateTime;
    }
  };

  const getDatesInfo = () => {
    const dates = [
      { label: "Abertura", value: formatDateTimeShort(bidding.datahora_abertura) },
      { label: "Documento", value: formatDateTimeShort(bidding.datahora_documento) },
      { label: "Retirada", value: formatDateTimeShort(bidding.datahora_retirada) },
      { label: "Visita", value: formatDateTimeShort(bidding.datahora_visita) },
      { label: "Prazo", value: formatDateTimeShort(bidding.datahora_prazo) },
    ].filter(date => date.value !== null);

    return dates;
  };

  const handleFavoriteClick = () => {
    if (user) {
      if (!isFavorite) {
        // Se não é favorito, apenas abre a tabulação (não adiciona aos favoritos ainda)
        setShowTabulationDialog(true);
      } else {
        // Se já é favorito, remove dos favoritos
        toggleFavorite(bidding.id, isFavorite);
      }
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

  const datesInfo = getDatesInfo();

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow border border-gray-200 bg-white overflow-hidden",
        showFavoriteIcon && isFavorite && "border-l-4 border-l-blue-500"
      )}
    >
      {/* Header com gradiente verde */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-black p-3 md:p-4 relative">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-0">
          <div className="flex-1 pr-0 md:pr-2">
            <p className="text-sm md:text-base font-medium leading-tight">
              <span className="font-semibold">Objeto:</span> {bidding.objeto}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 justify-between md:justify-start">
            {/* Status badge */}
            <div
              className={cn(
                "rounded text-white text-xs font-bold px-2 md:px-3 py-1",
                getStatusColor(bidding.situacao || "")
              )}
              style={{
                minWidth: "60px",
                textAlign: "center",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {expandTruncatedStatus(bidding.situacao || "")}
            </div>
            {/* Favorite icon */}
            {showFavoriteIcon && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                disabled={isLoading}
                className={cn(
                  "transition-colors p-1 h-auto",
                  isFavorite 
                    ? "text-red-500 hover:text-red-600 hover:bg-red-50" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                )}
              >
                <Heart
                  className={cn(
                    "h-3 w-3 md:h-4 md:w-4 transition-colors", 
                    isFavorite && "fill-current text-red-500"
                  )}
                />
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-3 md:p-4">

        {/* Datas - seção destacada */}
        {datesInfo.length > 0 && (
          <div className="mb-3 md:mb-4 p-2 bg-gray-50 rounded-lg border-gray-200 border max-w-xs">
            <div className="font-semibold text-gray-800 mb-1 text-xs md:text-sm">Datas:</div>
            <div className="grid grid-cols-1 gap-1 text-sm">
              {datesInfo.map((date, index) => (
                <div key={index} className="text-gray-700">
                  <span className="font-medium">{date.label}:</span> {date.value}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main info grid */}
        <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            <span className="text-gray-700">
              <strong>Edital:</strong> {bidding.edital}
            </span>
            <span className="text-gray-700">
              <strong>Nº Controle:</strong> {bidding.conlicitacao_id}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <span className="text-gray-700">
              <strong>Órgão:</strong> {bidding.orgao_codigo ? `${bidding.orgao_codigo} - ${bidding.orgao_nome}` : bidding.orgao_nome}
            </span>
            <span className="text-gray-700">
              <strong>Valor Estimado:</strong> {bidding.valor_estimado 
                ? `R$ ${bidding.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : '--'
              }
            </span>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
              <span className="text-gray-700">
                <strong>Cidade:</strong> {bidding.orgao_cidade} - {bidding.orgao_uf}
              </span>
              <a
                href="#"
                className="text-blue-600 hover:text-blue-800 underline text-xs md:text-sm cursor-pointer font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick();
                }}
                style={{ userSelect: "none" }}
              >
                Acessar documento →
              </a>
            </div>
          </div>
        </div>

        {/* Categorização - apenas em favoritos */}
        {showCategorization && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTabulationDialog(true)}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center mr-2">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Editar Categorização
                </Button>
              </div>
              
              {favoriteData?.notes && (
                <div className="flex items-center gap-1 text-gray-500">
                  <FileText className="h-3 w-3" />
                  <span className="text-xs">Com anotações</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialog de Tabulação */}
      <TabulationDialog
        bidding={bidding}
        isOpen={showTabulationDialog}
        onClose={() => setShowTabulationDialog(false)}
        currentCategory={favoriteData?.category}
        currentCustomCategory={favoriteData?.customCategory}
        currentNotes={favoriteData?.notes}
        currentSite={favoriteData?.site}
        currentUf={favoriteData?.uf}
        currentCodigoUasg={favoriteData?.codigoUasg}
        currentValorEstimado={favoriteData?.valorEstimado}
        currentFornecedor={favoriteData?.fornecedor}
      />
    </Card>
  );
}
