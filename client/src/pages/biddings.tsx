import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type Bidding } from "@shared/schema";

export default function Biddings() {
  const [filters, setFilters] = useState({
    number: "",
    organization: "",
  });

  const { data: biddings = [], isLoading, error } = useQuery<Bidding[]>({
    queryKey: ["/api/biddings", filters],
  });

  const handleSearch = () => {
    // The query will automatically refetch when filters change
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                Erro ao carregar licitações. Tente novamente.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Licitações Disponíveis</h2>
          <p className="text-gray-600">Encontre e acompanhe processos licitatórios</p>
        </div>

        {/* Search Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Pesquisa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numero">Número da Licitação</Label>
                <Input
                  id="numero"
                  placeholder="Ex: 001/2024"
                  value={filters.number}
                  onChange={(e) => handleFilterChange("number", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="orgao">Órgão</Label>
                <Select value={filters.organization} onValueChange={(value) => handleFilterChange("organization", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os órgãos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os órgãos</SelectItem>
                    <SelectItem value="prefeitura">Prefeitura Municipal</SelectItem>
                    <SelectItem value="governo-estado">Governo do Estado</SelectItem>
                    <SelectItem value="ministerio">Ministério</SelectItem>
                    <SelectItem value="autarquia">Autarquia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Pesquisar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biddings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : biddings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {biddings.map((bidding) => (
              <BiddingCard key={bidding.id} bidding={bidding} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma licitação encontrada com os filtros aplicados.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
