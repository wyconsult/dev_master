import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type Bidding } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";

export default function Biddings() {
  const [filters, setFilters] = useState({
    conlicitacao_id: "",
    orgao: "all",
    turno: "all",
  });

  const { data: biddings = [], isLoading, error } = useQuery<Bidding[]>({
    queryKey: ["/api/biddings", filters],
  });

  const handleSearch = () => {
    // The query will automatically refetch when filters change
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Licitações</h2>
          <p className="text-gray-600">Encontre e acompanhe processos licitatórios</p>
        </div>

        {/* Search Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Pesquisa</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="conlicitacao_id">Filtrar Número ConLicitação</Label>
                <Input
                  id="conlicitacao_id"
                  placeholder="Ex: 13157470"
                  value={filters.conlicitacao_id}
                  onChange={(e) => handleFilterChange("conlicitacao_id", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="orgao">Filtrar Órgão</Label>
                <Select value={filters.orgao} onValueChange={(value) => handleFilterChange("orgao", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os órgãos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os órgãos</SelectItem>
                    <SelectItem value="prefeitura">Prefeitura Municipal</SelectItem>
                    <SelectItem value="governo">Governo do Estado</SelectItem>
                    <SelectItem value="superintendência">Superintendência</SelectItem>
                    <SelectItem value="ministério">Ministério</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="turno">Turno</Label>
                <Select value={filters.turno} onValueChange={(value) => handleFilterChange("turno", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os turnos</SelectItem>
                    <SelectItem value="manhã">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse w-full">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {biddings.map((bidding: Bidding) => (
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
