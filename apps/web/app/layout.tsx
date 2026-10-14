export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0, background: "#f7f7f8" }}>
        <header style={{ background: "#111827", color: "white", padding: "12px 20px", display: "flex", gap: 16, alignItems: "center" }}>
          <strong>MyDistrict</strong>
          <a href="/" style={{ color: "#c7d2fe" }}>Home</a>
          <a href="/providers" style={{ color: "#c7d2fe" }}>Services</a>
          <a href="/bookings" style={{ color: "#c7d2fe" }}>My Bookings</a>
          <a href="/become-provider" style={{ color: "#c7d2fe" }}>Become Provider</a>
          <a href="/login" style={{ color: "#c7d2fe", marginLeft: "auto" }}>Login</a>
        </header>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>{children}</main>
      </body>
    </html>
  );
}
