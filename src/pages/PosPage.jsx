import React, { useState, useRef, useEffect } from "react";
import { 
  Scan, 
  Camera, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  QrCode, 
  ShoppingCart, 
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import SeoHelmet from "../components/common/SeoHelmet";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import ReceiptModal from "../components/pos/ReceiptModal";
import ScannerModal from "../components/pos/ScannerModal";
import UnknownBarcodeModal from "../components/pos/UnknownBarcodeModal";
import AddProductModal from "../components/inventory/AddProductModal";

export default function PosPage({ navigate }) {
  const { 
    products, 
    cart, 
    scanOrAddProduct, 
    updateCartQuantity, 
    updateCartDiscount, 
    removeFromCart, 
    clearCart, 
    processCheckout,
    unknownBarcodeScanned,
    setUnknownBarcodeScanned,
    lastReceipt,
    setLastReceipt
  } = useStore();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanMessage, setScanMessage] = useState(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [pendingAddBarcode, setPendingAddBarcode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [cashTendered, setCashTendered] = useState("");
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [cart]);

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const result = scanOrAddProduct(barcodeInput.trim(), 1);
    if (result.success) {
      setScanMessage({ type: "success", text: `Added: ${result.product.name}` });
      setBarcodeInput("");
    } else if (result.reason === "unknown") {
      setScanMessage({ type: "error", text: `Unregistered barcode: ${barcodeInput}` });
      setBarcodeInput("");
    }
    setTimeout(() => setScanMessage(null), 3000);
  };

  const handleQuickDemoScan = (code) => {
    const result = scanOrAddProduct(code, 1);
    if (result.success) {
      setScanMessage({ type: "success", text: `Added: ${result.product.name}` });
    } else if (result.reason === "unknown") {
      setScanMessage({ type: "error", text: `Unregistered barcode: ${code}` });
    }
    setTimeout(() => setScanMessage(null), 3000);
  };

  const handleOpenCatalogForUnknown = (barcode) => {
    setPendingAddBarcode(barcode);
    setIsAddProductOpen(true);
  };

  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const gst = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const grandTotal = Math.round((subtotal + gst) * 100) / 100;

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;

    const tenderedVal = paymentMethod === "Cash" 
      ? (parseFloat(cashTendered) || grandTotal)
      : grandTotal;

    processCheckout({
      paymentMethod,
      cashierName: "Rajesh S. (POS-01)",
      cashTendered: tenderedVal
    });

    setCashTendered("");
  };

  const quickDemoItems = [
    { label: "Amul Milk (1L)", code: "8901262010053", price: "₹72", tag: "Low Stock Trigger" },
    { label: "Aashirvaad Atta (5kg)", code: "8901030382012", price: "₹265", tag: "Fast Mover" },
    { label: "Fortune Sun Oil (1L)", code: "8906007280014", price: "₹145", tag: "Reorder Test" },
    { label: "Tata Tea Gold (500g)", code: "8901052002014", price: "₹310", tag: "Beverage" },
    { label: "Maggi Noodles", code: "8901058852309", price: "₹56", tag: "Packaged" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SeoHelmet
        title="Cashier POS Terminal"
        description="High-speed retail cashier point of sale with instant barcode scanning, discount controls, and automatic inventory depletion."
      />

      <div>
        <Breadcrumbs items={[{ label: "Cashier POS Terminal" }]} navigate={navigate} />
      </div>

      {/* Clean, Quick Demo Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
          Quick-Scan Demo:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {quickDemoItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickDemoScan(item.code)}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors whitespace-nowrap flex items-center gap-2 group"
            >
              <span className="text-xs font-medium text-slate-800 group-hover:text-emerald-950">
                {item.label}
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {item.price}
              </span>
            </button>
          ))}
          <button
            onClick={() => handleQuickDemoScan("890999988887")}
            className="px-3 py-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-xs font-medium text-slate-600 transition-colors whitespace-nowrap"
          >
            + Unknown Barcode
          </button>
        </div>
      </div>

      {/* Main POS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode Reader & Cart (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barcode Search / Scan Bar */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or enter product name (e.g. 8901262010053)..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors whitespace-nowrap"
              >
                Enter
              </button>

              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                title="Open Camera Optical Scanner"
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors flex items-center justify-center"
              >
                <Camera className="w-4 h-4" />
              </button>
            </form>

            {scanMessage && (
              <div
                className={`mt-2.5 p-2 rounded text-xs flex items-center gap-2 ${
                  scanMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {scanMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{scanMessage.text}</span>
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Current Basket ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-10 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Basket is empty</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scan a barcode or click any demo item above to add products.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-3 text-right">Price</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-center">Discount</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <tr key={item.product.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.product.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.product.barcode} | Stock: {item.product.currentStock}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded-md bg-white">
                            <button
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 py-0.5 font-mono font-bold text-slate-900 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <select
                            value={item.discountPercent}
                            onChange={(e) => updateCartDiscount(item.product.id, e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="10">10%</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{item.lineTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-200">
              Billing & Settlement
            </h2>

            {/* Calculations */}
            <div className="py-4 space-y-2.5 text-xs text-slate-600 border-b border-slate-200">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span className="font-mono font-semibold text-slate-900">₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Grand Total:</span>
                <span className="font-mono text-xl text-slate-950">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Tender Options */}
            <div className="py-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("UPI")}
                  className={`py-2 px-1 text-center rounded-md border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                    paymentMethod === "UPI"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Cash")}
                  className={`py-2 px-1 text-center rounded-md border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                    paymentMethod === "Cash"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("Card")}
                  className={`py-2 px-1 text-center rounded-md border text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${
                    paymentMethod === "Card"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>
              </div>
            </div>

            {/* Cash Denominations (INR) */}
            {paymentMethod === "Cash" && (
              <div className="pb-4 space-y-2 border-b border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Cash Received:</span>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={grandTotal.toFixed(0)}
                    className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-right text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="flex gap-1.5 justify-end">
                  {[100, 200, 500].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => setCashTendered(String(denom))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono rounded border border-slate-300"
                    >
                      ₹{denom}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashTendered(grandTotal.toFixed(0))}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono rounded border border-slate-300"
                  >
                    Exact
                  </button>
                </div>

                {parseFloat(cashTendered) >= grandTotal && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 flex justify-between text-xs font-semibold">
                    <span>Change Due:</span>
                    <span className="font-mono">₹{(parseFloat(cashTendered) - grandTotal).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Complete Checkout */}
            <div className="pt-2">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleCheckoutSubmit}
                className={`w-full py-3.5 px-4 rounded-md text-sm font-bold shadow transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                }`}
              >
                <span>Checkout & Print Bill</span>
                <span className="font-mono">(₹{grandTotal.toFixed(2)})</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Auto-updates stock and triggers inventory intelligence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReceiptModal
        transaction={lastReceipt}
        onClose={() => setLastReceipt(null)}
      />

      <ScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(code) => {
          scanOrAddProduct(code, 1);
        }}
      />

      <UnknownBarcodeModal
        barcode={unknownBarcodeScanned}
        onClose={() => setUnknownBarcodeScanned(null)}
        onOpenCatalogAdd={handleOpenCatalogForUnknown}
      />

      <AddProductModal
        isOpen={isAddProductOpen}
        initialBarcode={pendingAddBarcode}
        onClose={() => {
          setIsAddProductOpen(false);
          setPendingAddBarcode("");
        }}
        onSuccess={(newProduct) => {
          scanOrAddProduct(newProduct.barcode, 1);
        }}
      />
    </div>
  );
}
