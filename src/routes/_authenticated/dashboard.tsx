import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  Ticket,
  MessageSquare,
  BookOpen,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MIS Support Hub" },
      { name: "description", content: "Your MIS Support Hub dashboard: report issues, track tickets, and chat with the IT team." },
      { property: "og:title", content: "Employee Dashboard — MIS Support Hub" },
      { property: "og:description", content: "Track your internal IT tickets in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Profile = { full_name: string | null; employee_id: string | null; department: string | null; email: string | null };

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

function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, employee_id, department, email")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("tickets")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setTickets(t ?? []);
    })();
  }, []);

  const firstName =
    profile?.full_name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "there";

  const counts = tickets.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const stats = [
    { key: "open", label: "Open", value: counts.open ?? 0, icon: AlertCircle, tone: "text-warning" },
    { key: "in_progress", label: "In progress", value: counts.in_progress ?? 0, icon: Clock, tone: "text-primary" },
    { key: "resolved", label: "Resolved", value: counts.resolved ?? 0, icon: CheckCircle2, tone: "text-success" },
    { key: null as string | null, label: "Total", value: tickets.length, icon: TrendingUp, tone: "text-accent" },
  ];

  // Interlinked filter: charts + list all respect activeStatus/activeCategory
  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (!activeStatus || t.status === activeStatus) &&
          (!activeCategory || t.category === activeCategory),
      ),
    [tickets, activeStatus, activeCategory],
  );

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach((t) => (map[t.status] = (map[t.status] ?? 0) + 1));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((t) => (map[t.category] = (map[t.category] ?? 0) + 1));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const trendData = useMemo(() => {
    const days: { day: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const count = filtered.filter((t) => t.created_at.slice(0, 10) === key).length;
      days.push({ day: label, count });
    }
    return days;
  }, [filtered]);

  const STATUS_COLORS: Record<string, string> = {
    open: "hsl(var(--warning))",
    in_progress: "hsl(var(--primary))",
    resolved: "hsl(var(--success))",
    closed: "hsl(var(--muted-foreground))",
  };

  const recent = filtered.slice(0, 5);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {firstName} <span className="text-gradient">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.employee_id ? `ID ${profile.employee_id} · ` : ""}
            {profile?.department ?? "MIS Support Hub"}
          </p>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          <PlusCircle className="h-4 w-4" /> Report a Problem
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const isActive = activeStatus === s.key && s.key !== null;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setActiveStatus(isActive ? null : s.key)}
              className={`rounded-2xl border p-4 text-left backdrop-blur transition ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border/60 bg-surface/60 hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.tone}`} />
              </div>
              <p className="mt-3 text-3xl font-bold">{s.value}</p>
            </button>
          );
        })}
      </div>

      {(activeStatus || activeCategory) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Filtering:</span>
          {activeStatus && (
            <button
              onClick={() => setActiveStatus(null)}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/20"
            >
              status: {activeStatus} ✕
            </button>
          )}
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/20"
            >
              category: {activeCategory} ✕
            </button>
          )}
        </div>
      )}

      {tickets.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur">
            <h3 className="mb-3 text-sm font-semibold">Status breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  onClick={(e: { name?: string }) =>
                    setActiveStatus(activeStatus === e?.name ? null : (e?.name ?? null))
                  }
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] ?? "hsl(var(--primary))"}
                      opacity={!activeStatus || activeStatus === entry.name ? 1 : 0.3}
                      cursor="pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur">
            <h3 className="mb-3 text-sm font-semibold">By category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  cursor="pointer"
                  onClick={(e: { name?: string }) =>
                    setActiveCategory(activeCategory === e?.name ? null : (e?.name ?? null))
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-2xl border border-border/60 bg-surface/40 p-5 backdrop-blur">
            <h3 className="mb-3 text-sm font-semibold">Last 14 days</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--surface))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border/60 bg-surface/40 p-6 backdrop-blur lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My recent tickets</h2>
            <Link to="/tickets" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
              <Link
                to="/report"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <PlusCircle className="h-4 w-4" /> Create your first ticket
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recent.map((t) => (
                <Link
                  key={t.id}
                  to="/tickets/$id"
                  params={{ id: t.id }}
                  className="flex items-center justify-between gap-4 py-4 transition hover:opacity-80"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.ticket_no}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusStyles[t.status]}`}
                      >
                        {statusLabel[t.status]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} · Updated {new Date(t.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <QuickAction to="/report" icon={Ticket} title="Report a problem" desc="Open a new ticket with AI-assisted triage." />
          <QuickAction to="/tickets" icon={MessageSquare} title="My tickets" desc="Track status and chat with support." />
          <QuickAction to="/kb" icon={BookOpen} title="Knowledge base" desc="Self-help guides and past resolutions." />
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" /> AI Tip
            </div>
            <p className="text-sm font-medium leading-snug">
              Attach a screenshot when reporting — our AI classifies faster and suggests fixes instantly.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: "/report" | "/tickets" | "/kb";
  icon: typeof Ticket;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/60 p-4 backdrop-blur transition hover:border-primary/50 hover:bg-surface"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
    </Link>
  );
}
