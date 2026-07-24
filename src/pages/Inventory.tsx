import React, { useState } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  ShoppingCart, 
  AlertTriangle, 
  History,
  Tag,
  ArrowRight,
  Filter
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { Product } from "../types";
import { ResponsiveDialog } from "../components/ui/ResponsiveDialog";

export default function Inventory() {
  const { products, addProduct, updateProduct, deleteProduct, schoolSettings } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Stationery",
    price: 0,
    quantity: 0,
    unit: "pcs"
  });

  const categories = ["Uniforms", "Academic Supply", "Stationery", "Library", "Food & Kitchen", "Other"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
    } else {
      await addProduct(formData);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", category: "Stationery", price: 0, quantity: 0, unit: "pcs" });
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({ 
      name: p.name, 
      category: p.category, 
      price: p.price, 
      quantity: p.quantity, 
      unit: p.unit 
    });
    setIsModalOpen(true);
  };

  const lowStockThreshold = 10;
  const lowStockItems = products.filter(p => p.quantity <= lowStockThreshold).length;
  const outOfStockItems = products.filter(p => p.quantity === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">Project Inventory</h2>
          <p className="text-gray-500 text-sm italic">Monitor and manage school assets and supplies.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: "", category: "Stationery", price: 0, quantity: 0, unit: "pcs" });
              setIsModalOpen(true);
            }}
            className="app-button-primary"
          >
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", count: products.length, icon: Package, color: "blue" },
          { label: "Low Stock Alert", count: lowStockItems, icon: AlertTriangle, color: "amber" },
          { label: "Empty Shelf", count: outOfStockItems, icon: Tag, color: "rose" },
          { label: "Store Value", count: products.reduce((s, p) => s + (p.price*p.quantity), 0), icon: ShoppingCart, color: "emerald", isCurrency: true },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl",
                item.color === "blue" ? "bg-blue-50 text-blue-600" :
                item.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                item.color === "amber" ? "bg-amber-50 text-amber-600" :
                "bg-rose-50 text-rose-600"
              )}>
                <item.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                <p className="text-xl font-black text-gray-900">
                  {item.isCurrency ? formatCurrency(item.count as number, schoolSettings.currency || "UGX") : item.count}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Find resources..."
                className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl pl-12 pr-4 py-3 text-sm transition-all"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="divide-y divide-slate-200 md:hidden">
              {products.map((product) => (
                <article key={product.id} className="app-mobile-record">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-950">{product.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{product.category}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      {formatCurrency(product.price, schoolSettings.currency || "UGX")}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium",
                      product.quantity <= lowStockThreshold ? "text-amber-700" : "text-slate-600",
                    )}>
                      {product.quantity <= lowStockThreshold && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                      {product.quantity} {product.unit} in stock
                    </span>
                    <button type="button" onClick={() => handleEdit(product)} className="app-button-secondary">Modify</button>
                  </div>
                </article>
              ))}
              {products.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="font-semibold text-slate-900">No inventory items</p>
                  <p className="mt-1 text-sm text-slate-500">Add a product to begin tracking stock.</p>
                </div>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-5">Product Name</th>
                    <th className="px-6 py-5">Category</th>
                    <th className="px-6 py-5">Stock Level</th>
                    <th className="px-6 py-5 text-right">Price</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 font-black text-gray-900 text-sm">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 rounded-lg font-bold text-gray-500 uppercase tracking-tighter">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-gray-900">{p.quantity}</p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{p.unit}</span>
                          {p.quantity <= lowStockThreshold && (
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">
                        {formatCurrency(p.price, schoolSettings.currency || "UGX")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEdit(p)}
                          className="text-white bg-gray-900 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-black active:scale-95 shadow-md shadow-gray-200"
                        >
                          Modify
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-black uppercase tracking-widest italic opacity-50">Empty Storage</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg bg-gray-900 p-5 text-white shadow-lg sm:p-6">
            <div>
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                Store Metrics
              </h3>
              <div className="space-y-6 pt-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Low Stock items</p>
                    <p className="text-2xl font-black text-blue-400">{lowStockItems}</p>
                  </div>
                  <History className="w-8 h-8 text-white/10" />
                </div>
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Total Categories</p>
                    <p className="text-2xl font-black text-emerald-400">{new Set(products.map(p => p.category)).size}</p>
                  </div>
                  <Tag className="w-8 h-8 text-white/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Stock Health</h4>
            <div className="space-y-4">
              {products.filter(p => p.quantity <= lowStockThreshold).slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tighter">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Only {p.quantity} {p.unit} remaining</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ResponsiveDialog
        open={isModalOpen}
        title={`${editingProduct ? "Manage" : "New"} Product`}
        description="Create or update an item in the school inventory."
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-md"
        footer={
          <>
            {editingProduct && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Delete this product?")) {
                    await deleteProduct(editingProduct.id);
                    setIsModalOpen(false);
                  }
                }}
                className="app-button-secondary text-rose-700 hover:bg-rose-50"
              >
                Delete
              </button>
            )}
            <button type="submit" form="inventory-form" className="app-button-primary">
              {editingProduct ? "Update Stock" : "Save Product"}
            </button>
          </>
        }
      >
            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Product Title</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-gray-900"
                  required 
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold text-gray-700"
                  >
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unit</label>
                  <input type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold" placeholder="pcs, kgs..." />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unit Price</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-blue-600" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Quantity</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-900" required />
                </div>
              </div>
            </form>
      </ResponsiveDialog>
    </div>
  );
}
