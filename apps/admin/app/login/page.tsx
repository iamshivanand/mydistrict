"use client";
import { useState } from "react";
import { createApiClient } from "@mydistrict/api-client";
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function AdminLogin() {
  const [phone, setPhone] = useState("9999999999");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const client = createApiClient({ baseUrl, getToken: () => null });
  return (
    <div style={{ background: "#1e293b", padding: 20, borderRadius: 8 }}>
      <h2>Admin Login (OTP)</h2>
      <p>Seeded super-admin phone: 9999999999 (dev OTP 123456). Promote others via DB role=ADMIN.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button onClick={async () => { await client.post("/auth/send-otp", { phone }); setMsg("OTP sent"); }}>Send OTP</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
        <button onClick={async () => {
          const d = await client.post<{ adminToken: string }>("/auth/verify-otp", { phone, otp });
          localStorage.setItem("md_admin_token", d.adminToken);
          setMsg("Admin logged in!");
        }}>Verify</button>
      </div>
      <p>{msg}</p>
    </div>
  );
}
