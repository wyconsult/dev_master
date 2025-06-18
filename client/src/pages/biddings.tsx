// client/src/pages/biddings.tsx

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type Bidding } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";
import ReactSelect from "react-select";

interface Option {
  value: string;
  label: string;
}

// Lista fixa de UFs
const UF_OPTIONS: Option[] = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
].map(uf => ({ value: uf, label: uf }));

export default function Biddings() {
  // Filtros pendentes (o que o usuário está selecionando)
  const [pendingFilters, setPendingFilters] = useState<{
    conlicitacao_id: string;
    uf: string[];
    orgao: string[];
  }>({
    conlicitacao_id: "",
    uf: [],
    orgao: [],
  });

  // Filtros aplicados (quando clica em Pesquisar)
  const [appliedFilters, setAppliedFilters] = useState(pendingFilters);

  // Busca todas as licitações uma única vez
  const { data: allBiddings = [], isLoading, error } = useQuery<Bidding[]>({
    queryKey: ["allBiddings"],
    queryFn: async () => {
      const res = await fetch("/api/biddings");
      if (!res.ok) throw new Error("Falha ao buscar licitações");
      return await res.json();
    },
  });

  // Gera opções de órgão dinamicamente (bidding.orgao é string)
  const ORGAO_OPTIONS = useMemo(() => {
    const nomes = Array.from(new Set(allBiddings.map(b => b.orgao)));
    return nomes.map(nome => ({ value: nome, label: nome }));
  }, [allBiddings]);

  // Ao clicar em Pesquisar, aplica os filtros pendentes
  const handleSearch = () => {
    setAppliedFilters(pendingFilters);
  };

  const handleFilterChange = (key: keyof typeof pendingFilters, value: any) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  // Filtra localmente com base nos filtros aplicados
  const filtered = useMemo(() => {
    return allBiddings.filter(b => {
      // 1) Número de Controle (ID)
      if (
        appliedFilters.conlicitacao_id &&
        !b.id.toString().includes(appliedFilters.conlicitacao_id.trim())
      ) return false;

      // 2) UF (bidding.uf é string)
      if (
        appliedFilters.uf.length > 0 &&
        !appliedFilters.uf.includes((b as any).uf)
      ) return false;

      // 3) Órgão (bidding.orgao é string, match parcial)
      if (
        appliedFilters.orgao.length > 0 &&
        !appliedFilters.orgao.some(org =>
          b.orgao.toLowerCase().includes(org.toLowerCase())
        )
      ) return false;

      return true;
    });
  }, [allBiddings, appliedFilters]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent>
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Licitações</h2>
          <p className="text-gray-600">
            Encontre e acompanhe processos licitatórios
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Filtros de Pesquisa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Número de Controle */}
              <div>
                <Label htmlFor="conlicitacao_id">Filtrar Número de Controle</Label>
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
                <Label htmlFor="orgao">Filtrar Órgão</Label>
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

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filtered.map(b => (
              <BiddingCard key={b.id} bidding={b} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Nenhuma licitação encontrada com os filtros aplicados.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
