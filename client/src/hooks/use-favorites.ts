import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export function useFavorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  
  const addFavoriteMutation = useMutation({
    mutationFn: async (biddingId: number) => {
      if (!user) throw new Error("User not authenticated");
      const response = await apiRequest("POST", "/api/favorites", {
        userId: user.id,
        biddingId
      });
      return response.json();
    },
    onMutate: async (biddingId) => {
      if (!user) return;
      
      // Cancel any outgoing refetches
      await client.cancelQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes('/api/favorites');
        }
      });
      
      // Optimistically update the favorite status for all related queries
      client.setQueryData([`/api/favorites/${user.id}/${biddingId}`], { isFavorite: true });
      
      // Force immediate refetch and update
      setTimeout(() => {
        client.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key.includes('/api/favorites');
          }
        });
      }, 50);
    },
    onSuccess: (data, biddingId) => {
      if (user) {
        // Invalidate all possible favorite-related queries
        client.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key.includes('/api/favorites');
          }
        });
      }
      toast({
        title: "Sucesso",
        description: "Licitação adicionada aos favoritos",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar aos favoritos",
        variant: "destructive",
      });
    }
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (biddingId: number) => {
      if (!user) throw new Error("User not authenticated");
      await apiRequest("DELETE", `/api/favorites/${user.id}/${biddingId}`);
    },
    onMutate: async (biddingId) => {
      if (!user) return;
      
      // Cancel any outgoing refetches
      await client.cancelQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key.includes('/api/favorites');
        }
      });
      
      // Optimistically update the favorite status for all related queries
      client.setQueryData([`/api/favorites/${user.id}/${biddingId}`], { isFavorite: false });
      
      // Force immediate refetch and update
      setTimeout(() => {
        client.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key.includes('/api/favorites');
          }
        });
      }, 50);
    },
    onSuccess: (data, biddingId) => {
      if (user) {
        // Invalidate all possible favorite-related queries
        client.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0]?.toString() || '';
            return key.includes('/api/favorites');
          }
        });
      }
      toast({
        title: "Sucesso",
        description: "Licitação removida dos favoritos",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover dos favoritos",
        variant: "destructive",
      });
    }
  });

  const toggleFavorite = (biddingId: number, isFavorite: boolean) => {
    if (isFavorite) {
      removeFavoriteMutation.mutate(biddingId);
    } else {
      addFavoriteMutation.mutate(biddingId);
    }
  };

  const addToFavorites = (biddingId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      addFavoriteMutation.mutate(biddingId, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  return {
    toggleFavorite,
    addToFavorites,
    isLoading: addFavoriteMutation.isPending || removeFavoriteMutation.isPending
  };
}
