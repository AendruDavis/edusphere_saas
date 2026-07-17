import React from "react";
import { Send, MessageSquare, Users } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ValidatedForm } from "../components/ui/ValidatedForm";

type MessageRow = Record<string, unknown> & {
  id: string;
  target: string;
  channel: string;
  subject?: string | null;
  body: string;
  status: string;
  createdAt: string;
  recipients?: unknown[];
};

export default function Communication() {
  const { schoolSettings } = useApp();
  const toast = useToast();
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    to: "all_parents",
    channel: "email",
    className: schoolSettings.classes[0] || "",
    recipient: "",
    subject: "",
    body: "",
  });

  const refresh = React.useCallback(async () => {
    try {
      setMessages(await apiRequest<MessageRow[]>("/api/communication/messages"));
    } catch (error: any) {
      toast.error(error.message || "Could not load communication history.");
    }
  }, [toast]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendMessage = async () => {
    setLoading(true);
    try {
      await apiRequest("/api/communication/send", {
        method: "POST",
        json: {
          ...form,
          className: form.to === "specific_class" ? form.className : undefined,
          recipient: form.to === "specific_recipient" ? form.recipient : undefined,
        },
      });
      setForm((current) => ({ ...current, subject: "", body: "" }));
      toast.success("Message queued for delivery.");
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not send message.");
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn<MessageRow>[] = [
    { key: "createdAt", header: "Date", accessor: (row) => new Date(row.createdAt).toLocaleString(), sortValue: (row) => row.createdAt },
    { key: "target", header: "Target", accessor: (row) => row.target },
    { key: "channel", header: "Channel", accessor: (row) => row.channel },
    { key: "subject", header: "Subject", accessor: (row) => row.subject || "Notice" },
    {
      key: "status",
      header: "Status",
      accessor: (row) => <StatusBadge tone={row.status === "failed" ? "danger" : "success"}>{row.status}</StatusBadge>,
    },
    {
      key: "recipients",
      header: "Recipients",
      accessor: (row) => Array.isArray(row.recipients) ? row.recipients.length : 0,
      sortValue: (row) => Array.isArray(row.recipients) ? row.recipients.length : 0,
    },
  ];

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-page-kicker">People</p>
          <h1 className="app-page-title">Communication Center</h1>
          <p className="app-page-subtitle">Send school notices through approved parent and staff channels.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="app-panel">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">New Notice</h2>
              <p className="text-sm text-slate-500">Keep messages brief and purpose-bound.</p>
            </div>
          </div>

          <ValidatedForm onSubmit={sendMessage}>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Recipients</span>
              <select className="app-select" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })}>
                <option value="all_parents">All Parents</option>
                <option value="all_staff">All Staff</option>
                <option value="specific_class">Specific Class</option>
                <option value="specific_recipient">Specific Recipient</option>
              </select>
            </label>

            {form.to === "specific_class" && (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Class</span>
                <select className="app-select" value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })}>
                  {schoolSettings.classes.map((className) => <option key={className} value={className}>{className}</option>)}
                </select>
              </label>
            )}

            {form.to === "specific_recipient" && (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Recipient</span>
                <input className="app-input" required value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} placeholder="email, phone, or WhatsApp number" />
              </label>
            )}

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Channel</span>
              <select className="app-select" value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="all">Email + SMS + WhatsApp</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Subject</span>
              <input className="app-input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Brief subject" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Message</span>
              <textarea className="app-input min-h-36" required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Write a clear notice..." />
            </label>

            <button type="submit" disabled={loading} className="app-button-primary w-full justify-center">
              <Send className="h-4 w-4" />
              {loading ? "Queueing..." : "Send Notice"}
            </button>
          </ValidatedForm>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4 text-blue-600" />
            Recent Broadcasts
          </div>
          <DataTable rows={messages} columns={columns} searchPlaceholder="Search messages..." exportFilename="communication-history" />
        </section>
      </div>
    </div>
  );
}
