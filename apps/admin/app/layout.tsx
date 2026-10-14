export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0, background: "#0f172a", color: "#e2e8f0" }}>
        <header style={{ background: "#020617", padding: "12px 20px", display: "flex", gap: 16 }}>
          <strong>MyDistrict Admin</strong>
          <a href="/" style={{ color: "#93c5fd" }}>Dashboard</a>
          <a href="/providers" style={{ color: "#93c5fd" }}>Providers</a>
          <a href="/users" style={{ color: "#93c5fd" }}>Users</a>
          <a href="/catalog" style={{ color: "#93c5fd" }}>Catalog</a>
          <a href="/login" style={{ color: "#93c5fd", marginLeft: "auto" }}>Login</a>
        </header>
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>{children}</main>
      </body>
    </html>
  );
}
