import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";  
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tags, Save, Plus, Check, ChevronsUpDown } from "lucide-react";
import { TABULATION_HIERARCHY, SITES_LIST } from "@shared/tabulation-data";
import { type Bidding } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteCategorization } from "@/hooks/use-favorite-categorization";
import { useFavorites } from "@/hooks/use-favorites";

interface TabulationDialogProps {
  bidding: Bidding;
  isOpen: boolean;
  onClose: () => void;
  currentCategory?: string;
  currentCustomCategory?: string;
  currentNotes?: string;
  currentUf?: string;
  currentCodigoUasg?: string;
  currentValorEstimado?: string;
  currentFornecedor?: string;
  currentSite?: string;
}

export function TabulationDialog({ 
  bidding, 
  isOpen,
  onClose,
  currentCategory = "",
  currentCustomCategory = "",
  currentNotes = "",
  currentUf = "",
  currentCodigoUasg = "",
  currentValorEstimado = "",
  currentFornecedor = "",
  currentSite = ""
}: TabulationDialogProps) {
  // Estados para seleção hierárquica
  const categoryParts = currentCategory ? currentCategory.split('|') : [];
  const [tipoObjeto, setTipoObjeto] = useState(categoryParts[0] || "");
  const [subCategoria, setSubCategoria] = useState(categoryParts[1] || "");
  const [especializacao, setEspecializacao] = useState(categoryParts[2] || "");
  const [selectedSite, setSelectedSite] = useState(currentSite);
  const [notes, setNotes] = useState(currentNotes);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [siteOpen, setSiteOpen] = useState(false);
  const [uf, setUf] = useState(currentUf);
  const [codigoUasg, setCodigoUasg] = useState(currentCodigoUasg);
  const [valorEstimado, setValorEstimado] = useState(currentValorEstimado);
  // Sites disponíveis (incluindo o selecionado se não estiver na lista)
  const allSites = [...SITES_LIST, ...(selectedSite && !SITES_LIST.includes(selectedSite) ? [selectedSite] : [])];
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToFavorites } = useFavorites();
  
  // Usar hook de categorização
  const { updateCategorization, isUpdating } = useFavoriteCategorization(
    user?.id || 1, 
    bidding.id
  );

  // Obter opções baseadas na seleção atual
  const tiposObjeto = Object.keys(TABULATION_HIERARCHY);
  const subCategorias = tipoObjeto && TABULATION_HIERARCHY[tipoObjeto as keyof typeof TABULATION_HIERARCHY] 
    ? Object.keys(TABULATION_HIERARCHY[tipoObjeto as keyof typeof TABULATION_HIERARCHY] as any) 
    : [];
  const especializacoes = tipoObjeto && subCategoria && 
    TABULATION_HIERARCHY[tipoObjeto as keyof typeof TABULATION_HIERARCHY] &&
    (TABULATION_HIERARCHY[tipoObjeto as keyof typeof TABULATION_HIERARCHY] as any)[subCategoria]
    ? (TABULATION_HIERARCHY[tipoObjeto as keyof typeof TABULATION_HIERARCHY] as any)[subCategoria]
    : [];

  // Reset das seleções quando muda o tipo
  const handleTipoObjetoChange = (value: string) => {
    setTipoObjeto(value);
    setSubCategoria("");
    setEspecializacao("");
  };

  const handleSubCategoriaChange = (value: string) => {
    setSubCategoria(value);
    setEspecializacao("");
  };

  const handleSave = async () => {
    const fullCategory = [tipoObjeto, subCategoria, especializacao].filter(Boolean).join('|');
    
    const categorizationData = {
      category: fullCategory || null,
      customCategory: newCategoryName ? newCategoryName.trim() || null : null,
      notes: notes ? notes.trim() || null : null,
      uf: uf?.trim() || null,
      codigoUasg: codigoUasg?.trim() || null,
      valorEstimado: valorEstimado?.trim() || null,
      fornecedor: null,
      site: selectedSite?.trim() || null,
    };

    // Debug log para verificar se o site está sendo salvo
    console.log('🔍 DEBUG - Dados sendo salvos:', {
      site: selectedSite,
      categorizationData
    });

    try {
      // Apenas salva a categorização - que também adiciona aos favoritos se necessário
      await updateCategorization(categorizationData);

      toast({
        title: "Categorização salva",
        description: "Licitação adicionada aos favoritos com categorização completa.",
      });
    } catch (error) {
      console.error('❌ Erro ao salvar categorização:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar categorização.",
        variant: "destructive",
      });
    }
    onClose();
  };

  const handleAddNewCategory = () => {
    if (newCategoryName && newCategoryName.trim()) {
      toast({
        title: "Categoria personalizada adicionada",
        description: `"${newCategoryName}" será salva como categoria personalizada.`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-white border-0 shadow-2xl flex flex-col">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Tags className="h-4 w-4 text-white" />
            </div>
            Editar Categorização
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-1">
            Organize seu favorito por categoria para facilitar a busca e organização.
          </DialogDescription>
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

          {/* Layout otimizado: Categoria e Site em duas colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CATEGORIA - Sistema Hierárquico */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-900">Categoria</Label>
              
              {/* 1º Nível: Tipo de Objeto */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tipo de Objeto:</Label>
                <Select value={tipoObjeto} onValueChange={handleTipoObjetoChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo de objeto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                    {tiposObjeto.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2º Nível: Sub-categoria (somente se tipo selecionado) */}
              {tipoObjeto && subCategorias.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Categoria:</Label>
                  <Select value={subCategoria} onValueChange={handleSubCategoriaChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a categoria..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      {subCategorias.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 3º Nível: Especialização (somente se sub-categoria selecionada) */}
              {subCategoria && especializacoes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Especialização:</Label>
                  <Select value={especializacao} onValueChange={setEspecializacao}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a especialização..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      {especializacoes.map((esp: string) => (
                        <SelectItem key={esp} value={esp}>
                          {esp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Categoria Personalizada */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <Label className="text-sm font-medium text-gray-700">Categoria Personalizada (Opcional):</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Equipamentos Médicos, Transporte, etc."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button 
                    onClick={handleAddNewCategory}
                    disabled={!newCategoryName.trim()}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use para criar uma categoria específica que substitua a categoria principal.
                </p>
              </div>
            </div>

            {/* SITE */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-900">Site</Label>
              
              {/* Site da Licitação - Combobox com busca */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Site da Licitação:</Label>
                <Popover open={siteOpen} onOpenChange={setSiteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={siteOpen}
                      className="w-full justify-between bg-white"
                    >
                      {selectedSite || "Selecione o site..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0 z-[60] bg-white border shadow-lg">
                    <Command className="bg-white">
                      <CommandInput 
                        placeholder="Buscar site..." 
                        className="h-9 border-0 focus:ring-0 text-base md:text-sm" 
                      />
                      <CommandList className="max-h-48 md:max-h-60 overflow-y-auto touch-scroll overscroll-contain">
                        <CommandEmpty className="py-6 text-sm text-gray-500">
                          Nenhum site encontrado.
                        </CommandEmpty>
                        <CommandGroup>
                          {allSites.map((site, index) => (
                            <CommandItem
                              key={index}
                              value={site}
                              onSelect={(currentValue) => {
                                setSelectedSite(currentValue === selectedSite ? "" : currentValue);
                                setSiteOpen(false);
                              }}
                              className="cursor-pointer hover:bg-gray-100 py-3 px-3 text-sm touch-manipulation"
                            >
                              <span className="truncate pr-2">{site}</span>
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4 shrink-0",
                                  selectedSite === site ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Adicionar Site Personalizado */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <Label className="text-sm font-medium text-gray-700">Adicionar Site (Opcional):</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Portal de Compras SP, BEC/SP, etc."
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button 
                    onClick={() => {
                      if (newSiteName.trim()) {
                        setSelectedSite(newSiteName.trim());
                        setNewSiteName("");
                      }
                    }}
                    disabled={!newSiteName.trim()}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use para adicionar um site específico que não está na lista.
                </p>
              </div>
            </div>
          </div>

          {/* NOTAS - Seção separada para melhor aproveitamento da tela */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <Label className="text-lg font-semibold text-gray-900">Notas</Label>
            
            {/* Informações Adicionais */}
            <div className="bg-gray-50 rounded-lg border p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-600">UF:</Label>
                  <Input 
                    value={currentUf || bidding.orgao_uf || ''} 
                    onChange={(e) => setUf(e.target.value)}
                    placeholder="Ex: AM, SP, RJ..."
                    className="text-xs h-8 bg-white border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Código UASG:</Label>
                  <Input 
                    value={currentCodigoUasg || bidding.orgao_codigo || ''} 
                    onChange={(e) => setCodigoUasg(e.target.value)}
                    placeholder="Ex: UASG123"
                    className="text-xs h-8 bg-white border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Valor Estimado:</Label>
                  <Input 
                    value={currentValorEstimado || (bidding.valor_estimado ? `R$ ${bidding.valor_estimado.toLocaleString('pt-BR')}` : '')}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    placeholder="Ex: R$ 50.000"
                    className="text-xs h-8 bg-white border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>
            
            {/* Área de Anotações */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Anotações e Observações:</Label>
              <Textarea
                placeholder="Use este espaço para registrar informações importantes sobre a licitação"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-32 max-h-32 resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm overflow-y-auto placeholder:text-gray-300"
                readOnly={false}
              />
              <p className="text-xs text-gray-500">
                Use este espaço para registrar informações importantes sobre a licitação
              </p>
            </div>
          </div>

          {/* Resumo da Seleção */}
          {(tipoObjeto || subCategoria || especializacao) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Label className="text-sm font-medium text-green-800">Categorização Atual:</Label>
              <p className="text-sm text-green-700 mt-1">
                {[tipoObjeto, subCategoria, especializacao].filter(Boolean).join(' → ')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100 gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? "Salvando..." : "Salvar Categorização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}