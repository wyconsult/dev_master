import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Gavel, List, Heart, LogOut, LayoutDashboard, FileText } from "lucide-react";

export function Navbar() {
  const { logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-gradient-to-r from-white/60 to-blue-50/60 backdrop-blur-xl shadow-2xl border-b border-gray-200/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Gavel className="text-white h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent">LicitaTraker</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  location === "/dashboard" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/boletins">
              <Button 
                variant="ghost" 
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  location === "/boletins" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <FileText className="mr-2 h-4 w-4" />
                Boletins
              </Button>
            </Link>
            <Link href="/biddings">
              <Button 
                variant="ghost" 
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  location === "/biddings" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "text-gray-700 hover:bg-green-50 hover:text-green-700 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <List className="mr-2 h-4 w-4" />
                Licitações
              </Button>
            </Link>
            <Link href="/favorites">
              <Button 
                variant="ghost" 
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  location === "/favorites" 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                    : "text-gray-700 hover:bg-red-50 hover:text-red-700 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <Heart className="mr-2 h-4 w-4" />
                Meus Favoritos
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
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
