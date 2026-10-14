"use client";
import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

export default function Catalog() {
  const [cats, setCats] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", icon: "" });
  const [svc, setSvc] = useState({ name: "", categoryId: "", basePrice: "299" });
  const [msg, setMsg] = useState("");
  function load() {
    adminApi().get<{ categories: typeof cats }>("/catalog/categories").then((d) => setCats(d.categories)).catch(() => {});
  }
  useEffect(load, []);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ background: "#1e293b", padding: 16, borderRadius: 8 }}>
        <h3>Create Service Category</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <button onClick={async () => { await adminApi().post("/catalog/categories", { ...form, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-") }); setMsg("Category created"); load(); }}>Create</button>
        </div>
      </section>
      <section style={{ background: "#1e293b", padding: 16, borderRadius: 8 }}>
        <h3>Create Service</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={svc.categoryId} onChange={(e) => setSvc({ ...svc, categoryId: e.target.value })}>
            <option value="">category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Service name" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
          <input placeholder="base price" value={svc.basePrice} onChange={(e) => setSvc({ ...svc, basePrice: e.target.value })} />
          <button onClick={async () => { await adminApi().post("/catalog/services", { name: svc.name, categoryId: svc.categoryId, basePrice: Number(svc.basePrice) }); setMsg("Service created"); }}>Create</button>
        </div>
        <p>{msg}</p>
      </section>
    </div>
  );
}
