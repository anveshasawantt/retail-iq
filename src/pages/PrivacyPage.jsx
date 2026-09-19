import React from "react";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";

export default function PrivacyPage({ navigate }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SeoHelmet
        title="Privacy Policy and Transaction Data Protection"
        description="Data collection standards, cashier audit logging, and customer payment security policies for ApexRetail OS."
      />

      <Breadcrumbs items={[{ label: "Privacy Policy" }]} navigate={navigate} />

      <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Privacy Policy and Transaction Data Protection
          </h1>
          <p className="text-slate-500 text-[11px] mt-1">
            Last Updated: September 18, 2026 | Document Reference: B2B-PRIV-REV-3
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. Data Architecture and Local Storage</h2>
          <p>
            ApexRetail OS operates with a local-first in-memory architecture. Transaction receipts, catalog items, and stock level records reside within the store terminal memory and localized browser cache storage. No telemetry or unencrypted transaction streams are broadcast to third-party ad networks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. Payment and Customer Financial Information</h2>
          <p>
            The platform does not store raw credit card numbers, CVV verification digits, or bank PINs. All simulated card authorizations record only high-level payment identifiers, transaction authorization tokens, and timestamped tender categories for bookkeeping reconciliation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">3. Employee Session and Audit Logs</h2>
          <p>
            To maintain internal control standards and deter inventory shrinkage, the system associates transactions, manual stock overrides, and purchase order dispatches with the active logged-in employee session identifier (such as Station #01 Cashier or Store Manager).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">4. Optical Scanner Video Streams</h2>
          <p>
            When utilizing the optical barcode camera scanner, video frame data is processed strictly in local client memory via the browser canvas API for barcode geometry extraction. No video feeds or customer imagery are saved to disk or transmitted across network interfaces.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-slate-500 text-[11px]">
          <span>ApexRetail Compliance and Security Unit</span>
          <button
            onClick={() => navigate("/terms")}
            className="text-slate-800 font-semibold hover:underline"
          >
            Review Terms and Conditions
          </button>
        </div>
      </div>
    </div>
  );
}
