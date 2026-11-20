import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: Date;
};

const BAR_COLORS = [
  "#35C98B",
  "#60A5FA",
  "#F59E0B",
  "#A78BFA",
  "#F472B6",
  "#34D399",
  "#FB923C",
];

function formatMoney(value: number) {
  return "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function sameMonth(d: Date, month: Date) {
  return (
    d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  );
}

export default function AnalyticsScreen() {
  const colors = useTheme();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  // 0 = this month, -1 = last month, and so on
  const [monthOffset, setMonthOffset] = useState(0);

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
              date: data.date?.toDate ? data.date.toDate() : new Date(),
            };
          }),
        );
        setLoading(false);
      },
      (error) => {
        console.log("Could not load analytics:", error);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  const stats = useMemo(() => {
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const inMonth = transactions.filter((t) => sameMonth(t.date, month));

    const income = inMonth
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = inMonth
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Spending by category
    const byCategory: Record<string, number> = {};
    inMonth
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      });
    const categoryList = Object.entries(byCategory)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // Last 6 months trend (ending at the selected month)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(month.getFullYear(), month.getMonth() - i, 1);
      const list = transactions.filter((t) => sameMonth(t.date, m));
      trend.push({
        label: m.toLocaleDateString("en-IN", { month: "short" }),
        income: list
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0),
        expense: list
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0),
      });
    }

    return {
      month,
      count: inMonth.length,
      income,
      expense,
      categoryList,
      trend,
    };
  }, [transactions, monthOffset]);

  const monthLabel = stats.month.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const net = stats.income - stats.expense;
  const maxIE = Math.max(stats.income, stats.expense, 1);
  const trendMax = Math.max(
    ...stats.trend.map((m) => Math.max(m.income, m.expense)),
    1,
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          variant="headlineMedium"
          style={[styles.heading, { color: colors.text }]}
        >
          Analytics
        </Text>

        {/* Month selector */}
        <View style={styles.monthRow}>
          <IconButton
            icon="chevron-left"
            iconColor={colors.text}
            onPress={() => setMonthOffset(monthOffset - 1)}
          />
          <Text variant="titleMedium" style={{ color: colors.text }}>
            {monthLabel}
          </Text>
          <IconButton
            icon="chevron-right"
            iconColor={colors.text}
            disabled={monthOffset >= 0}
            onPress={() => setMonthOffset(monthOffset + 1)}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <>
            {/* Income vs Expense */}
            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: colors.text }]}
                >
                  Income vs Expense
                </Text>

                <View style={styles.barLabelRow}>
                  <Text style={{ color: colors.secondary }}>Income</Text>
                  <Text style={{ color: colors.primary }}>
                    {formatMoney(stats.income)}
                  </Text>
                </View>
                <View
                  style={[styles.track, { backgroundColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${(stats.income / maxIE) * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>

                <View style={[styles.barLabelRow, { marginTop: 14 }]}>
                  <Text style={{ color: colors.secondary }}>Expense</Text>
                  <Text style={{ color: colors.error }}>
                    {formatMoney(stats.expense)}
                  </Text>
                </View>
                <View
                  style={[styles.track, { backgroundColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${(stats.expense / maxIE) * 100}%`,
                        backgroundColor: colors.error,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={{
                    color: net >= 0 ? colors.primary : colors.error,
                    marginTop: 16,
                    fontWeight: "700",
                  }}
                >
                  {net >= 0 ? "Saved " : "Overspent "}
                  {formatMoney(Math.abs(net))} this month
                </Text>
              </Card.Content>
            </Card>

            {/* Spending by category */}
            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: colors.text }]}
                >
                  Spending by category
                </Text>

                {stats.categoryList.length === 0 ? (
                  <Text style={{ color: colors.secondary }}>
                    No expenses recorded in {monthLabel}.
                  </Text>
                ) : (
                  stats.categoryList.map((c, index) => {
                    const percent = (c.total / stats.expense) * 100;
                    return (
                      <View key={c.name} style={styles.categoryItem}>
                        <View style={styles.barLabelRow}>
                          <Text style={{ color: colors.text }}>{c.name}</Text>
                          <Text style={{ color: colors.secondary }}>
                            {formatMoney(c.total)} · {percent.toFixed(0)}%
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.track,
                            { backgroundColor: colors.border },
                          ]}
                        >
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${percent}%`,
                                backgroundColor:
                                  BAR_COLORS[index % BAR_COLORS.length],
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </Card.Content>
            </Card>

            {/* 6 month trend */}
            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: colors.text }]}
                >
                  Last 6 months
                </Text>

                <View style={styles.trendRow}>
                  {stats.trend.map((m, i) => (
                    <View key={i} style={styles.trendCol}>
                      <View style={styles.trendBars}>
                        <View
                          style={[
                            styles.trendBar,
                            {
                              height: (m.income / trendMax) * 100,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.trendBar,
                            {
                              height: (m.expense / trendMax) * 100,
                              backgroundColor: colors.error,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.trendLabel, { color: colors.secondary }]}
                      >
                        {m.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.dot, { backgroundColor: colors.primary }]}
                    />
                    <Text style={{ color: colors.secondary }}>Income</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.dot, { backgroundColor: colors.error }]}
                    />
                    <Text style={{ color: colors.secondary }}>Expense</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
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
  heading: { fontWeight: "700", marginBottom: 8 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  card: { borderRadius: 14, marginBottom: 16 },
  cardTitle: { fontWeight: "700", marginBottom: 14 },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  categoryItem: { marginBottom: 14 },
  trendRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
  },
  trendCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  trendBars: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  trendBar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  trendLabel: { marginTop: 6, fontSize: 12 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
