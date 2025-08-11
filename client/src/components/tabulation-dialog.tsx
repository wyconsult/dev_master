import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";  
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tags, Save, Plus } from "lucide-react";
import { TABULATION_HIERARCHY, SITES_LIST } from "@shared/tabulation-data";
import { type Bidding } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useFavoriteCategorization } from "@/hooks/use-favorite-categorization";

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
  const [tipoObjeto, setTipoObjeto] = useState(currentCategory.split('|')[0] || "");
  const [subCategoria, setSubCategoria] = useState(currentCategory.split('|')[1] || "");
  const [especializacao, setEspecializacao] = useState(currentCategory.split('|')[2] || "");
  const [selectedSite, setSelectedSite] = useState(currentSite);
  const [notes, setNotes] = useState(currentNotes);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
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

  const handleSave = () => {
    const fullCategory = [tipoObjeto, subCategoria, especializacao].filter(Boolean).join('|');
    
    const categorizationData = {
      category: fullCategory || null,
      customCategory: newCategoryName.trim() || null,
      notes: notes.trim() || null,
      uf: null,
      codigoUasg: null,
      valorEstimado: null,
      fornecedor: null,
      site: selectedSite || null,
    };

    updateCategorization(categorizationData);

    toast({
      title: "Categorização salva",
      description: "Todas as informações foram salvas com sucesso.",
    });
    onClose();
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim()) {
      toast({
        title: "Categoria personalizada adicionada",
        description: `"${newCategoryName}" será salva como categoria personalizada.`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] bg-white border-0 shadow-2xl flex flex-col">
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

          {/* Layout simplificado: Categoria | Site | Notas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
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
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Site da Licitação:</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o site..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                    {SITES_LIST.map((site) => (
                      <SelectItem key={site} value={site}>
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* NOTAS */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-900">Notas</Label>
              
              {/* Informações Adicionais */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">UF:</Label>
                    <Input 
                      value={bidding.orgao_uf || ''} 
                      disabled 
                      className="text-xs h-8 bg-white border-gray-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Código UASG:</Label>
                    <Input 
                      value={bidding.orgao_codigo || ''} 
                      disabled 
                      className="text-xs h-8 bg-white border-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600">Valor Estimado:</Label>
                  <Input 
                    value={bidding.valor_estimado ? `R$ ${bidding.valor_estimado.toLocaleString('pt-BR')}` : 'Não informado'} 
                    disabled 
                    className="text-xs h-8 bg-white border-gray-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Anotações e Observações:</Label>
                <Textarea
                  placeholder="• Aspectos técnicos importantes
• Requisitos específicos observados
• Estratégias para participação
• Documentos necessários
• Contatos relevantes
• Observações gerais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-32 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                />
                <p className="text-xs text-gray-500">
                  Use este espaço para registrar informações importantes sobre a licitação
                </p>
              </div>
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