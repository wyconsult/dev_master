import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";
import { useAuth } from "@/hooks/use-auth";
import { Star, List, Search } from "lucide-react";
import { Link } from "wouter";
import ReactSelect from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { type Bidding } from "@shared/schema";

registerLocale("pt-BR", ptBR);

interface Option {
  value: string;
  label: string;
}

const UF_OPTIONS: Option[] = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
].map(uf => ({ value: uf, label: uf }));

export default function Favorites() {
  const { user } = useAuth();

  const { data: favorites = [], isLoading, error } = useQuery<Bidding[]>({
    queryKey: [`/api/favorites/${user?.id}`],
    enabled: !!user,
  });

  const [pendingFilters, setPendingFilters] = useState({
    conlicitacao_id: "",
    uf: [] as string[],
    orgao: [] as string[],
    data_favoritado: null as Date | null,
  });

  const [appliedFilters, setAppliedFilters] = useState(pendingFilters);

  const ORGAO_OPTIONS = useMemo(() => {
    const nomes = Array.from(new Set(favorites.map(b => b.orgao)));
    return nomes.map(nome => ({ value: nome, label: nome }));
  }, [favorites]);

  // Simulação temporária de campo "favoritado_em"
  const favoritosComData = favorites.map(fav => ({
    ...fav,
    favoritado_em: "2025-06-17", // <-- simulado; troque depois por API real
  }));

  const handleSearch = () => {
    setAppliedFilters(pendingFilters);
  };

  const handleFilterChange = (key: keyof typeof pendingFilters, value: any) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  const filtered = useMemo(() => {
    return favoritosComData.filter(b => {
      if (
        appliedFilters.conlicitacao_id &&
        !b.id.toString().includes(appliedFilters.conlicitacao_id.trim())
      ) return false;

      if (
        appliedFilters.uf.length > 0 &&
        !appliedFilters.uf.includes((b as any).uf)
      ) return false;

      if (
        appliedFilters.orgao.length > 0 &&
        !appliedFilters.orgao.some(org =>
          b.orgao.toLowerCase().includes(org.toLowerCase())
        )
      ) return false;

      if (
        appliedFilters.data_favoritado &&
        b.favoritado_em !== format(appliedFilters.data_favoritado, "yyyy-MM-dd")
      ) return false;

      return true;
    });
  }, [favoritosComData, appliedFilters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent>
              <div className="text-center text-red-600">
                Erro ao carregar favoritos. Tente novamente.
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Favoritas</h2>
          <p className="text-gray-600">Suas licitações marcadas como favoritas</p>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Filtros de Pesquisa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Número de Controle */}
              <div>
                <Label htmlFor="conlicitacao_id">Número de Controle</Label>
                <Input
                  id="conlicitacao_id"
                  placeholder="Ex: 13157470"
                  value={pendingFilters.conlicitacao_id}
                  onChange={e =>
                    handleFilterChange("conlicitacao_id", e.target.value)
                  }
                />
              </div>

              {/* Órgão */}
              <div>
                <Label htmlFor="orgao">Órgão</Label>
                <ReactSelect<Option, true>
                  inputId="orgao"
                  options={ORGAO_OPTIONS}
                  placeholder="Selecione um ou mais órgãos"
                  isMulti
                  isSearchable
                  value={ORGAO_OPTIONS.filter(opt =>
                    pendingFilters.orgao.includes(opt.value)
                  )}
                  onChange={sel =>
                    handleFilterChange(
                      "orgao",
                      (sel as Option[]).map(o => o.value)
                    )
                  }
                  classNamePrefix="react-select"
                />
              </div>

              {/* UF */}
              <div>
                <Label htmlFor="uf">Estado (UF)</Label>
                <ReactSelect<Option, true>
                  inputId="uf"
                  options={UF_OPTIONS}
                  placeholder="Selecione um ou mais UFs"
                  isMulti
                  isSearchable
                  value={UF_OPTIONS.filter(opt =>
                    pendingFilters.uf.includes(opt.value)
                  )}
                  onChange={sel =>
                    handleFilterChange(
                      "uf",
                      (sel as Option[]).map(o => o.value)
                    )
                  }
                  classNamePrefix="react-select"
                />
              </div>

              {/* Calendário pt-BR */}
              <div>
                <Label htmlFor="data_favoritado">Selecionar data</Label>
                <DatePicker
                  id="data_favoritado"
                  selected={pendingFilters.data_favoritado}
                  onChange={date => handleFilterChange("data_favoritado", date)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Escolha a data"
                  className="w-full border rounded p-2"
                  locale="pt-BR"
                />
              </div>

              {/* Pesquisar */}
              <div className="flex items-end">
                <Button onClick={handleSearch} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Pesquisar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Favoritos */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map(b => (
              <BiddingCard key={b.id} bidding={b} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Star className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma licitação favorita</h3>
            <p className="text-gray-600 mb-6">Marque licitações como favoritas para vê-las aqui</p>
            <Link href="/biddings">
              <Button>
                <List className="mr-2 h-4 w-4" />
                Explorar Licitações
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
