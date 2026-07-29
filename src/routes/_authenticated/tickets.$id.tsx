import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";
import {
  ArrowLeft,
  Loader2,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
type Message = Database["public"]["Tables"]["ticket_messages"]["Row"];
type Status = Database["public"]["Enums"]["ticket_status"];

export const Route = createFileRoute("/_authenticated/tickets/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Ticket ${params.id.slice(0, 6)} — MIS Support Hub` },
      { name: "description", content: "View ticket details and chat with the MIS support team." },
      { property: "og:title", content: "Ticket — MIS Support Hub" },
      { property: "og:description", content: "Ticket details and support chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TicketDetail,
});

const statusMeta: Record<Status, { label: string; icon: typeof Clock; cls: string }> = {
  open: { label: "Open", icon: AlertCircle, cls: "bg-warning/15 text-warning border-warning/30" },
  in_progress: { label: "In Progress", icon: Clock, cls: "bg-primary/15 text-primary border-primary/30" },
  resolved: { label: "Resolved", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
  closed: { label: "Closed", icon: XCircle, cls: "bg-muted text-muted-foreground border-border" },
};

function TicketDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u.user?.id ?? null);
      const [{ data: t }, { data: msgs }] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", id).maybeSingle(),
        supabase.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at"),
      ]);
      setTicket(t);
      setMessages(msgs ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`ticket_${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !me) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: id,
      sender_id: me,
      body: text,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setBody(text);
    }
  };

  const updateStatus = async (s: Status) => {
    const { error } = await supabase.from("tickets").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    setTicket((t) => (t ? { ...t, status: s } : t));
    toast.success(`Marked ${statusMeta[s].label}`);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!ticket) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-2xl font-bold">Ticket not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have been removed.</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/tickets" })}>
            Back to tickets
          </Button>
        </div>
      </AppShell>
    );
  }

  const sm = statusMeta[ticket.status];
  const StatusIcon = sm.icon;

  return (
    <AppShell>
      <Link
        to="/tickets"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 backdrop-blur">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_no}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${sm.cls}`}>
                <StatusIcon className="h-3 w-3" /> {sm.label}
              </span>
              <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {ticket.priority}
              </span>
              <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {ticket.category}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{ticket.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {ticket.description}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Opened {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>

          {/* Chat */}
          <div className="mt-6 flex h-[560px] flex-col rounded-2xl border border-border/60 bg-surface/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <h2 className="text-sm font-semibold">Conversation</h2>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Live · realtime
              </span>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs">Start the conversation with the MIS team below.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === me;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form
              onSubmit={send}
              className="flex items-end gap-2 border-t border-border/60 p-3"
            >
              <Textarea
                rows={1}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Type a message…"
                className="min-h-[42px] resize-none"
                maxLength={1000}
              />
              <Button type="submit" disabled={sending || !body.trim()} className="h-[42px]">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur">
            <h3 className="text-sm font-semibold">Status</h3>
            <p className="mt-1 text-xs text-muted-foreground">Update how this ticket is progressing.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["open", "in_progress", "resolved", "closed"] as Status[]).map((s) => {
                const meta = statusMeta[s];
                const active = ticket.status === s;
                const Icon = meta.icon;
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                      active
                        ? meta.cls
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" /> AI Summary
            </div>
            <p className="text-sm leading-snug">
              {ticket.description.length > 200
                ? ticket.description.slice(0, 200) + "…"
                : ticket.description}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Suggested: check the <Link to="/kb" className="underline">Knowledge Base</Link> for similar issues.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
