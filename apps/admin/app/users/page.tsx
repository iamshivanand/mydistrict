"use client";
import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

export default function Users() {
  const [list, setList] = useState<{ id: string; phone: string; name?: string; role: string; status: string }[]>([]);
  function load() { adminApi().get<{ users: typeof list }>("/admin/users").then((d) => setList(d.users)).catch(() => {}); }
  useEffect(load, []);
  return (
    <div>
      <h2>Users — block / unblock</h2>
      {list.map((u) => (
        <div key={u.id} style={{ background: "#1e293b", padding: 12, borderRadius: 8, marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
          <span>{u.phone} · {u.name} · {u.role} · <strong>{u.status}</strong></span>
          <button onClick={async () => {
            const reason = prompt("Block reason?") ?? "misuse";
            await adminApi().post(`/admin/users/${u.id}/block`, { reason }); load();
          }}>Block</button>
          <button onClick={async () => { await adminApi().post(`/admin/users/${u.id}/unblock`, {}); load(); }}>Unblock</button>
        </div>
      ))}
    </div>
  );
}
