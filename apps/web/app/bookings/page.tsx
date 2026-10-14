"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Bookings() {
  const [list, setList] = useState<{ id: string; status: string; paymentStatus: string; paymentMode: string; priceQuoted: number; service: { name: string }; completionOtp?: string }[]>([]);
  const [msg, setMsg] = useState("");
  function load() {
    api().get<{ bookings: typeof list }>("/bookings/mine").then((d) => setList(d.bookings)).catch((e) => setMsg(String(e)));
  }
  useEffect(load, []);
  async function showCode(id: string) {
    try {
      const d = await api().get<{ code: string }>(`/bookings/${id}/completion-code`);
      setMsg(`Share this OTP with provider at completion: ${d.code}`);
    } catch (e) { setMsg(String(e)); }
  }
  async function review(id: string) {
    const rating = Number(prompt("Rating 1-5?") ?? "5");
    const comment = prompt("Comment?") ?? "";
    try { await api().post(`/bookings/${id}/review`, { rating, comment }); setMsg("Thanks for rating!"); load(); }
    catch (e) { setMsg(String(e)); }
  }
  return (
    <div>
      <h2>My Bookings</h2>
      <p>{msg}</p>
      {list.map((b) => (
        <div key={b.id} style={{ background: "white", padding: 12, borderRadius: 8, marginBottom: 8 }}>
          <strong>{b.service.name}</strong> — {b.status} · {b.paymentMode}/{b.paymentStatus} · ₹{b.priceQuoted}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => showCode(b.id)}>Show completion OTP</button>
            {b.status === "COMPLETED" && <button onClick={() => review(b.id)}>Rate</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
