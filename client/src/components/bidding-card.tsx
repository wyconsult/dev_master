import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import { type Bidding } from "@shared/schema";

import { cn } from "@/lib/utils";

interface BiddingCardProps {
  bidding: Bidding;
  showFavoriteIcon?: boolean;
}

export function BiddingCard({ bidding, showFavoriteIcon = true }: BiddingCardProps) {

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
      className="hover:shadow-md transition-shadow border border-gray-200 bg-white overflow-hidden"
    >
      {/* Header com gradiente verde */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <p className="text-sm font-medium leading-tight">
              <span className="font-semibold">Objeto:</span> {bidding.objeto}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status badge */}
            <div
              className={cn(
                "rounded text-white text-xs font-bold px-3 py-1",
                getStatusColor(bidding.situacao || "")
              )}
              style={{
                minWidth: "70px",
                textAlign: "center",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {expandTruncatedStatus(bidding.situacao || "")}
            </div>
            {showFavoriteIcon && (
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-white hover:bg-white/20"
              >
                <Heart className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4">

        {/* Datas - seção destacada */}
        {datesInfo.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="font-semibold text-gray-800 mb-2 text-sm">Datas:</div>
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
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <span className="text-gray-700">
              <strong>Edital:</strong> {bidding.edital}
            </span>
            <span className="text-gray-700">
              <strong>Nº ConLicitação:</strong> {bidding.conlicitacao_id}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <span className="text-gray-700">
              <strong>Órgão:</strong> {bidding.orgao_codigo ? `${bidding.orgao_codigo} - ${bidding.orgao_nome}` : bidding.orgao_nome}
              {" | "}
              <strong>Status:</strong> {expandTruncatedStatus(bidding.situacao || "")}
            </span>
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
        </div>
      </CardContent>
    </Card>
  );
}
