import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  HelperText,
  IconButton,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import DateField from "@/components/date-field";
import { useTheme } from "@/hooks/use-theme";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";
import { useCustomCategories } from "@/lib/use-categories";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
};

type Filter = "all" | "income" | "expense";

const EXPENSE_DEFAULTS = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Health",
  "Fun",
];
const INCOME_DEFAULTS = ["Salary", "Pocket money", "Gift"];

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

// Turns a Date into YYYY-MM-DD for the date field.
function toDateString(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function HistoryScreen() {
  const colors = useTheme();
  const { user } = useAuth();
  const { custom, customIncome, addCategory } = useCustomCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("All");

  // Edit form state
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // New category box inside the edit form
  const [newName, setNewName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

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

  function startEdit(t: Transaction) {
    setEditing(t);
    setEditAmount(String(t.amount));
    setEditCategory(t.category);
    setEditDescription(t.description);
    setEditDate(toDateString(t.date));
    setEditError("");
    setNewName("");
  }

  // Categories shown in the edit box:
  // defaults + the user's own + this transaction's current category + "Other"
  const editDefaults =
    editing?.type === "income" ? INCOME_DEFAULTS : EXPENSE_DEFAULTS;
  const editSaved = editing?.type === "income" ? customIncome : custom;
  const editCategories = (() => {
    const list = [...editDefaults];
    const addIfNew = (c: string) => {
      if (!c || c === "Other") return;
      if (!list.some((x) => x.toLowerCase() === c.toLowerCase())) list.push(c);
    };
    editSaved.forEach(addIfNew);
    if (editing) addIfNew(editing.category);
    list.push("Other");
    return list;
  })();

  async function handleCreateCategory() {
    if (!editing) return;
    setEditError("");
    setCreatingCat(true);
    const result = await addCategory(newName, editCategories, editing.type);
    setCreatingCat(false);
    if (result.error || !result.name) {
      setEditError(result.error ?? "Could not add the category.");
      return;
    }
    setEditCategory(result.name);
    setNewName("");
  }

  async function saveEdit() {
    if (!user || !editing) return;
    setEditError("");

    const value = Number(editAmount);
    if (!editAmount || isNaN(value) || value <= 0) {
      setEditError("Please enter an amount greater than 0.");
      return;
    }
    const parts = editDate.split("-").map(Number);
    const parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
    if (parts.length !== 3 || isNaN(parsedDate.getTime())) {
      setEditError("Please choose a valid date.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid, "transactions", editing.id), {
        amount: value,
        category: editCategory,
        description: editDescription.trim(),
        date: Timestamp.fromDate(parsedDate),
      });
      setEditing(null);
    } catch (e) {
      console.log("Could not update:", e);
      setEditError("Could not save changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

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
                  icon="pencil"
                  iconColor={colors.secondary}
                  size={20}
                  style={styles.iconBtn}
                  onPress={() => startEdit(t)}
                />
                <IconButton
                  icon="delete"
                  iconColor={colors.error}
                  size={20}
                  style={styles.iconBtn}
                  onPress={() => confirmDelete(t.id)}
                />
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!editing} onDismiss={() => setEditing(null)}>
          <Dialog.Title>
            Edit {editing?.type === "income" ? "income" : "expense"}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogArea}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                label="Amount"
                mode="outlined"
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="₹" />}
                style={styles.input}
              />
              <View style={styles.chips}>
                {editCategories.map((c) => (
                  <Chip
                    key={c}
                    selected={editCategory === c}
                    onPress={() => setEditCategory(c)}
                  >
                    {c}
                  </Chip>
                ))}
              </View>

              {editCategory === "Other" ? (
                <View style={styles.newRow}>
                  <TextInput
                    label="Your own category"
                    mode="outlined"
                    value={newName}
                    onChangeText={setNewName}
                    maxLength={20}
                    style={styles.newInput}
                  />
                  <Button
                    mode="contained"
                    onPress={handleCreateCategory}
                    loading={creatingCat}
                    disabled={creatingCat || newName.trim().length === 0}
                  >
                    Add
                  </Button>
                </View>
              ) : null}

              <TextInput
                label="Description"
                mode="outlined"
                value={editDescription}
                onChangeText={setEditDescription}
                style={styles.input}
              />

              <DateField label="Date" value={editDate} onChange={setEditDate} />

              {editError ? (
                <HelperText type="error">{editError}</HelperText>
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button onPress={saveEdit} loading={saving} disabled={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  txRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { margin: 0 },
  input: { marginBottom: 12 },
  newRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  newInput: { flex: 1 },
  dialogArea: { maxHeight: 360, paddingHorizontal: 20 },
});
