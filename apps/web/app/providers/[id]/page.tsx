"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function ProviderDetail({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ provider: { displayName: string; bio?: string; avgRating: number; showLocation: boolean; lat?: number; lng?: number; services: { serviceId: string; service: { id: string; name: string }; price: number }[] }; reviews: { rating: number; comment?: string }[] } | null>(null);
  const [form, setForm] = useState({ serviceId: "", scheduledAt: "", addressText: "", paymentMode: "OFFLINE" as "ONLINE" | "OFFLINE" });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api().get(`/providers/${params.id}`).then(setData as never).catch((e) => setMsg(String(e)));
  }, [params.id]);
  async function book(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const token = localStorage.getItem("md_token");
      if (!token) { setMsg("Login first (top-right)."); return; }
      const providerUserId = (await api().get<{ provider: { userId?: string } }>(`/providers/${params.id}`) as unknown as { provider: { userId: string } }).provider.userId;
      // Fallback: API booking needs provider USER id; detail returns profile — fetch via list? Use stored id mapping:
      const res = await api().post<{ booking: { id: string } }>("/bookings", {
        providerId: (window as unknown as { __providerUserId?: string }).__providerUserId ?? providerUserId ?? "",
        serviceId: form.serviceId, scheduledAt: new Date(form.scheduledAt).toISOString(),
        addressText: form.addressText, paymentMode: form.paymentMode,
      });
      setMsg(`Booked! ID ${res.booking.id}. Pay ${form.paymentMode === "ONLINE" ? "online via Razorpay on bookings page" : "cash/UPI to provider"}.`);
    } catch (err) { setMsg(String((err as Error).message)); }
  }
  if (!data) return <p>Loading… {msg}</p>;
  return (
    <div>
      <h2>{data.provider.displayName} · ⭐ {data.provider.avgRating.toFixed(1)}</h2>
      <p>{data.provider.bio}</p>
      {data.provider.showLocation && data.provider.lat ? <p>📍 Shop location shared — <a href={`https://maps.google.com/?q=${data.provider.lat},${data.provider.lng}`} target="_blank">Get directions</a></p> : null}
      <h3>Book a service</h3>
      <form onSubmit={book} style={{ display: "grid", gap: 8, background: "white", padding: 16, borderRadius: 8 }}>
        <select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
          <option value="">Choose service</option>
          {data.provider.services.map((s) => <option key={s.serviceId} value={s.serviceId}>{s.service.name} — ₹{s.price}</option>)}
        </select>
        <input required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        <input required placeholder="Your address" value={form.addressText} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
        <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as never })}>
          <option value="OFFLINE">Cash / UPI to provider</option>
          <option value="ONLINE">Pay online (Razorpay)</option>
        </select>
        <button type="submit">Confirm booking</button>
      </form>
      <p>{msg}</p>
      <h3>Reviews</h3>
      {data.reviews.map((r, i) => <div key={i}>⭐ {r.rating} — {r.comment}</div>)}
    </div>
  );
}
