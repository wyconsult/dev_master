import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FavoriteCategorizationData {
  category: string | null;
  customCategory: string | null;
  notes: string | null;
  uf: string | null;
  codigoUasg: string | null;
  valorEstimado: string | null;
  fornecedor: string | null;
  site: string | null;
}

export function useFavoriteCategorization(userId: number, biddingId: number) {
  const queryClient = useQueryClient();

  const { data: isFavorite, isLoading: isFavoriteLoading } = useQuery({
    queryKey: ['/api/favorites', userId, biddingId],
    select: (data: any) => data.isFavorite,
  });

  const updateCategorizationMutation = useMutation({
    mutationFn: async (data: FavoriteCategorizationData) => {
      const response = await fetch(`/api/favorites/${userId}/${biddingId}/categorize`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update categorization');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate favorites cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  const updateCategorization = (categorizationData: FavoriteCategorizationData): Promise<void> => {
    return new Promise((resolve, reject) => {
      updateCategorizationMutation.mutate(categorizationData, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  return {
    isFavorite,
    isFavoriteLoading,
    updateCategorization,
    isUpdating: updateCategorizationMutation.isPending,
  };
}