import React from "react";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";

export default function TermsPage({ navigate }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SeoHelmet
        title="Terms and Conditions of Platform Service"
        description="Standard enterprise B2B platform terms, inventory software licensing, and cashier terminal operational guidelines."
      />

      <Breadcrumbs items={[{ label: "Terms and Conditions" }]} navigate={navigate} />

      <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Terms and Conditions of Platform Service
          </h1>
          <p className="text-slate-500 text-[11px] mt-1">
            Last Revised: September 18, 2026 | Document Reference: B2B-TERMS-REV-4
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. Operational Scope and License</h2>
          <p>
            This software platform is licensed strictly for retail enterprise inventory tracking, barcode point-of-sale checkout processing, and statistical demand forecasting. Authorized retail operators, store managers, and registered cashiers are granted a non-exclusive license to operate the terminal system across designated physical retail nodes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. Inventory Ledger and Register Sync</h2>
          <p>
            All stock deductions executed via the POS terminal update the store stock ledger synchronously. Store managers are responsible for periodically conducting cycle counts and manual reconciliation to rectify discrepancies resulting from shrinkage, damaged inventory, or supplier miscounts.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">3. Algorithmic Demand Forecasting and Automated Purchase Orders</h2>
          <p>
            Demand calculations, velocity projections, and suggested reorder quantities represent statistical models generated from rolling transaction velocity and supplier lead-time parameters. While the system automates purchase order drafting, store management retains final authority and financial liability for dispatching binding purchase orders to suppliers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">4. Hardware Compatibility and Optical Scanners</h2>
          <p>
            The software supports standard keyboard-wedge barcode scanners (emitting standard HID input with newline carriage return) as well as optical camera video feed decoders. ApexRetail OS is not responsible for hardware transmission faults or damaged UPC/EAN labels that impair optical readability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">5. Limitation of Liability</h2>
          <p>
            In no event shall the platform provider be liable for consequential damages, supplier stock-out disruptions, spoilage of perishable goods, or cashier tender reconciliation discrepancies arising from operational misconfigurations.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-slate-500 text-[11px]">
          <span>ApexRetail Operating Systems Corporation</span>
          <button
            onClick={() => navigate("/privacy")}
            className="text-slate-800 font-semibold hover:underline"
          >
            Review Platform Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
