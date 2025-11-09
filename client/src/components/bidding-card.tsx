import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, ArrowRight, FileText, X, Mail, AlertCircle } from "lucide-react";
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
  const [showDocumentErrorDialog, setShowDocumentErrorDialog] = useState(false);
  const { user } = useAuth();
  const { toggleFavorite, isLoading } = useFavorites();

  const { data: favoriteStatus } = useQuery({
    queryKey: [`/api/favorites/${user?.id}/${bidding.id}`],
    enabled: !!user && showFavoriteIcon,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the result (cacheTime renamed to gcTime in v5)
  });

  const isFavorite = (favoriteStatus as any)?.isFavorite || showCategorization; // In favorites page, always show as favorited

  // Status já vem expandido do backend - não precisa mais de expansão no frontend

  const getStatusColor = (status: string) => {
    const expandedStatus = status?.toUpperCase() || "NOVA"; // Status já vem expandido do backend
    
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

  // Preferir dados editados (favoritos) quando disponíveis
  const displayUf = favoriteData?.uf || bidding.orgao_uf;
  const displayCodigoUasg = favoriteData?.codigoUasg || bidding.orgao_codigo;
  const displayValorEstimado = (() => {
    if (favoriteData?.valorEstimado) {
      try {
        const clean = favoriteData.valorEstimado.toString().replace(/[^\d,.]/g, '');
        let normalized = clean;
        if (normalized.includes('.') && normalized.includes(',')) {
          normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else if (normalized.includes('.') && !normalized.includes(',')) {
          const parts = normalized.split('.');
          if (parts.length === 2 && parts[1].length === 3) {
            normalized = normalized.replace('.', '');
          }
        }
        const num = parseFloat(normalized);
        if (!isNaN(num)) {
          return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return favoriteData.valorEstimado;
      } catch {
        return favoriteData.valorEstimado;
      }
    }
    if (bidding.valor_estimado) {
      const num = typeof bidding.valor_estimado === 'number' 
        ? bidding.valor_estimado 
        : parseFloat(bidding.valor_estimado.toString());
      if (!isNaN(num)) {
        return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return bidding.valor_estimado?.toString() || '--';
    }
    return '--';
  })();

  // Logs removidos para produção

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

    // Verificar se é um link inválido que deve mostrar o popup
    const isInvalidLink = !documentLink || 
      documentLink.trim() === "" || 
      documentLink.includes("auth=teste") || 
      documentLink === "https://consultaonline.conlicitacao.com.br" ||
      documentLink === "https://consultaonline.conlicitacao.com.br/" ||
      documentLink.includes("/public/api/download?auth=") && documentLink.includes("undefined") ||
      bidding.documento_url === "" ||
      bidding.documento_url === null ||
      bidding.documento_url === undefined;

    // Logs removidos para produção

    if (isInvalidLink) {
      // Mostrar popup de erro ao invés de abrir link inválido
      setShowDocumentErrorDialog(true);
    } else {
      // Abrir link válido normalmente
      window.open(documentLink, "_blank", "noopener,noreferrer");
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
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-black p-3 md:p-4 relative border-t-2 border-b-2 border-gray-400">
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
              {bidding.situacao || "NOVA"}
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
              <strong>Órgão:</strong> {displayCodigoUasg ? `${displayCodigoUasg} - ${bidding.orgao_nome}` : bidding.orgao_nome}
            </span>
            <span className="text-gray-700">
              <strong>Valor Estimado:</strong> {displayValorEstimado}
            </span>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
              <span className="text-gray-700">
                <strong>Cidade:</strong> {bidding.orgao_cidade} - {displayUf}
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
                Acessar Edital
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

            {/* Campos categorizados visíveis quando presentes */}
            {(favoriteData?.site || favoriteData?.fornecedor) && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                {favoriteData?.site && (
                  <span><strong>Site:</strong> {favoriteData.site}</span>
                )}
                {favoriteData?.fornecedor && (
                  <span><strong>Fornecedor:</strong> {favoriteData.fornecedor}</span>
                )}
              </div>
            )}
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

      {/* Dialog de Erro de Documento */}
      <Dialog open={showDocumentErrorDialog} onOpenChange={setShowDocumentErrorDialog}>
        <DialogContent className="max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              Edital Não Localizado
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="text-center space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Edital Não Localizado, envie um e-mail para{' '}
                <a 
                  href="mailto:licitacao@jlgconsultoria.com.br" 
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  licitacao@jlgconsultoria.com.br
                </a>
                {' '}solicitando o mesmo.
              </p>
              
              <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  licitacao@jlgconsultoria.com.br
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center pt-4 border-t border-gray-100">
            <Button
              onClick={() => setShowDocumentErrorDialog(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6"
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
