import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";
import { createApiClient } from "@mydistrict/api-client";

const API = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000/api/v1";
let token: string | null = null;
const client = createApiClient({ baseUrl: API, getToken: () => token });

export default function App() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [providers, setProviders] = useState<{ id: string; displayName: string; avgRating: number }[]>([]);
  const [msg, setMsg] = useState("Login with OTP, then browse providers.");

  async function loadProviders() {
    try {
      const d = await client.get<{ providers: typeof providers }>("/providers");
      setProviders(d.providers);
    } catch (e) { setMsg(String((e as Error).message)); }
  }
  useEffect(() => { loadProviders(); }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>MyDistrict</Text>
      <Text>{msg}</Text>
      <TextInput style={styles.input} placeholder="10-digit phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Button title="Send OTP (dev 123456)" onPress={async () => { await client.post("/auth/send-otp", { phone }); setMsg("OTP sent"); }} />
      <TextInput style={styles.input} placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      <Button title="Verify & Login" onPress={async () => {
        const d = await client.post<{ accessToken: string }>("/auth/verify-otp", { phone, otp });
        token = d.accessToken; setMsg("Logged in!"); loadProviders();
      }} />
      <Text style={styles.h2}>Approved providers</Text>
      <FlatList data={providers} keyExtractor={(i) => i.id}
        renderItem={({ item }) => <Text style={styles.card}>{item.displayName} · ⭐ {item.avgRating?.toFixed?.(1) ?? "new"}</Text>} />
      <Button title="Refresh" onPress={loadProviders} />
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { padding: 20, marginTop: 40, gap: 8 },
  h1: { fontSize: 28, fontWeight: "bold" },
  h2: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8 },
  card: { padding: 12, backgroundColor: "#f3f4f6", borderRadius: 8, marginVertical: 4 },
});
