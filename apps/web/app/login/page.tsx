"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [msg, setMsg] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    try { await api().post("/auth/send-otp", { phone }); setStep("otp"); setMsg("OTP sent (dev: 123456)"); }
    catch (err) { setMsg(String((err as Error).message)); }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    try {
      const d = await api().post<{ accessToken: string; user: { name?: string } }>("/auth/verify-otp", { phone, otp });
      localStorage.setItem("md_token", d.accessToken);
      setMsg(`Logged in${d.user?.name ? ` as ${d.user.name}` : ""}!`);
    } catch (err) { setMsg(String((err as Error).message)); }
  }
  return (
    <div style={{ background: "white", padding: 20, borderRadius: 8 }}>
      <h2>Login with OTP</h2>
      {step === "phone" ? (
        <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
          <input placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button>Send OTP</button>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: "flex", gap: 8 }}>
          <input placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <button>Verify</button>
        </form>
      )}
      <p>{msg}</p>
    </div>
  );
}
