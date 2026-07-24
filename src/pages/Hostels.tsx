import React, { useState } from "react";
import { 
  Home, 
  Plus, 
  Users, 
  Trash2, 
  Edit2, 
  Search, 
  DoorOpen, 
  UserPlus, 
  Info,
  CheckCircle2,
  XCircle,
  Building2,
  ArrowRightLeft
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";
import { Dormitory, DormRoom, DormAllocation } from "../types";

export default function Hostels() {
  const { 
    dormitories, 
    addDormitory, 
    updateDormitory, 
    deleteDormitory,
    dormRooms,
    addDormRoom,
    updateDormRoom,
    deleteDormRoom,
    dormAllocations,
    allocateDorm,
    updateAllocation,
    students 
  } = useApp();

  const [activeTab, setActiveTab] = useState<"dorms" | "rooms" | "allocations">("dorms");
  const [isDormModalOpen, setIsDormModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
  const [editingRoom, setEditingRoom] = useState<DormRoom | null>(null);

  const [dormFormData, setDormFormData] = useState({ name: "", gender: "Mixed" as any, capacity: 0, wardenName: "" });
  const [roomFormData, setRoomFormData] = useState({ dormId: "", roomNumber: "", capacity: 1 });
  const [allocationFormData, setAllocationFormData] = useState({ studentId: "", roomId: "" });

  const stats = {
    totalHostels: dormitories.length,
    totalRooms: dormRooms.length,
    totalOccupants: dormAllocations.filter(a => a.status === "active").length,
    totalCapacity: dormitories.reduce((acc, d) => acc + d.capacity, 0)
  };

  const handleAddDorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDorm) {
      await updateDormitory(editingDorm.id, dormFormData);
    } else {
      await addDormitory({ ...dormFormData, rooms: [] });
    }
    setIsDormModalOpen(false);
    setEditingDorm(null);
    setDormFormData({ name: "", gender: "Mixed", capacity: 0, wardenName: "" });
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      await updateDormRoom(editingRoom.id, roomFormData as any);
    } else {
      await addDormRoom({ ...roomFormData, occupants: [] });
    }
    setIsRoomModalOpen(false);
    setEditingRoom(null);
    setRoomFormData({ dormId: "", roomNumber: "", capacity: 1 });
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === allocationFormData.studentId);
    const room = dormRooms.find(r => r.id === allocationFormData.roomId);
    const dorm = dormitories.find(d => d.id === room?.dormId);

    if (student && room && dorm) {
       await allocateDorm({
         studentId: student.id,
         studentName: student.name,
         dormId: dorm.id,
         roomId: room.id,
         allocationDate: new Date().toISOString().split('T')[0],
         status: "active"
       });
    }
    setIsAllocationModalOpen(false);
    setAllocationFormData({ studentId: "", roomId: "" });
  };

  const getOccupancyRate = (dormId: string) => {
    const rooms = dormRooms.filter(r => r.dormId === dormId);
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const currentOccupants = rooms.reduce((acc, r) => acc + (r.occupants?.length || 0), 0);
    if (totalCapacity === 0) return 0;
    return Math.round((currentOccupants / totalCapacity) * 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hostel Management</h2>
          <p className="text-gray-500 font-medium">Manage student dormitories, room allocations, and housing status.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsDormModalOpen(true);
              setEditingDorm(null);
            }}
            className="px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-xl shadow-gray-200 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Hostel
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Hostels", value: stats.totalHostels, icon: Building2, color: "blue" },
          { label: "Total Rooms", value: stats.totalRooms, icon: DoorOpen, color: "purple" },
          { label: "Active Occupants", value: stats.totalOccupants, icon: Users, color: "emerald" },
          { label: "Total Capacity", value: stats.totalCapacity, icon: Home, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                stat.color === "blue" ? "bg-blue-50 text-blue-600" :
                stat.color === "purple" ? "bg-purple-50 text-purple-600" :
                stat.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                "bg-amber-50 text-amber-600"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: "dorms", label: "Dormitories", icon: Building2 },
          { id: "rooms", label: "Room List", icon: DoorOpen },
          { id: "allocations", label: "Allocations", icon: ArrowRightLeft },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {activeTab === "dorms" && (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dormitories.map((dorm) => (
                <div key={dorm.id} className="group p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-blue-200 transition-all hover:bg-white hover:shadow-xl hover:shadow-blue-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:scale-110">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingDorm(dorm);
                          setDormFormData({ name: dorm.name, gender: dorm.gender, capacity: dorm.capacity, wardenName: dorm.wardenName || "" });
                          setIsDormModalOpen(true);
                        }}
                        className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this hostel?")) deleteDormitory(dorm.id);
                        }}
                        className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-rose-600 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-black text-gray-900 leading-tight">{dorm.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border",
                          dorm.gender === "Male" ? "bg-blue-50 text-blue-600 border-blue-100" :
                          dorm.gender === "Female" ? "bg-rose-50 text-rose-600 border-rose-100" :
                          "bg-purple-50 text-purple-600 border-purple-100"
                        )}>
                          {dorm.gender}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {dorm.capacity} Total Beds
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                       <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Occupancy</span>
                          <span className="text-xs font-bold text-gray-900">{getOccupancyRate(dorm.id)}%</span>
                       </div>
                       <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${getOccupancyRate(dorm.id)}%` }}
                          />
                       </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-gray-100 mt-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-bold">{dormRooms.filter(r => r.dormId === dorm.id).reduce((acc, r) => acc + (r.occupants?.length || 0), 0)} Occupants</span>
                      </div>
                      <button 
                         onClick={() => {
                           setRoomFormData({ ...roomFormData, dormId: dorm.id });
                           setIsRoomModalOpen(true);
                         }}
                         className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-all hover:translate-x-1"
                      >
                        Add Room <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {dormitories.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Building2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">No Hostels Found</h4>
                  <p className="text-gray-500 max-w-xs mx-auto mt-2">Start by adding your first dormitory building to the system.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "rooms" && (
           <div className="p-0">
             <div className="divide-y divide-slate-200 md:hidden">
               {dormRooms.map((room) => {
                 const dorm = dormitories.find((entry) => entry.id === room.dormId);
                 const occupied = room.occupants?.length || 0;
                 const isFull = occupied >= room.capacity;
                 return (
                   <article key={room.id} className="app-mobile-record">
                     <div className="flex items-start justify-between gap-3">
                       <div>
                         <h3 className="font-semibold text-slate-950">Room {room.roomNumber}</h3>
                         <p className="mt-1 text-sm text-slate-500">{dorm?.name || "Unknown hostel"}</p>
                       </div>
                       <span className={cn(
                         "rounded-full px-2.5 py-1 text-xs font-semibold",
                         isFull ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
                       )}>
                         {isFull ? "Full" : `${room.capacity - occupied} available`}
                       </span>
                     </div>
                     <p className="mt-3 text-sm text-slate-600">{occupied} of {room.capacity} beds occupied</p>
                     <div className="mt-3 grid grid-cols-2 gap-2">
                       <button type="button" onClick={() => {
                         setEditingRoom(room);
                         setRoomFormData({ dormId: room.dormId, roomNumber: room.roomNumber, capacity: room.capacity });
                         setIsRoomModalOpen(true);
                       }} className="app-button-secondary">Edit</button>
                       <button type="button" onClick={() => {
                         if (confirm("Delete this room?")) deleteDormRoom(room.id);
                       }} className="app-button-secondary text-rose-700 hover:bg-rose-50">Delete</button>
                     </div>
                   </article>
                 );
               })}
               {dormRooms.length === 0 && <div className="px-4 py-12 text-center text-sm text-slate-500">No rooms configured.</div>}
             </div>
             <table className="hidden w-full border-collapse text-left md:table">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room Info</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hostel</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {dormRooms.map((room) => {
                   const dorm = dormitories.find(d => d.id === room.dormId);
                   const isFull = (room.occupants?.length || 0) >= room.capacity;
                   
                   return (
                     <tr key={room.id} className="hover:bg-gray-50/50 transition-colors group">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-amber-600 transition-colors">
                              <DoorOpen className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Room {room.roomNumber}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className="text-sm font-bold text-gray-500">{dorm?.name || "Unknown"}</span>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-gray-900">{room.occupants?.length || 0}</span>
                             <span className="text-gray-300">/</span>
                             <span className="text-sm font-medium text-gray-500">{room.capacity}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                            isFull ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                          )}>
                            {isFull ? "Full" : `${room.capacity - (room.occupants?.length || 0)} Available`}
                          </span>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                               onClick={() => {
                                 setEditingRoom(room);
                                 setRoomFormData({ dormId: room.dormId, roomNumber: room.roomNumber, capacity: room.capacity });
                                 setIsRoomModalOpen(true);
                               }}
                               className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
                            >
                               <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => {
                                 if (confirm("Delete this room?")) deleteDormRoom(room.id);
                               }}
                               className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-rose-600 transition-colors shadow-sm"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
             
             <div className="p-8 text-center bg-gray-50/5 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setEditingRoom(null);
                    setRoomFormData({ dormId: dormitories[0]?.id || "", roomNumber: "", capacity: 1 });
                    setIsRoomModalOpen(true);
                  }}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mx-auto shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add New Room
                </button>
             </div>
           </div>
        )}

        {activeTab === "allocations" && (
           <div className="p-0">
             <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 bg-white sticky top-0 z-10">
               <div>
                 <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Current Occupants</h3>
                 <p className="text-xs text-gray-400 font-medium">Tracking student residence status across all hostels.</p>
               </div>
               <button 
                 onClick={() => setIsAllocationModalOpen(true)}
                 className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl shadow-emerald-100"
               >
                 <UserPlus className="w-5 h-5" />
                 Allocate Bed
               </button>
             </div>

             <div className="divide-y divide-slate-200 md:hidden">
               {dormAllocations.map((allocation) => {
                 const room = dormRooms.find((entry) => entry.id === allocation.roomId);
                 const dorm = dormitories.find((entry) => entry.id === allocation.dormId);
                 return (
                   <article key={allocation.id} className="app-mobile-record">
                     <div className="flex items-start justify-between gap-3">
                       <div className="min-w-0">
                         <h3 className="truncate font-semibold text-slate-950">{allocation.studentName}</h3>
                         <p className="mt-1 text-sm text-slate-500">Room {room?.roomNumber || "---"} · {dorm?.name || "Unknown hostel"}</p>
                       </div>
                       <span className={cn(
                         "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                         allocation.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                       )}>{allocation.status}</span>
                     </div>
                     <div className="mt-3 flex items-center justify-between gap-3">
                       <span className="text-sm text-slate-500">Allocated {allocation.allocationDate}</span>
                       {allocation.status === "active" && (
                         <button type="button" onClick={() => {
                           if (confirm(`Check out ${allocation.studentName}?`)) updateAllocation(allocation.id, { status: "checked-out" });
                         }} className="app-button-secondary text-rose-700">Check Out</button>
                       )}
                     </div>
                   </article>
                 );
               })}
               {dormAllocations.length === 0 && <div className="px-4 py-12 text-center text-sm text-slate-500">No active allocations.</div>}
             </div>
             <table className="hidden w-full border-collapse text-left md:table">
               <thead>
                 <tr className="bg-gray-50/50 border-b border-gray-100">
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Accommodation</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Allotted On</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {dormAllocations.map((alloc) => {
                    const room = dormRooms.find(r => r.id === alloc.roomId);
                    const dorm = dormitories.find(d => d.id === alloc.dormId);
                    
                    return (
                      <tr key={alloc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xs uppercase tracking-tighter">
                                {alloc.studentName.split(' ')[0][0]}{alloc.studentName.split(' ')[1]?.[0] || ""}
                              </div>
                              <span className="text-sm font-black text-gray-900 tracking-tight">{alloc.studentName}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 tracking-widest uppercase">Room {room?.roomNumber || "---"}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dorm?.name || "Unknown Hostel"}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <span className="text-xs font-bold text-gray-500">{alloc.allocationDate}</span>
                        </td>
                        <td className="px-8 py-5">
                           <span className={cn(
                             "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center w-fit gap-1",
                             alloc.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                           )}>
                             {alloc.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                             {alloc.status}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           {alloc.status === "active" && (
                             <button 
                               onClick={() => {
                                 if (confirm(`Check out ${alloc.studentName}?`)) updateAllocation(alloc.id, { status: "checked-out" });
                               }}
                               className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 transition-colors border border-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-50"
                             >
                               Check Out
                             </button>
                           )}
                        </td>
                      </tr>
                    );
                 })}

                 {dormAllocations.length === 0 && (
                   <tr>
                     <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                          <Users className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 uppercase tracking-tight">No Active Allocations</h4>
                        <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">Allocated students will appear here once you assign them to rooms.</p>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        )}
      </div>

      {/* Dorm Modal */}
      {isDormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsDormModalOpen(false)} />
          <div className="relative max-h-[calc(100dvh-0.5rem)] w-full max-w-md overflow-y-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg sm:p-6">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-6">
              {editingDorm ? "Update Hostel" : "Add New Hostel"}
            </h3>
            <form onSubmit={handleAddDorm} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hostel Name</label>
                 <input 
                  type="text" 
                  required 
                  value={dormFormData.name}
                  onChange={e => setDormFormData({...dormFormData, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. Phoenix Hall"
                 />
               </div>
               
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Gender</label>
                    <select 
                      value={dormFormData.gender}
                      onChange={e => setDormFormData({...dormFormData, gender: e.target.value as any})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500/10 transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Total Capacity</label>
                    <input 
                      type="number" 
                      required 
                      value={dormFormData.capacity}
                      onChange={e => setDormFormData({...dormFormData, capacity: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500/10 transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-1 pt-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Primary Warden</label>
                 <input 
                  type="text" 
                  value={dormFormData.wardenName}
                  onChange={e => setDormFormData({...dormFormData, wardenName: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. Mrs. Sarah Johnson"
                 />
               </div>

               <button className="w-full py-4 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-200 mt-4 active:scale-95 transition-all">
                  {editingDorm ? "Save Changes" : "Create Hostel"}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsRoomModalOpen(false)} />
          <div className="relative max-h-[calc(100dvh-0.5rem)] w-full max-w-sm overflow-y-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg sm:p-6">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-6">
               {editingRoom ? "Update Room" : "Add New Room"}
            </h3>
            <form onSubmit={handleAddRoom} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hostel</label>
                 <select 
                    value={roomFormData.dormId}
                    onChange={e => setRoomFormData({...roomFormData, dormId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none"
                 >
                   <option value="">Select Hostel</option>
                   {dormitories.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                 </select>
               </div>
               
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Room No.</label>
                  <input 
                    type="text" 
                    required 
                    value={roomFormData.roomNumber}
                    onChange={e => setRoomFormData({...roomFormData, roomNumber: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none ring-2 ring-transparent focus:ring-amber-500/10 transition-all font-mono"
                    placeholder="A-101"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Beds</label>
                  <input 
                    type="number" 
                    required 
                    value={roomFormData.capacity}
                    onChange={e => setRoomFormData({...roomFormData, capacity: parseInt(e.target.value) || 1})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none ring-2 ring-transparent focus:ring-amber-500/10 transition-all"
                  />
                </div>
               </div>

               <button className="w-full py-4 bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-50 mt-4 active:scale-95 transition-all">
                 {editingRoom ? "Save Room" : "Add Room"}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {isAllocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsAllocationModalOpen(false)} />
          <div className="relative max-h-[calc(100dvh-0.5rem)] w-full max-w-md overflow-y-auto rounded-t-lg bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg sm:p-6">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                   <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Allocate Student</h3>
             </div>

            <form onSubmit={handleAllocate} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Student</label>
                 <select 
                    required
                    value={allocationFormData.studentId}
                    onChange={e => setAllocationFormData({...allocationFormData, studentId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none"
                 >
                   <option value="">Choose Student...</option>
                   {students.filter(s => s.status === "active" && !dormAllocations.some(a => a.studentId === s.id && a.status === "active")).map(s => (
                     <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                   ))}
                 </select>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Available Bed</label>
                 <select 
                    required
                    value={allocationFormData.roomId}
                    onChange={e => setAllocationFormData({...allocationFormData, roomId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:bg-white outline-none"
                 >
                   <option value="">Choose Room...</option>
                   {dormRooms.filter(r => (r.occupants?.length || 0) < r.capacity).map(r => {
                     const dorm = dormitories.find(d => d.id === r.dormId);
                     return <option key={r.id} value={r.id}>{dorm?.name} - Rm {r.roomNumber} ({r.capacity - (r.occupants?.length || 0)} free)</option>
                   })}
                 </select>
                 <p className="text-[10px] text-gray-400 mt-1 italic flex items-center gap-1"><Info className="w-3 h-3" /> Only rooms with available capacity are shown.</p>
               </div>

               <button className="w-full py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-50 mt-4 active:scale-95 transition-all">
                  Process Allocation
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
