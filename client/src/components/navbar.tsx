import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Gavel, List, Heart, LogOut } from "lucide-react";

export function Navbar() {
  const { logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Gavel className="text-white h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">JLG Licita</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link href="/biddings">
              <Button 
                variant="ghost" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  location === "/biddings" 
                    ? "text-primary" 
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                <List className="mr-2 h-4 w-4" />
                Licitações
              </Button>
            </Link>
            <Link href="/favorites">
              <Button 
                variant="ghost" 
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  location === "/favorites" 
                    ? "text-primary" 
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                <Heart className="mr-2 h-4 w-4" />
                Favoritos
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
