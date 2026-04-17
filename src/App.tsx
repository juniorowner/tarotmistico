import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthDialog } from "./components/AuthDialog";
import { ScrollToTop } from "./components/ScrollToTop";
import { RouteAnalytics } from "./components/RouteAnalytics";
import Index from "./pages/Index";
import Diary from "./pages/Diary";
import Creditos from "./pages/Creditos";
import BoasVindasCreditos from "./pages/BoasVindasCreditos";
import Admin from "./pages/Admin";
import AdminUserDetail from "./pages/AdminUserDetail";
import RecuperarSenha from "./pages/RecuperarSenha";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Pacotes e preços só para sessão iniciada (evita assustar visitantes). */
function CreditosRouteGate() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground font-body">A carregar…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <Creditos />;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            <BrowserRouter>
              <ScrollToTop />
              <RouteAnalytics />
              <AuthDialog />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/diario" element={<Diary />} />
                <Route path="/creditos" element={<CreditosRouteGate />} />
                <Route path="/bem-vindo-creditos" element={<BoasVindasCreditos />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/user/:userId" element={<AdminUserDetail />} />
                <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
