import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthDialog } from "./components/AuthDialog";
import { ScrollToTop } from "./components/ScrollToTop";
import { RouteAnalytics } from "./components/RouteAnalytics";
import Index from "./pages/Index";
import Diary from "./pages/Diary";
import Creditos from "./pages/Creditos";
import BoasVindasCreditos from "./pages/BoasVindasCreditos";
import RecuperarSenha from "./pages/RecuperarSenha";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
                <Route path="/creditos" element={<Creditos />} />
                <Route path="/bem-vindo-creditos" element={<BoasVindasCreditos />} />
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
