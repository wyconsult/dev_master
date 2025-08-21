import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Gavel, List, Heart, LogOut, LayoutDashboard, FileText, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/boletins", label: "Boletins", icon: FileText },
    { href: "/biddings", label: "Licitações", icon: List },
    { href: "/favorites", label: "Favoritos", icon: Heart },
  ];

  return (
    <nav className="bg-gradient-to-r from-white/60 to-blue-50/60 backdrop-blur-xl shadow-2xl border-b border-gray-200/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="w-12 h-8 md:w-16 md:h-10 rounded-lg overflow-hidden shadow-lg">
              <img 
                src="/logo.jpeg" 
                alt="JLG Consultoria" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent">
              JLG Consultoria
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className={`px-4 xl:px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    location === item.href 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="px-4 xl:px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-10 w-10 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/30 bg-white/90 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant="ghost" 
                    onClick={handleLinkClick}
                    className={`w-full justify-start px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                      location === item.href 
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full justify-start px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
