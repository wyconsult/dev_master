import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, Save, Plus, BookOpen, ChevronDown, Search } from "lucide-react";
import { MAIN_CATEGORIES, CATEGORIZATION_DATA, suggestCategory } from "@/data/categorization";
import { type Bidding } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteCategorization } from "@/hooks/use-favorite-categorization";

interface FavoriteCategorizationProps {
  bidding: Bidding;
  currentCategory?: string;
  currentCustomCategory?: string;
  currentNotes?: string;
  currentUf?: string;
  currentCodigoUasg?: string;
  currentValorEstimado?: string;
  currentFornecedor?: string;
  currentSite?: string;
}

export function FavoriteCategorization({ 
  bidding, 
  currentCategory = "outros",
  currentCustomCategory = "",
  currentNotes = "",
  currentUf = "",
  currentCodigoUasg = "",
  currentValorEstimado = "",
  currentFornecedor = "",
  currentSite = ""
}: FavoriteCategorizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [customCategory, setCustomCategory] = useState(currentCustomCategory);
  const [notes, setNotes] = useState(currentNotes);
  const [activeTab, setActiveTab] = useState("category");
  const [searchTerm, setSearchTerm] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [uf, setUf] = useState(currentUf || bidding.orgao_uf || "");
  const [codigoUasg, setCodigoUasg] = useState(currentCodigoUasg || bidding.orgao_codigo || "");
  const [valorEstimado, setValorEstimado] = useState(
    currentValorEstimado || (bidding.valor_estimado ? `R$ ${bidding.valor_estimado.toLocaleString('pt-BR')}` : "")
  );
  const [fornecedor, setFornecedor] = useState(currentFornecedor);
  const [selectedSite, setSelectedSite] = useState(currentSite);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Usar hook de categorização
  const { updateCategorization, isUpdating } = useFavoriteCategorization(
    user?.id || 1, 
    bidding.id
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
        setSiteDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sugerir categoria automaticamente baseada no objeto
  const suggestedCategory = suggestCategory(bidding.objeto);

  const handleSave = () => {
    const categorizationData = {
      category: selectedCategory || null,
      customCategory: customCategory.trim() || null,
      notes: notes.trim() || null,
      uf: uf.trim() || null,
      codigoUasg: codigoUasg.trim() || null,
      valorEstimado: valorEstimado.trim() || null,
      fornecedor: fornecedor.trim() || null,
      site: selectedSite.trim() || null,
    };

    updateCategorization(categorizationData);

    toast({
      title: "Categorização atualizada",
      description: "Todas as informações foram salvas com sucesso.",
    });
    setIsOpen(false);
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim()) {
      setCustomCategory(newCategoryName.trim());
      setNewCategoryName("");
      toast({
        title: "Categoria adicionada",
        description: `Nova categoria "${newCategoryName}" foi criada.`,
      });
      setActiveTab("notes");
    }
  };

  const handleAddNewSite = () => {
    if (newSiteUrl.trim()) {
      setSelectedSite(newSiteUrl.trim());
      setNewSiteUrl("");
      toast({
        title: "Site adicionado",
        description: `Novo site "${newSiteUrl}" foi adicionado.`,
      });
    }
  };

  const handleSiteSelect = (site: string) => {
    setSelectedSite(site);
    setSiteSearch("");
    setSiteDropdownOpen(false);
  };

  // Filtrar sites baseado na pesquisa
  const filteredSites = CATEGORIZATION_DATA.sites.filter(site => 
    !siteSearch || site.objeto.toLowerCase().includes(siteSearch.toLowerCase())
  ).slice(0, 15);

  const handleSuggestCategory = () => {
    setSelectedCategory(suggestedCategory);
  };

  // Filtrar categorias baseado na busca
  const filteredCategories = MAIN_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-3 text-xs border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Tags className="h-3 w-3 mr-1.5" />
          Editar Categorização
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] bg-white border-0 shadow-2xl flex flex-col">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Tags className="h-4 w-4 text-white" />
                </div>
                Editar Categorização
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Organize seu favorito por categoria para facilitar a busca e organização.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 min-h-0">
          {/* Informações da Licitação */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-sm text-blue-800 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Licitação:
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {bidding.objeto}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
              <TabsTrigger 
                value="category" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium"
              >
                Categoria
              </TabsTrigger>
              <TabsTrigger 
                value="examples" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium"
              >
                Exemplos
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-medium"
              >
                Notas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="category" className="space-y-6 mt-6">
              {/* Tipo de Objeto - Busca */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-800">Tipo de Objeto:</Label>
                
                <div className="relative">
                  <Input
                    placeholder="Buscar tipo de objeto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Resultados da Busca ou Mensagem */}
                {searchTerm && filteredCategories.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                    <p className="text-gray-500 text-sm">Nenhum resultado encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {(searchTerm ? filteredCategories : MAIN_CATEGORIES).map((category) => (
                      <div
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          "p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                          selectedCategory === category.id
                            ? "border-green-500 bg-green-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", category.color)}></div>
                            <span className={cn(
                              "text-sm font-medium",
                              selectedCategory === category.id ? "text-green-700" : "text-gray-700"
                            )}>
                              {category.name}
                            </span>
                          </div>
                          {/* Badge com quantidade de exemplos */}
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600"
                          >
                            {CATEGORIZATION_DATA[category.id as keyof typeof CATEGORIZATION_DATA]?.length || 0}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulário para adicionar nova categoria */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                  <div className="text-center">
                    <Plus className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm font-medium text-gray-700">Adicionar Novo Tipo</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome da nova categoria..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
                    />
                    <Button 
                      onClick={handleAddNewCategory}
                      disabled={!newCategoryName.trim()}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Criar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sugestão Automática */}
              {suggestedCategory !== selectedCategory && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-yellow-800">
                        Sugestão Automática: {MAIN_CATEGORIES.find(c => c.id === suggestedCategory)?.name}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSuggestCategory}
                      className="text-yellow-700 hover:bg-yellow-100 text-xs"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="examples" className="space-y-4 mt-6">
              <div className="space-y-4">
                {selectedCategory !== 'outros' && CATEGORIZATION_DATA[selectedCategory as keyof typeof CATEGORIZATION_DATA] && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-800">
                      Exemplos de {MAIN_CATEGORIES.find(c => c.id === selectedCategory)?.name}:
                    </Label>
                    <div className="max-h-64 overflow-y-auto mt-3 space-y-2 bg-gray-50 rounded-lg p-3 border">
                      {CATEGORIZATION_DATA[selectedCategory as keyof typeof CATEGORIZATION_DATA]
                        .slice(0, 10)
                        .map((item) => (
                          <div key={item.id} className="bg-white p-3 rounded-lg border text-xs shadow-sm">
                            <span className="font-semibold text-blue-600">{item.tipo}:</span>
                            <span className="text-gray-700 ml-1">{item.objeto}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {selectedCategory === 'outros' && (
                  <div className="text-center py-12 text-gray-500">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Selecione uma categoria para ver exemplos</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-6 overflow-y-auto max-h-96">
              <div className="space-y-4 pb-4">
                {/* Informações de Tabulação */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800">UF:</Label>
                    <Input
                      placeholder="Ex: BA, SP, RJ..."
                      value={uf}
                      onChange={(e) => setUf(e.target.value)}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800">Código UASG/Gestora:</Label>
                    <Input
                      placeholder="Ex: 123456"
                      value={codigoUasg}
                      onChange={(e) => setCodigoUasg(e.target.value)}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Site - Dropdown Pesquisável */}
                <div>
                  <Label className="text-sm font-semibold text-gray-800">Site da Licitação:</Label>
                  <div className="relative mt-2" ref={siteDropdownRef}>
                    <div 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer flex items-center justify-between bg-white"
                      onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <span className={selectedSite ? "text-gray-900" : "text-gray-500"}>
                          {selectedSite || "Selecione o site..."}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {siteDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-64 overflow-hidden">
                        {/* Campo de pesquisa dentro do dropdown */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <Search className="h-4 w-4 text-gray-400 absolute left-2 top-1/2 transform -translate-y-1/2" />
                            <Input
                              placeholder="Buscar site..."
                              value={siteSearch}
                              onChange={(e) => setSiteSearch(e.target.value)}
                              className="pl-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        {/* Lista de sites */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredSites.length > 0 ? (
                            filteredSites.map(site => (
                              <div
                                key={site.id}
                                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleSiteSelect(site.objeto)}
                              >
                                <div className="text-sm text-gray-900">{site.objeto}</div>
                                <div className="text-xs text-gray-500">{site.tipo}</div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-sm text-gray-500 text-center">
                              Nenhum site encontrado
                            </div>
                          )}
                        </div>
                        
                        {/* Adicionar novo site */}
                        <div className="border-t border-gray-200 p-2 bg-gray-50">
                          <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Plus className="h-3 w-3" />
                            Adicionar Novo Site
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="URL do site..."
                              value={newSiteUrl}
                              onChange={(e) => setNewSiteUrl(e.target.value)}
                              className="flex-1 text-xs"
                              onKeyPress={(e) => e.key === 'Enter' && handleAddNewSite()}
                            />
                            <Button 
                              onClick={handleAddNewSite}
                              disabled={!newSiteUrl.trim()}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-xs px-2"
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações Financeiras */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-800">Valor Estimado/Contratado:</Label>
                    <Input
                      placeholder="Ex: R$ 50.000,00"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800">Fornecedor/UASG do Fornecedor:</Label>
                    <Input
                      placeholder="Nome do fornecedor"
                      value={fornecedor}
                      onChange={(e) => setFornecedor(e.target.value)}
                      className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Categoria Personalizada */}
                <div>
                  <Label className="text-sm font-semibold text-gray-800">Categoria Personalizada (Opcional)</Label>
                  <Input
                    placeholder="Ex: Equipamentos Médicos, Transporte, etc."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use para criar uma categoria específica que substitua a categoria principal.
                  </p>
                </div>

                {/* Notas */}
                <div>
                  <Label className="text-sm font-semibold text-gray-800">Notas e Observações</Label>
                  <Textarea
                    placeholder="Adicione suas observações sobre esta licitação..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use este espaço para anotar informações importantes, lembretes ou observações sobre esta licitação.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isUpdating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? "Salvando..." : "Salvar Favorito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}