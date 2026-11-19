import { signOut } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Dialog,
    List,
    Portal,
    Switch,
    Text,
    TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";

const POPULAR = ["USD", "EUR", "GBP"];

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useAppTheme();
  const { user } = useAuth();

  const [balance, setBalance] = useState(0);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState("USD");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState("");

  // Total INR balance from the user's transactions.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "transactions"),
      (snap) => {
        let total = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          total += data.type === "income" ? data.amount : -data.amount;
        });
        setBalance(total);
      },
    );
    return unsubscribe;
  }, [user]);

  // Load the currency this user chose last time.
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const saved = snap.data()?.displayCurrency;
        if (saved) setSelected(saved);
      })
      .catch((e) => console.log("Could not load currency:", e));
  }, [user]);

  // Ask the Frankfurter API for all rates (1 INR in every currency) and the currency names.
  async function loadRates() {
    setRatesLoading(true);
    setRatesError("");
    try {
      const [ratesResponse, namesResponse] = await Promise.all([
        fetch("https://api.frankfurter.dev/v1/latest?base=INR"),
        fetch("https://api.frankfurter.dev/v1/currencies"),
      ]);
      const ratesData = await ratesResponse.json();
      const namesData = await namesResponse.json();
      if (!ratesData.rates) throw new Error("No rates in response");
      setRates(ratesData.rates);
      setNames(namesData);
    } catch (e) {
      console.log("Could not load rates:", e);
      setRatesError("Could not load exchange rates. Check your internet.");
    } finally {
      setRatesLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, []);

  function chooseCurrency(code: string) {
    setSelected(code);
    setDialogOpen(false);
    setSearch("");
    if (user) {
      setDoc(
        doc(db, "users", user.uid),
        { displayCurrency: code },
        { merge: true },
      ).catch((e) => console.log("Could not save currency:", e));
    }
  }

  // Currencies shown in the search list (INR is the base, so it is left out).
  const allCodes = Object.keys(rates ?? {}).filter((c) => c !== "INR");
  const filtered = allCodes
    .filter((c) =>
      (c + " " + (names[c] ?? "")).toLowerCase().includes(search.toLowerCase()),
    )
    .sort();

  const chipCodes = POPULAR.includes(selected)
    ? POPULAR
    : [...POPULAR, selected];
  const rate = rates?.[selected];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant="headlineMedium"
          style={[styles.heading, { color: colors.text }]}
        >
          Profile
        </Text>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              {user?.displayName ?? "SpendWise user"}
            </Text>
            <Text style={{ color: colors.secondary }}>{user?.email}</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Balance in other currencies
            </Text>
            <Text style={{ color: colors.secondary, marginBottom: 4 }}>
              Your balance: ₹
              {balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </Text>
            <Text style={{ color: colors.secondary, marginBottom: 12 }}>
              Live rates from the Frankfurter API
            </Text>

            {ratesLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : ratesError ? (
              <>
                <Text style={{ color: colors.error }}>{ratesError}</Text>
                <Button onPress={loadRates}>Try again</Button>
              </>
            ) : (
              <>
                <View style={styles.chips}>
                  {chipCodes.map((c) => (
                    <Chip
                      key={c}
                      selected={selected === c}
                      onPress={() => chooseCurrency(c)}
                    >
                      {c}
                    </Chip>
                  ))}
                  <Chip icon="magnify" onPress={() => setDialogOpen(true)}>
                    More...
                  </Chip>
                </View>

                <Text
                  variant="headlineMedium"
                  style={{ color: colors.primary }}
                >
                  {selected}{" "}
                  {(balance * (rate ?? 0)).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={{ color: colors.secondary }}>
                  {names[selected] ?? selected} · 1 INR = {rate?.toFixed(4)}{" "}
                  {selected}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content style={styles.themeRow}>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Dark mode
            </Text>
            <Switch value={theme === "dark"} onValueChange={toggleTheme} />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={colors.error}
          textColor="#FFFFFF"
          style={styles.logout}
          onPress={() => signOut(auth)}
        >
          Log out
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>Choose a currency</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Search (e.g. Japan or JPY)"
              mode="outlined"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.ScrollArea style={styles.dialogList}>
            <ScrollView>
              {filtered.length === 0 ? (
                <Text style={{ padding: 16 }}>No currency found.</Text>
              ) : (
                filtered.map((c) => (
                  <List.Item
                    key={c}
                    title={c}
                    description={names[c]}
                    onPress={() => chooseCurrency(c)}
                  />
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 120,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  heading: { fontWeight: "700", marginBottom: 16 },
  card: { borderRadius: 16, marginBottom: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logout: { marginTop: 8, borderRadius: 12 },
  dialogList: { maxHeight: 280 },
});
