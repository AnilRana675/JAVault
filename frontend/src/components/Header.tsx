import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Shield, LogOut } from "lucide-react";

const Header = () => {
  const { isAdmin, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border animate-fade-in">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2 animate-scale-in">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 animate-pulse-glow">
              <span className="text-primary-foreground font-bold">JV</span>
            </div>
            <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
              JAVault
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Link to="/" className="text-sm font-medium hover:text-primary transition-smooth hover:scale-105 transform relative after:absolute after:w-full after:h-0.5 after:bg-primary after:bottom-0 after:left-0 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100">
              Home
            </Link>
            <Link to="/library" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:scale-105 transform relative after:absolute after:w-full after:h-0.5 after:bg-primary after:bottom-0 after:left-0 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100">
              Library
            </Link>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth hover:scale-105 transform relative after:absolute after:w-full after:h-0.5 after:bg-primary after:bottom-0 after:left-0 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100">
              Discover
            </a>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {isAdmin ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Admin</span>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Shield className="w-4 h-4 mr-2" />
                Admin Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;