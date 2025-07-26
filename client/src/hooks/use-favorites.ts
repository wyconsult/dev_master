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
    onSuccess: (data, biddingId) => {
      if (user) {
        client.invalidateQueries({ queryKey: [`/api/favorites/${user.id}`] });
        client.invalidateQueries({ queryKey: [`/api/favorites/${user.id}/${biddingId}`] });
        client.invalidateQueries({ queryKey: ["/api/favorites", user.id] });
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
    onSuccess: (data, biddingId) => {
      if (user) {
        client.invalidateQueries({ queryKey: [`/api/favorites/${user.id}`] });
        client.invalidateQueries({ queryKey: [`/api/favorites/${user.id}/${biddingId}`] });
        client.invalidateQueries({ queryKey: ["/api/favorites", user.id] });
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

  return {
    toggleFavorite,
    isLoading: addFavoriteMutation.isPending || removeFavoriteMutation.isPending
  };
}
