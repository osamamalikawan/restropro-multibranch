"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
export default function Login() {
  const [email, setE] = useState(""); const [pw, setP] = useState(""); const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message); else location.href = "/";
  }
  return (<form onSubmit={go} className="card" style={{ maxWidth: 360, margin: "60px auto" }}>
    <h3>Owner sign in</h3>
    <div className="row"><input style={{ flex: 1 }} placeholder="Email" value={email} onChange={e => setE(e.target.value)} /></div>
    <div className="row"><input style={{ flex: 1 }} type="password" placeholder="Password" value={pw} onChange={e => setP(e.target.value)} /></div>
    <button>Sign in</button>{err && <p className="low">{err}</p>}</form>);
}
