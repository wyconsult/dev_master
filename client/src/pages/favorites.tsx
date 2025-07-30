import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eraser } from "lucide-react";
import { type Bidding } from "@shared/schema";

export default function Favorites() {
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: allFavorites = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
  });

  // Filtrar favoritos por data e categoria
  const filteredFavorites = allFavorites.filter((fav) => {
    if (dateFilter && !fav.createdAt?.includes(dateFilter)) {
      return false;
    }
    
    if (dateFrom || dateTo) {
      const favDate = fav.createdAt?.split('T')[0];
      if (!favDate) return false;
      
      if (dateFrom && favDate < dateFrom) return false;
      if (dateTo && favDate > dateTo) return false;
    }
    
    if (categoryFilter && fav.tipoObjeto !== categoryFilter) {
      return false;
    }
    
    return true;
  });

  // Extrair categorias únicas
  const categories = Array.from(new Set(allFavorites.map(f => f.tipoObjeto).filter(Boolean)));

  const clearFilters = () => {
    setDateFilter("");
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">Carregando favoritos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Meus Favoritos</h1>
          
          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data específica</label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="Data do favorito"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Data inicial</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="De"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Data final</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="Até"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{allFavorites.length}</div>
                <div className="text-sm text-gray-600">Total de Favoritos</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{filteredFavorites.length}</div>
                <div className="text-sm text-gray-600">Filtrados</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
                <div className="text-sm text-gray-600">Categorias</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de favoritos */}
        <div className="space-y-4">
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">Nenhum favorito encontrado</div>
              <div className="text-sm text-gray-400">
                {allFavorites.length === 0 
                  ? "Você ainda não tem favoritos. Favorite licitações interessantes para vê-las aqui."
                  : "Tente ajustar os filtros para ver mais resultados."
                }
              </div>
            </div>
          ) : (
            <>
              {filteredFavorites.map((favorite) => (
                <div key={favorite.id} className="relative">
                  {/* Card do favorito */}
                  <Card className="border-l-4 border-l-yellow-400">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Informações principais */}
                        <div className="lg:col-span-2">
                          <div className="mb-2">
                            <Badge variant="secondary" className="mr-2">
                              {favorite.tipoObjeto || "Sem categoria"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Favoritado em {new Date(favorite.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {favorite.objeto || `ID: ${favorite.biddingId}`}
                          </h3>
                          
                          {favorite.site && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Site:</span> {favorite.site}
                              {favorite.siteType && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {favorite.siteType}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Dados da licitação original (se disponível) */}
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-xs font-medium text-gray-700 mb-2">
                            Dados da Licitação:
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div><span className="font-medium">ID:</span> {favorite.biddingId}</div>
                            {favorite.licitacaoData && (
                              <div className="text-xs text-gray-500">
                                Dados salvos disponíveis
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}