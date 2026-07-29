import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import type { Database } from "@/integrations/supabase/types";
import { PlusCircle, Search, Loader2, ChevronRight, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
type Status = Database["public"]["Enums"]["ticket_status"] | "all";

export const Route = createFileRoute("/_authenticated/tickets/")({
  head: () => ({
    meta: [
      { title: "My Tickets — MIS Support Hub" },
      { name: "description", content: "Track all your MIS support tickets." },
      { property: "og:title", content: "My Tickets — MIS Support Hub" },
      { property: "og:description", content: "All your IT tickets in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TicketsList,
});

const statusStyles: Record<string, string> = {
  open: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  resolved: "bg-success/15 text-success border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
};
const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};
const priorityDot: Record<string, string> = {
  low: "bg-muted-foreground",
  medium: "bg-primary",
  high: "bg-warning",
  urgent: "bg-destructive",
};

function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      setTickets(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = tickets.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (q && !`${t.ticket_no} ${t.title}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">All requests</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">My Tickets</h1>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          <PlusCircle className="h-4 w-4" /> New Ticket
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ID or title…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface/40 backdrop-blur">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tickets match your filters.</p>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <PlusCircle className="h-4 w-4" /> Report a problem
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  to="/tickets/$id"
                  params={{ id: t.id }}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.ticket_no}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusStyles[t.status]}`}
                      >
                        {statusLabel[t.status]}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[t.priority]}`} />
                        {t.priority}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        · {t.category}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">{t.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Updated {new Date(t.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
