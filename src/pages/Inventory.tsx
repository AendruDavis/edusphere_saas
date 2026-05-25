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
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
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
          <div key={item.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
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

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
          <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
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
            {/* Glossy background detail */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative group overflow-hidden">
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{editingProduct ? "Manage" : "New"} Product</h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Store Inventory Entry</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><Plus className="w-8 h-8 rotate-45" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unit Price</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-blue-600" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Quantity</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-900" required />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                {editingProduct && (
                  <button 
                    type="button"
                    onClick={async () => {
                      if(confirm("Delete this product?")) {
                        await deleteProduct(editingProduct.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-50 text-rose-600 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all font-mono"
                  >
                    Delete
                  </button>
                )}
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
                  {editingProduct ? "Update Stock" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
