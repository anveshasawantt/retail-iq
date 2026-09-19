import React from "react";
import { StoreProvider, useStore } from "./context/StoreContext";
import { useRouter } from "./utils/navigation";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import PosPage from "./pages/PosPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFoundPage from "./pages/NotFoundPage";
import { ShieldAlert, Scan } from "lucide-react";

function AppContent() {
  const { path, params, navigate } = useRouter();
  const { currentRole, switchRole } = useStore();

  const renderCurrentPage = () => {
    // 1. Role Guard: Cashier Mode (only POS available)
    if (currentRole === "cashier") {
      if (path === "/dashboard" || path === "/inventory" || path === "/product") {
        return (
          <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Store Manager Access Required
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              This operational screen is only available in Store Manager Mode. You are currently in Cashier Mode.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => navigate("/pos")}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors"
              >
                Return to Cashier POS
              </button>
            </div>
          </div>
        );
      }
    }

    // 2. Role Guard: Store Manager Mode (Dashboard and Inventory available)
    if (currentRole === "manager") {
      if (path === "/pos") {
        return (
          <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Scan className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Cashier Terminal Mode Required
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              The POS register terminal is reserved for cashier checkout. As a Store Manager, you have access to the Operations Dashboard and Inventory Directory.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md border border-slate-300 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  switchRole("cashier");
                  navigate("/pos");
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors"
              >
                Switch to Cashier Mode
              </button>
            </div>
          </div>
        );
      }
    }

    // Standard Routes
    switch (path) {
      case "/pos":
        return <PosPage navigate={navigate} />;
      case "/dashboard":
        return <DashboardPage navigate={navigate} />;
      case "/inventory":
        return <InventoryPage navigate={navigate} />;
      case "/product":
        return <ProductDetailPage productId={params.id} navigate={navigate} />;
      case "/terms":
        return <TermsPage navigate={navigate} />;
      case "/privacy":
        return <PrivacyPage navigate={navigate} />;
      case "/404":
      default:
        return <NotFoundPage navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-slate-200">
      <Header currentPath={path} navigate={navigate} />
      <main className="flex-1">
        {renderCurrentPage()}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
