"use client";
import { useEffect, useState } from "react";
import { adminApi, API_FILES } from "../../lib/api";

interface P { id: string; displayName: string; bio?: string; addressLine: string; pincodeCode?: string; idType: string; idFrontUrl?: string; idBackUrl?: string; addressProofUrl?: string; selfieUrl?: string; certificateUrls: string[]; verificationStatus: string; user: { phone: string; name?: string }; district: { name: string }; services: { service: { name: string } }[]; }

export default function Providers() {
  const [list, setList] = useState<P[]>([]);
  const [msg, setMsg] = useState("");
  function load() {
    adminApi().get<{ providers: P[] }>("/admin/providers/pending").then((d) => setList(d.providers)).catch((e) => setMsg(String(e)));
  }
  useEffect(load, []);
  async function review(id: string, action: "APPROVE" | "REJECT" | "SUSPEND") {
    const reason = prompt(`Reason for ${action} (optional):`) ?? "";
    await adminApi().post(`/admin/providers/${id}/review`, { action, reason });
    setMsg(`${action} done`); load();
  }
  return (
    <div>
      <h2>Pending Provider Approvals ({list.length})</h2>
      <p>{msg}</p>
      {list.map((p) => (
        <div key={p.id} style={{ background: "#1e293b", padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <strong>{p.displayName}</strong> · {p.user.phone} · {p.district.name} · {p.pincodeCode}
          <p>{p.bio} — {p.addressLine}</p>
          <p>Services: {p.services.map((s) => s.service.name).join(", ")}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[p.idFrontUrl, p.idBackUrl, p.addressProofUrl, p.selfieUrl, ...p.certificateUrls].filter(Boolean).map((u) => (
              <a key={u} href={`${API_FILES}${u}`} target="_blank" style={{ color: "#93c5fd" }}>{u?.split("/").pop()}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => review(p.id, "APPROVE")}>Approve</button>
            <button onClick={() => review(p.id, "REJECT")}>Reject</button>
            <button onClick={() => review(p.id, "SUSPEND")}>Suspend</button>
          </div>
        </div>
      ))}
    </div>
  );
}
