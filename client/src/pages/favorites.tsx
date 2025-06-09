import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { BiddingCard } from "@/components/bidding-card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Heart, List } from "lucide-react";
import { Link } from "wouter";
import { type Bidding } from "@shared/schema";

export default function Favorites() {
  const { user } = useAuth();

  const { data: favorites = [], isLoading, error } = useQuery<Bidding[]>({
    queryKey: ["/api/favorites", user?.id],
    enabled: !!user,
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
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
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Licitações Favoritas</h2>
          <p className="text-gray-600">Suas licitações marcadas como favoritas</p>
        </div>

        {/* Favorites Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {favorites.map((bidding) => (
              <BiddingCard key={bidding.id} bidding={bidding} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Heart className="h-16 w-16 mx-auto" />
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
