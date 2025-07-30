import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Heart, HeartOff, Star, StarOff, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Bidding, TipoObjeto, Site } from "@shared/schema";

// Dados de referência baseados na especificação
const Tab_Alimentacao: TipoObjeto[] = [
  { id: 1, tipo_objeto: "Alimentação", objeto: "Auxiliar de Cozinha" },
  { id: 2, tipo_objeto: "Alimentação", objeto: "Coffe Break/Almoço/Jantar" },
  { id: 3, tipo_objeto: "Alimentação", objeto: "Concessão de Espaço" },
  { id: 4, tipo_objeto: "Concessão", objeto: "Concessões de Restaurante" },
  { id: 5, tipo_objeto: "Concessão", objeto: "Exploração de Restaurante" },
  { id: 6, tipo_objeto: "Alimentação", objeto: "Fornecimento de Alimentação" },
  { id: 7, tipo_objeto: "Alimentação", objeto: "Fornecimento de Refeições" },
  { id: 8, tipo_objeto: "Alimentação", objeto: "Kit Lanche" },
  { id: 9, tipo_objeto: "Alimentação", objeto: "Kit lanche e Refeição" },
  { id: 10, tipo_objeto: "Mão de Obra", objeto: "Mão de obra área de Nutrição" },
];

const Tab_Limpeza: TipoObjeto[] = [
  { id: 1, tipo_objeto: "Mão de Obra", objeto: "Apoio adm e copeiragem" },
  { id: 2, tipo_objeto: "Mão de Obra", objeto: "Apoio adm e Limpeza" },
  { id: 3, tipo_objeto: "Mão de Obra", objeto: "Apoio adm" },
  { id: 4, tipo_objeto: "Mão de Obra", objeto: "Copa, cozinha e limpeza" },
  { id: 5, tipo_objeto: "Mão de Obra", objeto: "Serviço de Copeiragem" },
  { id: 6, tipo_objeto: "Mão de Obra", objeto: "Serviço de limpeza" },
  { id: 7, tipo_objeto: "Mão de Obra", objeto: "Mão de Obra Diversos" },
];

const Sites_Referencias: Site[] = [
  { id: 12, tipo: "Internet", site: "https://www.comprasnet.ba.gov.br" },
  { id: 34, tipo: "Internet", site: "https://egov.paradigmabs.com.br/sesc_senac_rs" },
  { id: 36, tipo: "Internet", site: "https://parceriassociais.sp.gov.br/OSC/OSC" },
  { id: 37, tipo: "Internet", site: "https://apoiocotacoes.com.br" },
  { id: 46, tipo: "Internet", site: "https://licitacoes-e.com.br" },
  { id: 47, tipo: "Internet", site: "https://licitacoes-e2.bb.com.br" },
];

interface FavoritesModuleProps {
  licitacao: Bidding;
  onUpdate?: () => void;
}

export function FavoritesModule({ licitacao, onUpdate }: FavoritesModuleProps) {
  // Estados do componente
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTipoObjeto, setSelectedTipoObjeto] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [filteredTipoObjeto, setFilteredTipoObjeto] = useState<TipoObjeto[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [searchTipoObjeto, setSearchTipoObjeto] = useState("");
  const [searchSite, setSearchSite] = useState("");
  const [newTipoObjeto, setNewTipoObjeto] = useState("");
  const [newSite, setNewSite] = useState("");
  const [showNewTipoObjeto, setShowNewTipoObjeto] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);
  const [showFicha, setShowFicha] = useState(false);

  const queryClient = useQueryClient();

  // Garante valores padrão para licitação
  const safeLicitacao: Bidding = {
    ...licitacao,
  };

  // Query para buscar favoritos do usuário
  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
  });

  // Verificar se a licitação atual está favoritada
  const isFavorite = favorites.some((fav) => fav.biddingId === safeLicitacao.id);
  const currentFavorite = favorites.find((fav) => fav.biddingId === safeLicitacao.id);

  // Função segura para comparação de URLs
  const compareUrls = useCallback((url1: string, url2: string) => {
    if (!url1 || !url2) return false;

    const normalize = (url: string) => {
      return url
        .toString()
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/+$/, "")
        .toLowerCase();
    };

    const cleanUrl1 = normalize(url1);
    const cleanUrl2 = normalize(url2);

    return cleanUrl1.includes(cleanUrl2) || cleanUrl2.includes(cleanUrl1);
  }, []);

  // Filtrar tipos de objeto baseado na busca ou objeto da licitação
  useEffect(() => {
    const allTipoObjeto = [...Tab_Alimentacao, ...Tab_Limpeza];

    let filtered = allTipoObjeto;

    if (safeLicitacao.objeto && safeLicitacao.objeto.trim() !== "") {
      filtered = allTipoObjeto.filter(
        (item) =>
          item.objeto.toLowerCase().includes(
            safeLicitacao.objeto.toLowerCase()
          ) ||
          safeLicitacao.objeto.toLowerCase().includes(item.objeto.toLowerCase())
      );
    }

    if (searchTipoObjeto && searchTipoObjeto.trim() !== "") {
      filtered = allTipoObjeto.filter(
        (item) =>
          item.objeto.toLowerCase().includes(searchTipoObjeto.toLowerCase()) ||
          item.tipo_objeto.toLowerCase().includes(
            searchTipoObjeto.toLowerCase()
          )
      );
    }

    setFilteredTipoObjeto(filtered);
  }, [safeLicitacao.objeto, searchTipoObjeto]);

  // Filtrar sites baseado na busca ou site da licitação
  useEffect(() => {
    const siteFilter = safeLicitacao.orgao_site || safeLicitacao.link_edital || "";

    let filtered = Sites_Referencias;

    if (siteFilter.trim() !== "") {
      filtered = Sites_Referencias.filter((item) => {
        if (!item?.site) return false;
        return (
          compareUrls(item.site, siteFilter) ||
          compareUrls(siteFilter, item.site)
        );
      });
    }

    if (searchSite && searchSite.trim() !== "") {
      filtered = Sites_Referencias.filter((item) => {
        if (!item?.site) return false;
        return (
          compareUrls(item.site, searchSite) ||
          item.tipo?.toLowerCase().includes(searchSite.toLowerCase())
        );
      });
    }

    setFilteredSites(filtered);
  }, [safeLicitacao.orgao_site, safeLicitacao.link_edital, searchSite, compareUrls]);

  // Mutation para adicionar favorito
  const addFavoriteMutation = useMutation({
    mutationFn: async (favoriteData: any) => {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(favoriteData),
      });
      if (!response.ok) throw new Error("Erro ao adicionar favorito");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Favorito adicionado!",
        description: "Licitação foi adicionada aos seus favoritos.",
      });
      if (onUpdate) onUpdate();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar aos favoritos.",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover favorito
  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: number) => {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao remover favorito");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Favorito removido!",
        description: "Licitação foi removida dos seus favoritos.",
      });
      if (onUpdate) onUpdate();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover dos favoritos.",
        variant: "destructive",
      });
    },
  });

  // Função para favoritar/desfavoritar
  const handleFavorite = () => {
    if (isFavorite && currentFavorite) {
      removeFavoriteMutation.mutate(currentFavorite.id);
    } else {
      setShowOptions(true);
      setSelectedTipoObjeto("");
      setSelectedSite("");
      setSearchTipoObjeto("");
      setSearchSite("");
      setShowNewTipoObjeto(false);
      setShowNewSite(false);
    }
  };

  // Função para salvar favorito
  const saveFavorite = () => {
    const tipoObjetoToSave = showNewTipoObjeto
      ? { tipo_objeto: "Novo Tipo", objeto: newTipoObjeto }
      : filteredTipoObjeto.find((item) => item.objeto === selectedTipoObjeto);

    const siteToSave = showNewSite
      ? { tipo: "Novo Site", site: newSite }
      : filteredSites.find((item) => item.site === selectedSite);

    const favoriteData = {
      biddingId: safeLicitacao.id,
      tipoObjeto: tipoObjetoToSave?.tipo_objeto || "Não categorizado",
      objeto: tipoObjetoToSave?.objeto || safeLicitacao.objeto,
      site:
        siteToSave?.site ||
        safeLicitacao.orgao_site ||
        safeLicitacao.link_edital ||
        "Não especificado",
      siteType: siteToSave?.tipo || "Não categorizado",
      licitacaoData: JSON.stringify(safeLicitacao),
    };

    addFavoriteMutation.mutate(favoriteData);
    setShowOptions(false);
    setShowFicha(true);

    // Reset form
    setSelectedTipoObjeto("");
    setSelectedSite("");
    setSearchTipoObjeto("");
    setSearchSite("");
    setNewTipoObjeto("");
    setNewSite("");
    setShowNewTipoObjeto(false);
    setShowNewSite(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFavorite}
        className="p-1 h-auto text-white hover:bg-white/20"
        disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
      >
        {isFavorite ? (
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </Button>

      {isFavorite && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFicha(true)}
        >
          Ver Ficha
        </Button>
      )}

      {/* Modal de opções para categorização */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Categorizar Favorito</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Seção Tipo de Objeto */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Objeto</Label>
              
              {showNewTipoObjeto ? (
                <div className="space-y-3">
                  <Input
                    value={newTipoObjeto}
                    onChange={(e) => setNewTipoObjeto(e.target.value)}
                    placeholder="Digite o novo tipo de objeto"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewTipoObjeto(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => newTipoObjeto.trim() && saveFavorite()}
                      disabled={!newTipoObjeto.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    value={searchTipoObjeto}
                    onChange={(e) => {
                      setSearchTipoObjeto(e.target.value);
                      setSelectedTipoObjeto("");
                    }}
                    placeholder="Buscar tipo de objeto..."
                  />

                  {filteredTipoObjeto.length > 0 ? (
                    <Select value={selectedTipoObjeto} onValueChange={setSelectedTipoObjeto}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tipo de objeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTipoObjeto.map((item) => (
                          <SelectItem key={item.id} value={item.objeto}>
                            {item.objeto} ({item.tipo_objeto})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-gray-600 text-center">
                      Nenhum resultado encontrado
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewTipoObjeto(true);
                      setSelectedTipoObjeto("");
                    }}
                    className="w-full border-dashed"
                  >
                    + Adicionar Novo Tipo
                  </Button>
                </>
              )}
            </div>

            {/* Seção Site */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Site/Fonte</Label>
              
              {showNewSite ? (
                <div className="space-y-3">
                  <Input
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    placeholder="Digite o novo site"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewSite(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => newSite.trim() && saveFavorite()}
                      disabled={!newSite.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    value={searchSite}
                    onChange={(e) => {
                      setSearchSite(e.target.value);
                      setSelectedSite("");
                    }}
                    placeholder="Buscar site..."
                  />

                  {filteredSites.length > 0 ? (
                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um site" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSites.map((item) => (
                          <SelectItem key={item.id} value={item.site}>
                            {item.site} ({item.tipo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-gray-600 text-center">
                      {Sites_Referencias.length > 0
                        ? "Nenhum resultado para esta busca"
                        : "Nenhum site disponível"}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewSite(true);
                      setSelectedSite("");
                    }}
                    className="w-full border-dashed"
                  >
                    + Adicionar Novo Site
                  </Button>
                </>
              )}
            </div>

            {/* Ações do modal */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowOptions(false)}>
                Cancelar
              </Button>
              <Button
                onClick={saveFavorite}
                disabled={
                  (!selectedTipoObjeto && !showNewTipoObjeto) ||
                  (!selectedSite && !showNewSite) ||
                  (showNewTipoObjeto && !newTipoObjeto.trim()) ||
                  (showNewSite && !newSite.trim())
                }
              >
                Salvar Favorito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal da ficha do favorito */}
      <Dialog open={showFicha} onOpenChange={setShowFicha}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ficha do Favorito</DialogTitle>
          </DialogHeader>

          {currentFavorite && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">ID:</Label>
                <p className="text-sm">{safeLicitacao.conlicitacao_id}</p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Tipo de Objeto:</Label>
                <Badge variant="secondary">{currentFavorite.tipoObjeto}</Badge>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Objeto:</Label>
                <p className="text-sm">{currentFavorite.objeto}</p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Site:</Label>
                <p className="text-sm break-all">{currentFavorite.site}</p>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Tipo de Site:</Label>
                <Badge variant="outline">{currentFavorite.siteType}</Badge>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowOptions(true)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    removeFavoriteMutation.mutate(currentFavorite.id);
                    setShowFicha(false);
                  }}
                >
                  Remover
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}