import React, { useState } from "react";
import { 
  Scan, 
  BarChart3, 
  Package, 
  RotateCcw, 
  UserCheck, 
  ChevronDown
} from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { generateForecastAnalysis } from "../../services/forecastingEngine";

export default function Header({ currentPath, navigate }) {
  const { products, transactions, currentRole, switchRole, resetToSeedData } = useStore();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const forecast = generateForecastAnalysis(products, transactions);
  const criticalAlertsCount = forecast.reorderRecommendations.filter((r) => r.urgency === "critical").length;

  const handleRoleToggle = (role) => {
    switchRole(role);
    setShowRoleMenu(false);
    if (role === "cashier") {
      navigate("/pos");
    } else {
      navigate("/dashboard");
    }
  };

  const navItems = currentRole === "cashier"
    ? [
        { label: "Cashier POS", path: "/pos", icon: Scan }
      ]
    : [
        { label: "Dashboard", path: "/dashboard", icon: BarChart3, badge: criticalAlertsCount > 0 ? criticalAlertsCount : null },
        { label: "Inventory", path: "/inventory", icon: Package }
      ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => navigate(currentRole === "cashier" ? "/pos" : "/dashboard")}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-md bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-sm">
                <Scan className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">RetailIQ</span>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                  IN (₹)
                </span>
              </div>
            </button>

            {/* Clean Desktop Navigation with Generous Spacing */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Controls: Clean & Uncluttered */}
          <div className="flex items-center gap-3">


            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                  currentRole === "manager"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{currentRole === "manager" ? "Store Manager" : "Cashier Mode"}</span>
                <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-2xl bg-slate-900 border border-slate-700 p-1.5 z-50 animate-in fade-in">
                  <button
                    onClick={() => handleRoleToggle("cashier")}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                      currentRole === "cashier" ? "bg-slate-800 text-white font-semibold" : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span>Cashier POS Mode</span>
                    {currentRole === "cashier" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                  </button>
                  <button
                    onClick={() => handleRoleToggle("manager")}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between mt-1 ${
                      currentRole === "manager" ? "bg-slate-800 text-white font-semibold" : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span>Store Manager Mode</span>
                    {currentRole === "manager" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden border-t border-slate-800 py-2 gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1 text-[10px] font-mono rounded bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
