import React, { useState } from "react";
import { 
  Bus, 
  MapPin, 
  Users, 
  Plus, 
  Search, 
  Map as MapIcon,
  Navigation,
  Clock,
  Settings,
  AlertTriangle,
  History
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { Vehicle, Route as TransportRoute } from "../types";

export default function Transport() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle, routes, addRoute, updateRoute, deleteRoute, schoolSettings, staff } = useApp();
  const [activeTab, setActiveTab] = useState<"fleet" | "routes" | "tracking">("fleet");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = vehicles.filter(v => 
    v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoutes = routes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Transport Management</h1>
          <p className="text-gray-500 font-medium">Manage fleet, routes, and real-time tracking</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "fleet" && (
            <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          )}
          {activeTab === "routes" && (
            <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
              <Plus className="w-4 h-4" />
              Create Route
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-2xl inline-flex border border-gray-100 shadow-sm">
        {(["fleet", "routes", "tracking"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all capitalize",
              activeTab === tab 
                ? "bg-gray-900 text-white shadow-md" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {activeTab !== "tracking" && (
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Content Area */}
      {activeTab === "fleet" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    vehicle.status === "active" ? "bg-emerald-50 text-emerald-600" :
                    vehicle.status === "maintenance" ? "bg-amber-50 text-amber-600" :
                    "bg-rose-50 text-rose-600"
                  )}>
                    {vehicle.status}
                  </div>
                </div>
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Bus className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">{vehicle.plateNumber}</h3>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{vehicle.model}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Driver</span>
                    <span className="text-gray-900 font-black">{vehicle.driverName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Capacity</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-500" />
                      <span className="text-gray-900 font-black">{vehicle.capacity} Seats</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Status</span>
                    <span className="text-gray-900 font-black">{vehicle.status}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-dashed border-gray-100 flex gap-2">
                  <button className="flex-1 py-2 rounded-xl text-xs font-black bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors uppercase tracking-widest">
                    Details
                  </button>
                  <button className="flex-1 py-2 rounded-xl text-xs font-black bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors uppercase tracking-widest">
                    Maintenance
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Bus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No vehicles found in fleet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "routes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRoutes.length > 0 ? (
            filteredRoutes.map((route) => (
              <div key={route.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900">{route.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {route.morningStartTime} AM • {route.eveningStartTime} PM
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stops</p>
                    <p className="text-xl font-black text-gray-900">{route.stops.length}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {route.stops.slice(0, 3).map((stop, index) => (
                    <div key={index} className="flex items-center gap-4 group/stop">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                        {index < 2 && <div className="w-0.5 h-8 bg-gray-100" />}
                      </div>
                      <div className="flex-1 flex items-center justify-between py-1">
                        <span className="text-sm font-bold text-gray-700">{stop.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium text-gray-400">{stop.time}</span>
                          <span className="text-xs font-black text-indigo-600">{formatCurrency(stop.fee, schoolSettings.currency || "UGX")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {route.stops.length > 3 && (
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center pt-2">
                       + {route.stops.length - 3} more stops
                    </p>
                  )}
                </div>

                <div className="mt-8 flex gap-2">
                  <button className="flex-1 py-3 rounded-2xl text-xs font-black bg-gray-900 text-white hover:bg-gray-800 transition-colors uppercase tracking-widest shadow-lg shadow-gray-200">
                    Edit Route
                  </button>
                  <button className="py-3 px-6 rounded-2xl text-xs font-black bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors uppercase tracking-widest">
                    Assign Bus
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No transport routes defined</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2 bg-gray-100 rounded-[32px] overflow-hidden min-h-[500px] relative shadow-inner border border-gray-200">
             {/* Mock Map Background */}
             <div className="absolute inset-0 bg-slate-200" style={{
               backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
               backgroundSize: '24px 24px'
             }} />
             
             {/* Map Controls */}
             <div className="absolute top-4 right-4 flex flex-col gap-2">
               <button className="p-3 bg-white rounded-2xl shadow-xl text-gray-600 hover:text-indigo-600 transition-all font-black">
                 <Plus className="w-5 h-5" />
               </button>
               <button className="p-3 bg-white rounded-2xl shadow-xl text-gray-600 hover:text-indigo-600 transition-all font-black">
                 <div className="w-5 h-0.5 bg-current rounded-full" />
               </button>
             </div>

             {/* Mock Markers */}
             <div className="absolute top-1/4 left-1/3 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-xl border border-gray-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">Bus 01 - Moving</p>
                    <p className="text-sm font-black text-gray-900 leading-none">Northern Heights Route</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 ring-white relative z-10 animate-pulse-slow">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div className="absolute -inset-2 bg-indigo-400/20 rounded-full animate-ping duration-1000" />
                </div>
             </div>

             <div className="absolute bottom-1/3 right-1/4 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-xl border border-gray-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 leading-none">Bus 02 - Stopped</p>
                    <p className="text-sm font-black text-gray-900 leading-none">Main St Station</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-amber-200 ring-4 ring-white relative z-10">
                    <Bus className="w-5 h-5" />
                  </div>
                </div>
             </div>

             <div className="absolute bottom-6 left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 backdrop-blur-sm bg-white/90">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-xs font-black text-gray-900 uppercase tracking-widest">GPS Tracker Active</p>
               </div>
               <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">Last synchronization: Just now</p>
             </div>
          </div>

          {/* Tracking Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600" />
                Live Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 font-black">01</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-gray-900">Bus A - KCB 123X</p>
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Moving</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500">Speed: 45 km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 opacity-60">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 border border-amber-100 font-black">02</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-gray-900">Bus B - KDC 456Y</p>
                      <span className="text-[10px] font-black text-amber-600 uppercase">Stationary</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500">Duration: 12 mins</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Recent Alerts
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-gray-900">Bus 01 Over-speeding</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">85 km/h detected at Northern Exit</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-gray-900">Bus 02 Route Deviation</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">Off-course by 400m on Main St</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 py-2 rounded-xl text-[10px] font-black text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-100 transition-all uppercase tracking-widest">
                View All Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
