import React, { useState, useEffect } from "react";
import { PlusCircle, X, Package } from "lucide-react";
import { useStore } from "../../context/StoreContext";

export default function AddProductModal({ isOpen, initialBarcode = "", onClose, onSuccess }) {
  const { addProduct } = useStore();

  const [formData, setFormData] = useState({
    barcode: "",
    sku: "",
    name: "",
    brand: "",
    category: "Groceries",
    sellingPrice: "",
    costPrice: "",
    currentStock: 10,
    minSafetyStock: 12,
    supplierLeadTimeDays: 3,
    reorderPackSize: 12,
    supplierName: "",
    supplierEmail: "",
    unit: "unit"
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialBarcode) {
      if (typeof initialBarcode === "object") {
        const code = initialBarcode.barcode || "";
        setFormData((prev) => ({
          ...prev,
          barcode: code,
          sku: `SKU-${code.slice(-4)}`,
          name: initialBarcode.name || prev.name,
          brand: initialBarcode.brand || prev.brand,
          category: initialBarcode.category || prev.category,
        }));
      } else {
        const code = String(initialBarcode);
        setFormData((prev) => ({
          ...prev,
          barcode: code,
          sku: `SKU-${code.slice(-4)}`,
        }));
      }
    }
  }, [initialBarcode]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Product title is required.");
      return;
    }
    if (!formData.barcode.trim()) {
      setError("Barcode is required.");
      return;
    }
    if (!formData.sellingPrice || Number(formData.sellingPrice) <= 0) {
      setError("Valid selling price is required.");
      return;
    }

    const created = addProduct(formData);
    if (onSuccess) onSuccess(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Register New Product SKU</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Barcode Number *
              </label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="e.g. 079452200142"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SKU Identifier
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="e.g. GRO-FLOUR-01"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Product Title / Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="e.g. Organic Unbleached Bread Flour (5 lbs)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="e.g. King's Mill"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="Dairy & Breakfast">Dairy & Breakfast</option>
                <option value="Staples & Grains">Staples & Grains</option>
                <option value="Edible Oils">Edible Oils</option>
                <option value="Beverages">Beverages</option>
                <option value="Bakery & Snacks">Bakery & Snacks</option>
                <option value="Packaged Foods">Packaged Foods</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Household & Cleaning">Household & Cleaning</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="75.00"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Wholesale Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="58.00"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Initial On-Hand
              </label>
              <input
                type="number"
                name="currentStock"
                value={formData.currentStock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Min Safety Stock
              </label>
              <input
                type="number"
                name="minSafetyStock"
                value={formData.minSafetyStock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lead Time (Days)
              </label>
              <input
                type="number"
                name="supplierLeadTimeDays"
                value={formData.supplierLeadTimeDays}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reorder Pack Size
              </label>
              <input
                type="number"
                name="reorderPackSize"
                value={formData.reorderPackSize}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="e.g. Apex Wholesale Supply"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier Email
              </label>
              <input
                type="email"
                name="supplierEmail"
                value={formData.supplierEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="orders@supplier.com"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm transition-colors"
            >
              Save to Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
