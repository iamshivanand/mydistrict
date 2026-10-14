"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ProvidersPage({ searchParams }: { searchParams: Record<string, string> }) {
  const [list, setList] = useState<{ id: string; displayName: string; bio?: string; avgRating: number; totalReviews: number; services: { service: { id: string; name: string }; price: number }[] }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [districtId, setDistrictId] = useState(searchParams.districtId ?? "");
  useEffect(() => {
    api().get<{ districts: typeof districts }>("/catalog/districts").then((d) => setDistricts(d.districts)).catch(() => {});
  }, []);
  useEffect(() => {
    const q = new URLSearchParams({ ...(searchParams as object), ...(districtId ? { districtId } : {}) }).toString();
    api().get<{ providers: typeof list }>(`/providers?${q}`).then((d) => setList(d.providers)).catch(() => {});
  }, [districtId]);
  return (
    <div>
      <h2>Providers</h2>
      <label>District: <select value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
        <option value="">All</option>
        {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select></label>
      {list.map((p) => (
        <div key={p.id} style={{ background: "white", padding: 16, borderRadius: 8, margin: "12px 0" }}>
          <strong>{p.displayName}</strong> · ⭐ {p.avgRating.toFixed(1)} ({p.totalReviews})
          <p>{p.bio}</p>
          {p.services.map((s) => <div key={s.service.id}>{s.service.name} — ₹{s.price}</div>)}
          <a href={`/providers/${p.id}`}>View & Book →</a>
        </div>
      ))}
      {list.length === 0 && <p>No approved providers yet in this filter.</p>}
    </div>
  );
}
