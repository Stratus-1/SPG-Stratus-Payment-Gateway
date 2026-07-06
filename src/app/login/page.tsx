"use client";

import { BarChart3, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const configured = hasSupabaseConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithPassword() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      setMessage("Magic link sent. Check the finance inbox.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <Card className="w-full max-w-md border-white/10 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Stratus
            </div>
            <h1 className="text-xl font-semibold text-slate-950">Finance Login</h1>
          </div>
        </div>

        {!configured ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Supabase is not configured. Add `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`, then run the SQL schema.
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-4">
          <Field label="Email">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>
          <Button onClick={signInWithPassword} disabled={!configured || loading || !email || !password}>
            <KeyRound size={16} />
            Sign in
          </Button>
          <Button
            variant="secondary"
            onClick={sendMagicLink}
            disabled={!configured || loading || !email}
          >
            <Mail size={16} />
            Send magic link
          </Button>
        </div>
      </Card>
    </main>
  );
}
