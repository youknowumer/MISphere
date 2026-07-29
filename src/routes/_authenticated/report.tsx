import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Enums"]["ticket_category"];
type Priority = Database["public"]["Enums"]["ticket_priority"];

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Report a Problem — MIS Support Hub" },
      { name: "description", content: "Open a new IT support ticket with the MIS team." },
      { property: "og:title", content: "Report a Problem — MIS Support Hub" },
      { property: "og:description", content: "Open a new IT support ticket." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

const categories: { value: Category; label: string; hint: string }[] = [
  { value: "hardware", label: "Hardware", hint: "PC, monitor, keyboard, mouse" },
  { value: "software", label: "Software", hint: "Windows, Office, apps" },
  { value: "network", label: "Network / Wi-Fi", hint: "Internet, LAN, VPN" },
  { value: "email", label: "Email", hint: "Outlook, mailbox issues" },
  { value: "access", label: "Access Request", hint: "Permissions, accounts" },
  { value: "erp", label: "ERP", hint: "Business system issues" },
  { value: "printer", label: "Printer", hint: "Printing, scanning" },
  { value: "other", label: "Other", hint: "Something else" },
];

const priorities: { value: Priority; label: string; tone: string }[] = [
  { value: "low", label: "Low", tone: "text-muted-foreground" },
  { value: "medium", label: "Medium", tone: "text-primary" },
  { value: "high", label: "High", tone: "text-warning" },
  { value: "urgent", label: "Urgent", tone: "text-destructive" },
];

function ReportPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [priority, setPriority] = useState<Priority>("medium");
  const [loading, setLoading] = useState(false);

  // Naive AI-style suggestion based on keywords
  const suggestCategory = () => {
    const t = (title + " " + description).toLowerCase();
    const rules: [Category, string[]][] = [
      ["printer", ["print", "printer", "toner"]],
      ["email", ["outlook", "mail", "inbox", "smtp"]],
      ["network", ["wifi", "wi-fi", "internet", "lan", "vpn", "network"]],
      ["erp", ["erp", "sap", "oracle"]],
      ["hardware", ["screen", "monitor", "mouse", "keyboard", "cpu", "pc", "laptop"]],
      ["software", ["windows", "office", "excel", "word", "install", "crash"]],
      ["access", ["access", "permission", "login", "password", "account"]],
    ];
    for (const [cat, keys] of rules) if (keys.some((k) => t.includes(k))) return cat;
    return "other" as Category;
  };

  const applySuggestion = () => {
    const s = suggestCategory();
    setCategory(s);
    toast.success(`AI suggested category: ${categories.find((c) => c.value === s)?.label}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please add a title and description");
      return;
    }
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        user_id: u.user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      })
      .select("id, ticket_no")
      .single();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: u.user.id,
      title: `Ticket ${data.ticket_no} created`,
      body: title.trim(),
      link: `/tickets/${data.id}`,
    });
    toast.success(`Ticket ${data.ticket_no} submitted`);
    navigate({ to: "/tickets/$id", params: { id: data.id } });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">New request</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Report a <span className="text-gradient">Problem</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Describe the issue clearly. Our AI will help route it to the right person.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-6 rounded-2xl border border-border/60 bg-surface/40 p-6 backdrop-blur"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              placeholder="e.g. Outlook not syncing on desk PC"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc">Describe the issue</Label>
              <button
                type="button"
                onClick={applySuggestion}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition hover:bg-primary/20"
              >
                <Sparkles className="h-3 w-3" /> AI Suggest Category
              </button>
            </div>
            <Textarea
              id="desc"
              required
              rows={6}
              placeholder="What happened? When did it start? Any error messages?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
            <p className="text-right text-[10px] text-muted-foreground">{description.length}/2000</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="font-medium">{c.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{c.hint}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={`font-medium ${p.tone}`}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>
              For urgent production-line outages, also call the MIS on-call line. Tickets marked
              <span className="mx-1 font-semibold text-destructive">Urgent</span>are triaged within 15 minutes.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit ticket"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
