"use client";
import { useEffect, useState } from "react";
import { createApiClient } from "@mydistrict/api-client";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function BecomeProvider() {
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch(`${baseUrl}/catalog/districts`).then((r) => r.json()).then((d) => setDistricts(d.districts ?? [])).catch(() => {});
    fetch(`${baseUrl}/catalog/services`).then((r) => r.json()).then((d) => setServices(d.services ?? [])).catch(() => {});
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const token = localStorage.getItem("md_token");
      const client = createApiClient({ baseUrl, getToken: () => token });
      await client.postForm("/providers/onboard", fd);
      setMsg("Submitted! Admin will review your ID + address. Check status on /provider-status.");
    } catch (err) { setMsg(String((err as Error).message)); }
  }
  return (
    <div style={{ background: "white", padding: 20, borderRadius: 8 }}>
      <h2>Become a Provider</h2>
      <p>Phone OTP login required first. Upload ID proof + address proof + selfie. Admin reviews manually.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <input name="displayName" placeholder="Display name" required />
        <input name="bio" placeholder="Bio (experience, skills)" />
        <input name="addressLine" placeholder="Full address" required />
        <input name="pincode" placeholder="6-digit pincode" required pattern="\d{6}" />
        <select name="districtId" required>
          <option value="">Select district</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <input name="lat" placeholder="Latitude (optional)" type="number" step="any" />
          <input name="lng" placeholder="Longitude (optional)" type="number" step="any" />
          <label><input type="checkbox" name="showLocation" value="true" /> Show shop on map</label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select name="idType"><option value="AADHAAR">Aadhaar</option><option value="PAN">PAN</option><option value="DL">Driving Licence</option><option value="VOTER">Voter ID</option><option value="OTHER">Other</option></select>
          <input name="idNumber" placeholder="ID number (masked ok)" />
          <input name="bankUpiId" placeholder="UPI ID for payouts" />
        </div>
        <label>Services (Ctrl+click multiple): <select name="serviceIds" multiple required style={{ minHeight: 80 }}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <div style={{ display: "grid", gap: 4 }}>
          <label>ID front: <input type="file" name="idFront" accept="image/*,.pdf" required /></label>
          <label>ID back: <input type="file" name="idBack" accept="image/*,.pdf" /></label>
          <label>Address proof: <input type="file" name="addressProof" accept="image/*,.pdf" required /></label>
          <label>Selfie: <input type="file" name="selfie" accept="image/*" required /></label>
          <label>Skill certificates: <input type="file" name="certificates" multiple accept="image/*,.pdf" /></label>
        </div>
        <label><input type="checkbox" name="consentAccepted" value="true" required /> I consent to verification & display of my profile</label>
        <button type="submit">Submit for approval</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}
