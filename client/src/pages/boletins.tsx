import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, Download, Calendar, Building } from "lucide-react";

interface Boletim {
  id: number;
  numero_edicao: number;
  datahora_fechamento: string;
  filtro_id: number;
  quantidade_licitacoes: number;
  quantidade_acompanhamentos: number;
  status: "Publicado" | "Em Processamento" | "Arquivado";
}

export default function Boletins() {
  const [filters, setFilters] = useState({
    filtro_id: "",
    status: "all",
    data_inicio: "",
    data_fim: ""
  });

  // Mock data for boletins based on ConLicitação API structure
  const mockBoletins: Boletim[] = [
    {
      id: 44657477,
      numero_edicao: 21,
      datahora_fechamento: "2020-11-12 13:01:19",
      filtro_id: 115425,
      quantidade_licitacoes: 45,
      quantidade_acompanhamentos: 12,
      status: "Publicado"
    },
    {
      id: 44632454,
      numero_edicao: 20,
      datahora_fechamento: "2020-11-12 09:43:43",
      filtro_id: 115425,
      quantidade_licitacoes: 38,
      quantidade_acompanhamentos: 8,
      status: "Publicado"
    },
    {
      id: 44612748,
      numero_edicao: 19,
      datahora_fechamento: "2020-11-11 19:14:45",
      filtro_id: 115425,
      quantidade_licitacoes: 52,
      quantidade_acompanhamentos: 15,
      status: "Publicado"
    },
    {
      id: 44590328,
      numero_edicao: 18,
      datahora_fechamento: "2020-11-11 13:14:21",
      filtro_id: 115425,
      quantidade_licitacoes: 41,
      quantidade_acompanhamentos: 9,
      status: "Arquivado"
    },
    {
      id: 44567343,
      numero_edicao: 17,
      datahora_fechamento: "2020-11-11 09:40:40",
      filtro_id: 115425,
      quantidade_licitacoes: 33,
      quantidade_acompanhamentos: 6,
      status: "Arquivado"
    }
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    // Filter logic would be implemented here
    console.log("Searching with filters:", filters);
  };

  const formatDateTime = (dateTime: string) => {
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('pt-BR');
    } catch {
      return dateTime;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Publicado":
        return "bg-green-100 text-green-800";
      case "Em Processamento":
        return "bg-yellow-100 text-yellow-800";
      case "Arquivado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDownload = (boletimId: number) => {
    // Download logic would be implemented here
    console.log("Downloading boletim:", boletimId);
  };

  const handleViewDetails = (boletimId: number) => {
    // Navigation to boletim details would be implemented here
    console.log("Viewing boletim details:", boletimId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Boletins</h1>
          <p className="text-gray-600">
            Visualize e gerencie todos os boletins de licitações
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Pesquisa</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="filtro_id">ID do Filtro</Label>
                <Input
                  id="filtro_id"
                  placeholder="Ex: 115425"
                  value={filters.filtro_id}
                  onChange={(e) => handleFilterChange("filtro_id", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Publicado">Publicado</SelectItem>
                    <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                    <SelectItem value="Arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={filters.data_inicio}
                  onChange={(e) => handleFilterChange("data_inicio", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={filters.data_fim}
                  onChange={(e) => handleFilterChange("data_fim", e.target.value)}
                />
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Boletins</p>
                  <p className="text-2xl font-bold text-gray-900">{mockBoletins.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Licitações</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockBoletins.reduce((acc, boletim) => acc + boletim.quantidade_licitacoes, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Acompanhamentos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockBoletins.reduce((acc, boletim) => acc + boletim.quantidade_acompanhamentos, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Download className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Publicados</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockBoletins.filter(b => b.status === "Publicado").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Boletins List */}
        <div className="space-y-4">
          {mockBoletins.map((boletim) => (
            <Card key={boletim.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Boletim Edição #{boletim.numero_edicao}
                      </h3>
                      <Badge className={getStatusColor(boletim.status)}>
                        {boletim.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">ID:</span> {boletim.id}
                      </div>
                      <div>
                        <span className="font-medium">Filtro ID:</span> {boletim.filtro_id}
                      </div>
                      <div>
                        <span className="font-medium">Data Fechamento:</span> {formatDateTime(boletim.datahora_fechamento)}
                      </div>
                      <div>
                        <span className="font-medium">Licitações:</span> {boletim.quantidade_licitacoes} | 
                        <span className="font-medium"> Acompanhamentos:</span> {boletim.quantidade_acompanhamentos}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(boletim.id)}
                    >
                      <FileText className="mr-1 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(boletim.id)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}