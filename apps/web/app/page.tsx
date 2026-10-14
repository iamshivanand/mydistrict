"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Home() {
  const [cats, setCats] = useState<{ id: string; name: string; services: { id: string; name: string; basePrice: number }[] }[]>([]);
  useEffect(() => {
    api().get<{ categories: typeof cats }>("/catalog/categories").then((d) => setCats(d.categories)).catch(() => {});
  }, []);
  return (
    <div>
      <h1>Book trusted services in your district</h1>
      <p>Plumbers, electricians, salons, repairs — verified providers, online or cash/UPI payment.</p>
      <form action="/providers" method="get" style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input name="q" placeholder="Search plumber, facial..." style={{ flex: 1, padding: 10 }} />
        <button type="submit">Search</button>
      </form>
      {cats.map((c) => (
        <section key={c.id} style={{ background: "white", padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <h3>{c.name}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {c.services.map((s) => (
              <a key={s.id} href={`/providers?serviceId=${s.id}`} style={{ border: "1px solid #ddd", padding: "8px 12px", borderRadius: 20 }}>
                {s.name} · ₹{s.basePrice}
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
