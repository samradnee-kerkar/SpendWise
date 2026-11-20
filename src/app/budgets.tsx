import { Stack, useRouter } from "expo-router";
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Dialog,
    IconButton,
    Portal,
    Text,
    TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";
import { useCustomCategories } from "@/lib/use-categories";

type Budget = {
  category: string;
  limit: number;
};

type Expense = {
  category: string;
  amount: number;
  date: Date;
};
const DEFAULT_CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Health",
  "Fun",
  "Other",
];

function formatMoney(value: number) {
  return "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function budgetDocId(category: string) {
  return category.replace(/[\/\\]/g, "-");
}

export default function BudgetsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { custom, addCategory } = useCustomCategories();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const [selected, setSelected] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // New category box
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // Listen to the budgets
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, "users", user.uid, "budgets"),
      (snapshot) => {
        setBudgets(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              category: data.category,
              limit: Number(data.limit) || 0,
            };
          }),
        );
        setLoadingBudgets(false);
      },
      (err) => {
        console.log("Could not load budgets:", err);
        setLoadingBudgets(false);
      },
    );
    return unsubscribe;
  }, [user]);

  // Listen to the expenses (we only use this month's)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "transactions"),
      orderBy("date", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Expense[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.type !== "expense") return;
          list.push({
            category: data.category,
            amount: data.amount,
            date: data.date?.toDate ? data.date.toDate() : new Date(),
          });
        });
        setExpenses(list);
        setLoadingExpenses(false);
      },
      (err) => {
        console.log("Could not load expenses:", err);
        setLoadingExpenses(false);
      },
    );
    return unsubscribe;
  }, [user]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // How much was spent per category this month
  const spentByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    const today = new Date();
    expenses.forEach((e) => {
      if (
        e.date.getFullYear() === today.getFullYear() &&
        e.date.getMonth() === today.getMonth()
      ) {
        result[e.category] = (result[e.category] ?? 0) + e.amount;
      }
    });
    return result;
  }, [expenses]);

  // Categories to choose from (defaults + your own + any already used)
  const categories = useMemo(() => {
    const all = [...DEFAULT_CATEGORIES];
    const addIfNew = (c: string) => {
      if (!all.some((x) => x.toLowerCase() === c.toLowerCase())) all.push(c);
    };
    custom.forEach(addIfNew);
    Object.keys(spentByCategory).forEach(addIfNew);
    budgets.forEach((b) => addIfNew(b.category));
    return all;
  }, [custom, spentByCategory, budgets]);

  const sortedBudgets = useMemo(
    () => [...budgets].sort((a, b) => a.category.localeCompare(b.category)),
    [budgets],
  );

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce(
    (sum, b) => sum + (spentByCategory[b.category] ?? 0),
    0,
  );
  const totalRemaining = totalBudget - totalSpent;

  function barColor(percent: number) {
    if (percent > 100) return colors.error;
    if (percent >= 80) return "#F59E0B";
    return colors.primary;
  }

  function startEdit(b: Budget) {
    setSelected(b.category);
    setAmountText(String(b.limit));
    setError("");
  }

  function cancelEdit() {
    setSelected(null);
    setAmountText("");
    setError("");
  }

  async function createCategory() {
    setCreatingCat(true);
    const result = await addCategory(newName, categories);
    setCreatingCat(false);
    if (result.error || !result.name) {
      setError(result.error ?? "Could not add the category.");
      return;
    }
    // Select the new category straight away
    const existing = budgets.find((b) => b.category === result.name);
    setSelected(result.name);
    setAmountText(existing ? String(existing.limit) : "");
    setNewName("");
    setShowNew(false);
    setError("");
  }

  async function saveBudget() {
    if (!user) return;
    if (!selected) {
      setError("Please choose a category.");
      return;
    }
    const limit = Number(amountText.replace(/,/g, "").trim());
    if (!isFinite(limit) || limit <= 0) {
      setError("Please enter a budget amount greater than 0.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid, "budgets", budgetDocId(selected)),
        {
          category: selected,
          limit,
          updatedAt: serverTimestamp(),
        },
      );
      setSelected(null);
      setAmountText("");
    } catch (err) {
      console.log("Could not save budget:", err);
      setError("Could not save the budget. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!user || !deleteTarget) return;
    try {
      await deleteDoc(
        doc(db, "users", user.uid, "budgets", budgetDocId(deleteTarget)),
      );
    } catch (err) {
      console.log("Could not delete budget:", err);
    }
    setDeleteTarget(null);
  }

  const loading = loadingBudgets || loadingExpenses;
  const isEditing =
    selected !== null && budgets.some((b) => b.category === selected);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar */}
        <View style={styles.topRow}>
          <IconButton
            icon="arrow-left"
            iconColor={colors.text}
            onPress={() => router.back()}
          />
          <View>
            <Text
              variant="headlineMedium"
              style={[styles.heading, { color: colors.text }]}
            >
              Budgets
            </Text>
            <Text style={{ color: colors.secondary }}>{monthLabel}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <>
            {/* Summary */}
            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <Text style={{ color: colors.secondary }}>
                  {totalRemaining >= 0 ? "Left to spend" : "Over budget by"}
                </Text>
                <Text
                  variant="headlineMedium"
                  style={{
                    color: totalRemaining >= 0 ? colors.primary : colors.error,
                    fontWeight: "700",
                    marginBottom: 12,
                  }}
                >
                  {formatMoney(Math.abs(totalRemaining))}
                </Text>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={{ color: colors.secondary }}>
                      Total budget
                    </Text>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                      {formatMoney(totalBudget)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.secondary }}>Spent</Text>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                      {formatMoney(totalSpent)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Add / edit form */}
            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: colors.text }]}
                >
                  {isEditing ? "Edit budget" : "Set a budget"}
                </Text>

                <View style={styles.chipRow}>
                  {categories.map((c) => (
                    <Chip
                      key={c}
                      selected={selected === c}
                      showSelectedOverlay
                      onPress={() => {
                        setSelected(c);
                        const existing = budgets.find((b) => b.category === c);
                        setAmountText(existing ? String(existing.limit) : "");
                        setError("");
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selected === c ? colors.primary : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      textStyle={{
                        color: selected === c ? "#FFFFFF" : colors.text,
                      }}
                      selectedColor={selected === c ? "#FFFFFF" : colors.text}
                    >
                      {c}
                    </Chip>
                  ))}

                  {/* New category chip */}
                  <Chip
                    icon="plus"
                    onPress={() => {
                      setShowNew(!showNew);
                      setError("");
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.primary,
                      },
                    ]}
                    textStyle={{ color: colors.primary }}
                    selectedColor={colors.primary}
                  >
                    New category
                  </Chip>
                </View>

                {showNew ? (
                  <View style={styles.newRow}>
                    <TextInput
                      mode="outlined"
                      label="New category name"
                      value={newName}
                      onChangeText={setNewName}
                      maxLength={20}
                      textColor={colors.text}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      style={{ flex: 1, backgroundColor: colors.card }}
                    />
                    <Button
                      mode="contained"
                      onPress={createCategory}
                      loading={creatingCat}
                      disabled={creatingCat || newName.trim().length === 0}
                      buttonColor={colors.primary}
                      textColor="#FFFFFF"
                    >
                      Add
                    </Button>
                  </View>
                ) : null}

                <TextInput
                  mode="outlined"
                  label="Monthly limit (₹)"
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="numeric"
                  textColor={colors.text}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  style={{ backgroundColor: colors.card, marginTop: 12 }}
                />

                {error ? (
                  <Text style={{ color: colors.error, marginTop: 8 }}>
                    {error}
                  </Text>
                ) : null}

                <View style={styles.buttonRow}>
                  <Button
                    mode="contained"
                    onPress={saveBudget}
                    loading={saving}
                    disabled={saving}
                    buttonColor={colors.primary}
                    textColor="#FFFFFF"
                    style={{ flex: 1 }}
                  >
                    {isEditing ? "Update budget" : "Save budget"}
                  </Button>
                  {selected ? (
                    <Button
                      mode="outlined"
                      onPress={cancelEdit}
                      textColor={colors.text}
                      style={{ borderColor: colors.border }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </View>
              </Card.Content>
            </Card>

            {/* Budget list */}
            <Text
              variant="titleMedium"
              style={[styles.cardTitle, { color: colors.text }]}
            >
              Your budgets
            </Text>

            {sortedBudgets.length === 0 ? (
              <Card style={[styles.card, { backgroundColor: colors.card }]}>
                <Card.Content>
                  <Text style={{ color: colors.secondary }}>
                    No budgets yet. Choose a category above, enter a monthly
                    limit and tap Save budget.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              sortedBudgets.map((b) => {
                const spent = spentByCategory[b.category] ?? 0;
                const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
                const remaining = b.limit - spent;
                const color = barColor(percent);
                return (
                  <Card
                    key={b.category}
                    style={[styles.card, { backgroundColor: colors.card }]}
                  >
                    <Card.Content>
                      <View style={styles.itemHeader}>
                        <Text
                          variant="titleMedium"
                          style={{ color: colors.text, fontWeight: "700" }}
                        >
                          {b.category}
                        </Text>
                        <View style={styles.itemActions}>
                          <IconButton
                            icon="pencil-outline"
                            size={20}
                            iconColor={colors.secondary}
                            onPress={() => startEdit(b)}
                          />
                          <IconButton
                            icon="delete-outline"
                            size={20}
                            iconColor={colors.error}
                            onPress={() => setDeleteTarget(b.category)}
                          />
                        </View>
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
                              width: `${Math.min(percent, 100)}%`,
                              backgroundColor: color,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.itemFooter}>
                        <Text style={{ color: colors.secondary }}>
                          {formatMoney(spent)} of {formatMoney(b.limit)}
                        </Text>
                        <Text style={{ color, fontWeight: "700" }}>
                          {remaining >= 0
                            ? `${formatMoney(remaining)} left`
                            : `${formatMoney(Math.abs(remaining))} over`}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={deleteTarget !== null}
          onDismiss={() => setDeleteTarget(null)}
          style={{ backgroundColor: colors.card }}
        >
          <Dialog.Title style={{ color: colors.text }}>
            Delete budget?
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.secondary }}>
              Remove the {deleteTarget} budget? Your transactions will not be
              deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={colors.secondary}
              onPress={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button textColor={colors.error} onPress={confirmDelete}>
              Delete
            </Button>
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
    paddingBottom: 60,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginLeft: -8,
  },
  heading: { fontWeight: "700" },
  card: { borderRadius: 14, marginBottom: 16 },
  cardTitle: { fontWeight: "700", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1 },
  newRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemActions: { flexDirection: "row", marginRight: -8 },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5 },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
