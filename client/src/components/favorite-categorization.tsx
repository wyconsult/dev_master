import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, Save, X, Plus, BookOpen } from "lucide-react";
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
}

interface CategoryData {
  category?: string;
  customCategory?: string;
  notes?: string;
}

export function FavoriteCategorization({ 
  bidding, 
  currentCategory = "outros",
  currentCustomCategory = "",
  currentNotes = ""
}: FavoriteCategorizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [customCategory, setCustomCategory] = useState(currentCustomCategory);
  const [notes, setNotes] = useState(currentNotes);
  const [activeTab, setActiveTab] = useState("category");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Usar hook de categorização
  const { updateCategorization, isUpdating } = useFavoriteCategorization(
    user?.id || 1, 
    bidding.id
  );

  // Sugerir categoria automaticamente baseada no objeto
  const suggestedCategory = suggestCategory(bidding.objeto);

  const handleSave = () => {
    updateCategorization({
      category: selectedCategory || null,
      customCategory: customCategory.trim() || null,
      notes: notes.trim() || null,
    });

    // Show success toast and close dialog
    toast({
      title: "Categorização atualizada",
      description: "A categorização do favorito foi salva com sucesso.",
    });
    setIsOpen(false);
  };

  const handleSuggestCategory = () => {
    setSelectedCategory(suggestedCategory);
  };

  const getCurrentCategoryInfo = () => {
    return MAIN_CATEGORIES.find(cat => cat.id === (currentCategory || selectedCategory)) || MAIN_CATEGORIES[3];
  };

  const categoryInfo = getCurrentCategoryInfo();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-2 text-xs"
        >
          <Tags className="h-3 w-3 mr-1" />
          <Badge 
            variant="secondary" 
            className={cn("text-white text-xs px-1 py-0", categoryInfo.color)}
          >
            {currentCustomCategory || categoryInfo.name}
          </Badge>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Categorizar Favorito
          </DialogTitle>
          <DialogDescription>
            Organize seu favorito por categoria para facilitar a busca e organização.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Licitação:</p>
            <p className="text-sm text-gray-600 line-clamp-2">{bidding.objeto}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="category">Categoria</TabsTrigger>
              <TabsTrigger value="examples">Exemplos</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="category" className="space-y-4">
              <div className="space-y-3">
                <Label>Categoria Principal</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAIN_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", category.color)} />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSuggestCategory}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Sugestão Automática: {MAIN_CATEGORIES.find(c => c.id === suggestedCategory)?.name}
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Categoria Personalizada (Opcional)</Label>
                <Input
                  placeholder="Ex: Equipamentos Médicos, Transporte, etc."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  Use para criar uma categoria específica que substitua a categoria principal.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="examples" className="space-y-4">
              <div className="space-y-3">
                {selectedCategory !== 'outros' && CATEGORIZATION_DATA[selectedCategory as keyof typeof CATEGORIZATION_DATA] && (
                  <div>
                    <Label className="text-sm font-medium">
                      Exemplos de {MAIN_CATEGORIES.find(c => c.id === selectedCategory)?.name}:
                    </Label>
                    <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
                      {CATEGORIZATION_DATA[selectedCategory as keyof typeof CATEGORIZATION_DATA]
                        .slice(0, 10)
                        .map((item) => (
                          <div key={item.id} className="p-2 bg-gray-50 rounded text-xs">
                            <span className="font-medium text-blue-600">{item.tipo}:</span> {item.objeto}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {selectedCategory === 'outros' && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Selecione uma categoria para ver exemplos</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-3">
                <Label>Notas e Observações</Label>
                <Textarea
                  placeholder="Adicione suas observações sobre esta licitação..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  Use este espaço para anotar informações importantes, lembretes ou observações sobre esta licitação.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isUpdating}
          >
            <Save className="h-4 w-4 mr-1" />
            {isUpdating ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}