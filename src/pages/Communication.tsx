import React, { useState } from "react";
import { 
  Send, 
  MessageSquare, 
  Users, 
  UserSquare2, 
  History, 
  Bell, 
  Search,
  Filter,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { cn } from "../lib/utils";

interface Message {
  id: string;
  target: string;
  subject: string;
  content: string;
  date: string;
  status: "sent" | "failed";
}

export default function Communication() {
  const [targetType, setTargetType] = useState<"all" | "selective">("all");
  const [messages] = useState<Message[]>([
    { id: "1", target: "All Parents", subject: "Sports Day Rescheduled", content: "Dear parents, please note that...", date: "2026-05-14", status: "sent" },
    { id: "2", target: "Staff Only", subject: "Emergency Meeting", content: "There is a brief meeting today...", date: "2026-05-13", status: "sent" },
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Communication Center</h2>
          <p className="text-gray-500 text-sm">Send notices, mass messages, and keep contacts updated.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-all">
            <History className="w-4 h-4 text-gray-400" />
            Message History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Write New Notice</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Select Recipients
                </label>
                <div className="flex gap-4">
                  {(["all", "parents", "staff", "selective"] as const).map((type) => (
                    <button 
                      key={type}
                      onClick={() => setTargetType(type === "selective" ? "selective" : "all")}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl border-2 font-bold text-xs uppercase transition-all",
                        targetType === (type === "selective" ? "selective" : "all")
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Notice Subject</label>
                  <input 
                    type="text" 
                    placeholder="Brief title of the message"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Message Content</label>
                  <textarea 
                    rows={6}
                    placeholder="Write your message here... You can use template variables like {STUDENT_NAME}"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Bell className="w-5 h-5" />
                  </button>
                </div>
                <button className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                  <Send className="w-4 h-4" />
                  Send Notice Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Recent Broadcasts
            </h3>
            
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 group relative">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{msg.target}</span>
                    <span className="text-[10px] text-gray-400">{msg.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">{msg.subject}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{msg.content}</p>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button className="text-[10px] font-bold text-gray-400 hover:text-red-500">DELETE</button>
                    <button className="text-[10px] font-bold text-blue-600 hover:underline">VIEW FULL</button>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-3 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all">
              View All History
            </button>
          </div>

          <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-xl shadow-blue-100 space-y-4">
            <div className="p-2 bg-white/20 rounded-xl w-fit">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold leading-tight">Sync Contacts Automatically</h4>
            <p className="text-[11px] text-blue-100 leading-relaxed italic">
              When you admit a new student, their parent's email and phone are automatically added to your contact list for broadcasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
