import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  IconButton,
  Text,
} from "react-native-paper";
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

type Filter = "all" | "income" | "expense";

function formatMoney(value: number) {
  return "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const colors = useTheme();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTransactions(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: data.type,
              amount: data.amount,
              category: data.category,
              description: data.description ?? "",
              date: data.date?.toDate ? data.date.toDate() : new Date(),
            };
          }),
        );
        setLoading(false);
      },
      (error) => {
        console.log("Could not load transactions:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  async function removeTransaction(id: string) {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "transactions", id));
    } catch (e) {
      console.log("Could not delete:", e);
    }
  }

  function confirmDelete(id: string) {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this transaction?")) removeTransaction(id);
      return;
    }
    Alert.alert("Delete transaction", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeTransaction(id),
      },
    ]);
  }

  // Category chips are built from the categories you actually used.
  const categories = [
    "All",
    ...Array.from(new Set(transactions.map((t) => t.category))),
  ];

  const shown = transactions.filter(
    (t) =>
      (filter === "all" || t.type === filter) &&
      (category === "All" || t.category === category),
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant="headlineMedium"
          style={[styles.heading, { color: colors.text }]}
        >
          Transactions
        </Text>

        <View style={styles.chips}>
          {(["all", "income", "expense"] as Filter[]).map((f) => (
            <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>
              {f === "all" ? "All" : f === "income" ? "Income" : "Expense"}
            </Chip>
          ))}
        </View>

        <View style={styles.chips}>
          {categories.map((c) => (
            <Chip
              key={c}
              selected={category === c}
              onPress={() => setCategory(c)}
            >
              {c}
            </Chip>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : shown.length === 0 ? (
          <Text style={{ color: colors.secondary }}>
            No transactions to show.
          </Text>
        ) : (
          shown.map((t) => (
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
                <IconButton
                  icon="delete"
                  iconColor={colors.error}
                  size={20}
                  onPress={() => confirmDelete(t.id)}
                />
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  txCard: { borderRadius: 14, marginBottom: 10 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
