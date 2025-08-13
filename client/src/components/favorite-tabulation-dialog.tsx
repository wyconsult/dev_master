import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Tags } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Importar estrutura hierárquica da planilha real
import { TABULATION_HIERARCHY } from "@shared/tabulation-data";

// Usar a estrutura importada
const tabulationDataLocal = TABULATION_HIERARCHY;
import type { Bidding } from "@shared/schema";

interface FavoriteTabulationDialogProps {
  bidding: Bidding;
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currentCategory?: string;
  currentCustomCategory?: string;
  currentNotes?: string;
  currentSite?: string;
}

// Lista de sites conforme planilha real
const SITES_LIST = [
  "www.selcorp.com.br",
  "www.portaldacapitalba.com.br", 
  "www.fim.br",
  "www.apr.sc.gov.br",
  "https://aquisicoes.seplag.mt.gov.br/home",
  "https://pregaoeletronico.com.br/",
  "https://bllcompras.com/Home/Login",
  "https://www.comprasnet.ba.gov.br/",
  "https://www.compras.rj.gov.br",
  "https://compras.mg.gov.br",
  "https://www.administracao.pr.gov.br/Compras",
  "https://compras.itanhaem.sp.gov.br/Default.aspx",
  "https://compras.itapu.gov.br/Default.aspx",
  "http://compras.mgtecnologia.com.br/",
  "compras.manaus.am.gov.br",
  "compras.sistemfergs",
  "e-gov.rs",
  "https://egov.paranguagabs.com.br/sesc_senac_rs",
  "https://hml.sesc.com.br",
  "http://www.parceiriassociais.sp.gov.br/OSC/OSC/",
  "https://apostocimico.com.br",
  "https://araraquaradaae.eportal.net.br/portal_licitacoes_externo_irrestrito",
  "https://bnc.baguari.ibi.ce.gov.br/default.aspx",
  "https://santacruzdorio.licitar.org.br/",
  "https://www.portaldecompras.ce.gov.br/fornecedores",
  "https://www.sesc-rs.com.br/licitacoes/",
  "https://www.sesc.com.br",
  "Licitamas Brasil",
  "Licitar",
  "Licitar Digital",
  "https://plataforma.gov.al/servico/160",
  "Novo BBMNET",
  "Pt Integrado",
  "Portal de Compras Públicas",
  "portal.do.fornecedor.RS",
  "Portal Petrobras",
  "portaldecompras.ce.gov.br",
  "pregaogande.sp.gov.br",
  "Presencial",
  "publinexo",
  "selac.pr",
  "SIGA MS",
  "SIGA RJ",
  "sma.sp.gov.br",
  "https://licitacoes-e2.bb.com.br/aop-inter-estatico/",
  "www.bertioga.sp.gov.br/licitacao",
  "www.cabo.pe.gov.br",
  "www.e-compras.am.gov.br",
  "www.fim.br",
  "www.funcol.ma.gov.br",
  "www.licitamaisbrasilcom.br",
  "www.otg.org.br",
  "www.parceiriassociais.sp.gov.br/OSC/Chamamentos",
  "www.publinexo.com.br/privado/",
  "www.sesc.com.br",
  "www.siga.sp.gov.br"
];

export function FavoriteTabulationDialog({ 
  bidding, 
  isOpen, 
  onClose, 
  userId,
  currentCategory,
  currentCustomCategory,
  currentNotes,
  currentSite
}: FavoriteTabulationDialogProps) {
  // Estados para sistema hierárquico
  const [tipoObjeto, setTipoObjeto] = useState("");
  const [subCategoria, setSubCategoria] = useState("");
  const [especializacao, setEspecializacao] = useState("");
  const [selectedSite, setSelectedSite] = useState(currentSite || "");
  const [siteSearch, setSiteSearch] = useState("");
  const [notes, setNotes] = useState(currentNotes || "");
  const [newCategoryName, setNewCategoryName] = useState(currentCustomCategory || "");

  // Carregar dados existentes ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedSite(currentSite || "");
      setNotes(currentNotes || "");
      setNewCategoryName(currentCustomCategory || "");
      
      // Carregar categoria hierárquica salva
      if (currentCustomCategory) {
        setTipoObjeto(currentCustomCategory);
        setSubCategoria("");
        setEspecializacao("");
      } else if (currentCategory) {
        // Se a categoria contém separador hierárquico
        if (currentCategory.includes(' → ')) {
          const parts = currentCategory.split(' → ');
          setTipoObjeto(parts[0] || "");
          setSubCategoria(parts[1] || "");
          setEspecializacao(parts[2] || "");
        } else {
          // Verificar se a categoria atual está na estrutura hierárquica
          const categoriaEncontrada = Object.keys(tabulationDataLocal).find(tipo => tipo === currentCategory);
          if (categoriaEncontrada) {
            setTipoObjeto(categoriaEncontrada);
          } else {
            // Se não encontrou, pode ser uma sub-categoria
            for (const [tipo, subcategorias] of Object.entries(tabulationDataLocal)) {
              if (Object.keys(subcategorias).includes(currentCategory)) {
                setTipoObjeto(tipo);
                setSubCategoria(currentCategory);
                break;
              }
              // Verificar especializações
              for (const [subcat, especializacoes] of Object.entries(subcategorias)) {
                if ((especializacoes as string[]).includes(currentCategory)) {
                  setTipoObjeto(tipo);
                  setSubCategoria(subcat);
                  setEspecializacao(currentCategory);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }, [isOpen, currentCategory, currentCustomCategory, currentNotes, currentSite]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obter tipos de objeto (chaves principais)
  const tiposObjeto = Object.keys(tabulationDataLocal);

  // Obter sub-categorias baseadas no tipo selecionado
  const subCategorias = tipoObjeto ? Object.keys((tabulationDataLocal as any)[tipoObjeto] || {}) : [];

  // Obter especializações baseadas na sub-categoria selecionada
  const especializacoes = (tipoObjeto && subCategoria) 
    ? ((tabulationDataLocal as any)[tipoObjeto]?.[subCategoria] || [])
    : [];

  // Handlers para mudanças hierárquicas
  const handleTipoObjetoChange = (novoTipo: string) => {
    setTipoObjeto(novoTipo);
    setSubCategoria(""); // Reset sub-categoria
    setEspecializacao(""); // Reset especialização
  };

  const handleSubCategoriaChange = (novaSub: string) => {
    setSubCategoria(novaSub);
    setEspecializacao(""); // Reset especialização
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    setTipoObjeto(newCategoryName.trim());
    setNewCategoryName("");
  };

  // Mutation para salvar
  const updateCategorization = useMutation({
    mutationFn: () => {
      // Criar categoria hierárquica completa para salvar
      const fullHierarchy = [tipoObjeto, subCategoria, especializacao].filter(Boolean).join(' → ');
      
      const categorizationData = {
        category: newCategoryName.trim() || fullHierarchy || tipoObjeto || null,
        customCategory: newCategoryName.trim() || null,
        notes: notes.trim() || null,
        uf: bidding.orgao_uf || null,
        codigoUasg: bidding.orgao_codigo || null,
        valorEstimado: bidding.valor_estimado?.toString() || null,
        fornecedor: null,
        site: selectedSite || null,
        // Salvar componentes hierárquicos separadamente para reconstruir
        tipoObjeto: tipoObjeto || null,
        subCategoria: subCategoria || null,
        especializacao: especializacao || null
      };

      return apiRequest("PATCH", `/api/favorites/${userId}/${bidding.id}/categorize`, categorizationData);
    },
    onSuccess: () => {
      toast({
        title: "Categorização salva",
        description: "A categorização foi salva com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a categorização.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateCategorization.mutate();
  };

  const isUpdating = updateCategorization.isPending;

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

              {/* 2º Nível: Sub-categoria */}
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

              {/* 3º Nível: Especialização */}
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
                
                {/* Campo de pesquisa digitável */}
                <div className="space-y-2">
                  <Input
                    placeholder="Digite o nome do site ou pesquise..."
                    value={siteSearch}
                    onChange={(e) => setSiteSearch(e.target.value)}
                    className="w-full text-sm"
                  />
                  
                  {/* Select com sites filtrados */}
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o site..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                      {SITES_LIST
                        .filter(site => 
                          !siteSearch || 
                          site.toLowerCase().includes(siteSearch.toLowerCase())
                        )
                        .map((site) => (
                        <SelectItem key={site} value={site}>
                          {site}
                        </SelectItem>
                      ))}
                      {siteSearch && !SITES_LIST.some(site => 
                        site.toLowerCase().includes(siteSearch.toLowerCase())
                      ) && (
                        <SelectItem value={siteSearch}>
                          Usar: {siteSearch}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
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
                <div>
                  <Label className="text-xs font-medium text-gray-600">Valor Estimado:</Label>
                  <Input 
                    value={bidding.valor_estimado ? `R$ ${bidding.valor_estimado.toLocaleString('pt-BR')}` : 'Não informado'} 
                    disabled 
                    className="text-xs h-8 bg-white border-gray-200"
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