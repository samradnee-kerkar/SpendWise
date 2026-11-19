import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
};

function formatMoney(value: number) {
  return "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DashboardScreen() {
  const colors = useTheme();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc"),
    );
    // onSnapshot updates the list live whenever data changes.
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type,
            amount: data.amount,
            category: data.category,
            description: data.description ?? "",
            date: data.date?.toDate ? data.date.toDate() : new Date(),
          };
        });
        setTransactions(list);
        setLoading(false);
      },
      (error) => {
        console.log("Could not load transactions:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  const now = new Date();
  const thisMonth = transactions.filter(
    (t) =>
      t.date.getMonth() === now.getMonth() &&
      t.date.getFullYear() === now.getFullYear(),
  );
  const monthIncome = thisMonth
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const monthExpense = thisMonth
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const totalBalance = transactions.reduce(
    (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
    0,
  );
  const recent = transactions.slice(0, 5);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleMedium" style={{ color: colors.secondary }}>
          Hello, {user?.displayName ?? "there"}
        </Text>
        <Text
          variant="headlineMedium"
          style={[styles.heading, { color: colors.text }]}
        >
          Your money
        </Text>

        <Card style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.balanceLabel}>
              Total balance
            </Text>
            <Text variant="displaySmall" style={styles.balanceValue}>
              {formatMoney(totalBalance)}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.row}>
          <Card style={[styles.smallCard, { backgroundColor: colors.card }]}>
            <Card.Content>
              <Text style={{ color: colors.secondary }}>
                Income (this month)
              </Text>
              <Text variant="titleLarge" style={{ color: colors.primary }}>
                {formatMoney(monthIncome)}
              </Text>
            </Card.Content>
          </Card>
          <Card style={[styles.smallCard, { backgroundColor: colors.card }]}>
            <Card.Content>
              <Text style={{ color: colors.secondary }}>
                Expenses (this month)
              </Text>
              <Text variant="titleLarge" style={{ color: colors.error }}>
                {formatMoney(monthExpense)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Text
          variant="titleMedium"
          style={[styles.section, { color: colors.text }]}
        >
          Recent transactions
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : recent.length === 0 ? (
          <Text style={{ color: colors.secondary }}>
            No transactions yet. Add one from the Add tab.
          </Text>
        ) : (
          recent.map((t) => (
            <Card
              key={t.id}
              style={[styles.txCard, { backgroundColor: colors.card }]}
            >
              <Card.Content style={styles.txRow}>
                <View style={styles.flex}>
                  <Text variant="titleSmall" style={{ color: colors.text }}>
                    {t.category}
                  </Text>
                  <Text style={{ color: colors.secondary }}>
                    {t.description ? t.description + " · " : ""}
                    {formatDate(t.date)}
                  </Text>
                </View>
                <Text
                  variant="titleMedium"
                  style={{
                    color: t.type === "income" ? colors.primary : colors.error,
                  }}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatMoney(t.amount)}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 120,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  heading: { fontWeight: "700", marginBottom: 16 },
  balanceCard: { borderRadius: 20, marginBottom: 16 },
  balanceLabel: { color: "#0B1220" },
  balanceValue: { color: "#0B1220", fontWeight: "700" },
  row: { flexDirection: "row", gap: 12, marginBottom: 20 },
  smallCard: { flex: 1, borderRadius: 16 },
  section: { fontWeight: "600", marginBottom: 12 },
  txCard: { borderRadius: 14, marginBottom: 10 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
