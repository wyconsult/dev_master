import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, Filter, Heart, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Bidding } from "@shared/schema";

export default function Favorites() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Buscar favoritos
  const { data: favorites = [], isLoading, refetch } = useQuery<Bidding[]>({
    queryKey: ["/api/favorites"],
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Filtros aplicados
  const filteredFavorites = favorites.filter(bidding => {
    const matchesSearch = !searchTerm || 
      bidding.objeto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bidding.orgao_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bidding.numero?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (bidding.data_abertura && bidding.data_abertura.includes(dateFilter));

    const matchesDateRange = (!dateFromFilter && !dateToFilter) ||
      (bidding.data_abertura && 
       (!dateFromFilter || bidding.data_abertura >= dateFromFilter) &&
       (!dateToFilter || bidding.data_abertura <= dateToFilter));

    return matchesSearch && matchesDate && matchesDateRange;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const hasActiveFilters = searchTerm || dateFilter || dateFromFilter || dateToFilter;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando favoritos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Meus Favoritos
              </h1>
              <p className="text-gray-600">
                Gerencie suas licitações favoritas
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-red-500" />
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {favorites.length} {favorites.length === 1 ? 'favorito' : 'favoritos'}
              </Badge>
            </div>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Filter className="h-5 w-5 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Objeto, órgão, número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data específica
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data até
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        {filteredFavorites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {favorites.length === 0 ? "Nenhum favorito ainda" : "Nenhum resultado encontrado"}
              </h3>
              <p className="text-gray-500 mb-6">
                {favorites.length === 0 
                  ? "Comece adicionando licitações aos seus favoritos nas páginas de boletins ou licitações."
                  : "Tente ajustar os filtros para encontrar o que procura."
                }
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Mostrando {filteredFavorites.length} de {favorites.length} favoritos
              </p>
            </div>
            
            <div className="grid gap-6">
              {filteredFavorites.map((bidding) => (
                <BiddingCard 
                  key={bidding.id} 
                  bidding={bidding}
                  onFavoriteChange={() => refetch()}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}