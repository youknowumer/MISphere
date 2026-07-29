import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Building2, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MIS Support Hub" },
      { name: "description", content: "Sign in or create your MIS Support Hub account to report and track internal IT issues." },
      { property: "og:title", content: "Sign in — MIS Support Hub" },
      { property: "og:description", content: "Access the internal MIS helpdesk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up state
  const [fullName, setFullName] = useState("");
  const [empId, setEmpId] = useState("");
  const [department, setDepartment] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          employee_id: empId,
          department,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! You're signed in.");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (!result.redirected) {
      navigate({ to: "/dashboard", replace: true });
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-hero" aria-hidden />
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mb-8">
          <BrandLogo size="lg" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-surface/60 p-6 shadow-elegant backdrop-blur">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Work email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="si-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="pl-9"
                      placeholder="you@leentextile.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pass">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="si-pass"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="su-name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      placeholder="Ahmed Khan"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-emp">Employee ID</Label>
                    <Input
                      id="su-emp"
                      required
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                      placeholder="LT-1024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-dept">Department</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="su-dept"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="pl-9"
                        placeholder="Weaving"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Work email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="su-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="pl-9"
                      placeholder="you@leentextile.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="su-pass"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="pl-9"
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.75-6-6.15S8.7 5.9 12 5.9c1.9 0 3.15.8 3.87 1.5l2.65-2.55C16.9 3.3 14.7 2.3 12 2.3 6.85 2.3 2.7 6.45 2.7 11.55S6.85 20.8 12 20.8c6.9 0 9.2-4.85 9.2-7.35 0-.5-.05-.88-.12-1.25H12z" />
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to the internal IT usage policy.
        </p>
      </div>
    </div>
  );
}
