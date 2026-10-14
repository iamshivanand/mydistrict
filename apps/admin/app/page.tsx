"use client";
import { useEffect, useState } from "react";
import { adminApi } from "../lib/api";

export default function Dashboard() {
  const [kpis, setKpis] = useState<{ users: number; pendingProviders: number; bookings: number; revenue: number } | null>(null);
  useEffect(() => {
    adminApi().get<{ kpis: typeof kpis }>("/admin/dashboard").then((d) => setKpis(d.kpis)).catch(() => {});
  }, []);
  if (!kpis) return <p>Login as admin first (/login), then KPIs appear here.</p>;
  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: "flex", gap: 12 }}>
        {[["Users", kpis.users], ["Pending KYC", kpis.pendingProviders], ["Bookings", kpis.bookings], ["Revenue ₹", kpis.revenue]].map(([k, v]) => (
          <div key={k as string} style={{ background: "#1e293b", padding: 16, borderRadius: 8, minWidth: 150 }}>
            <div>{k}</div><strong style={{ fontSize: 24 }}>{v as number}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
