import {
  Timestamp,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import DateField from "@/components/date-field";
import { useTheme } from "@/hooks/use-theme";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";
import { useCustomCategories } from "@/lib/use-categories";

const EXPENSE_DEFAULTS = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Health",
  "Fun",
];
const INCOME_DEFAULTS = ["Salary", "Pocket money", "Gift"];

// Returns today's date as YYYY-MM-DD using the phone's local time.
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function AddTransactionScreen() {
  const colors = useTheme();
  const { user } = useAuth();
  const { custom, customIncome, addCategory } = useCustomCategories();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New category box (shows when "Other" is selected)
  const [newName, setNewName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // Defaults + the user's own categories + "Other" at the end
  const defaults = type === "expense" ? EXPENSE_DEFAULTS : INCOME_DEFAULTS;
  const savedCustom = type === "expense" ? custom : customIncome;
  const categories = [
    ...defaults,
    ...savedCustom.filter(
      (c) => !defaults.some((d) => d.toLowerCase() === c.toLowerCase()),
    ),
    "Other",
  ];

  function changeType(value: string) {
    const newType = value === "income" ? "income" : "expense";
    setType(newType);
    setCategory(
      newType === "expense" ? EXPENSE_DEFAULTS[0] : INCOME_DEFAULTS[0],
    );
    setNewName("");
    setError("");
  }

  async function handleCreateCategory() {
    setError("");
    setCreatingCat(true);
    const result = await addCategory(newName, categories, type);
    setCreatingCat(false);
    if (result.error || !result.name) {
      setError(result.error ?? "Could not add the category.");
      return;
    }
    setCategory(result.name);
    setNewName("");
    setSuccess(`Category "${result.name}" saved. You can reuse it anytime.`);
  }

  async function handleSave() {
    setError("");
    setSuccess("");

    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      setError("Please enter an amount greater than 0.");
      return;
    }

    const parts = date.split("-").map(Number);
    const parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
    if (parts.length !== 3 || isNaN(parsedDate.getTime())) {
      setError("Please choose a valid date.");
      return;
    }
    if (!user) {
      setError("You are not logged in.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        type,
        amount: value,
        category,
        description: description.trim(),
        date: Timestamp.fromDate(parsedDate),
        createdAt: serverTimestamp(),
      });
      setAmount("");
      setDescription("");
      setDate(todayString());
      setSuccess("Transaction saved!");
    } catch (e) {
      console.log("Could not save transaction:", e);
      setError("Could not save. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: colors.text }]}
            >
              Add Transaction
            </Text>

            <SegmentedButtons
              value={type}
              onValueChange={changeType}
              buttons={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
              style={styles.segment}
            />

            <TextInput
              label="Amount"
              mode="outlined"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="₹" />}
              style={styles.input}
            />

            <Text style={[styles.label, { color: colors.secondary }]}>
              Category
            </Text>
            <View style={styles.chips}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  selected={category === c}
                  onPress={() => {
                    setCategory(c);
                    setError("");
                  }}
                  style={styles.chip}
                >
                  {c}
                </Chip>
              ))}
            </View>

            {category === "Other" ? (
              <View style={styles.newBox}>
                <Text style={{ color: colors.secondary, marginBottom: 8 }}>
                  Want your own category? Type a name and tap Add. It will be
                  saved so you can use it again.
                </Text>
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
                    textColor="#0B1220"
                  >
                    Add
                  </Button>
                </View>
              </View>
            ) : null}

            <TextInput
              label="Description (optional)"
              mode="outlined"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />

            <DateField label="Date" value={date} onChange={setDate} />

            {error ? <HelperText type="error">{error}</HelperText> : null}
            {success ? (
              <HelperText type="info" style={{ color: colors.primary }}>
                {success}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              textColor="#0B1220"
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Save transaction
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingBottom: 120 },
  form: { width: "100%", maxWidth: 420, alignSelf: "center" },
  title: { fontWeight: "700", marginBottom: 16 },
  segment: { marginBottom: 16 },
  input: { marginBottom: 12 },
  label: { marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {},
  newBox: { marginBottom: 16 },
  newRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  newInput: { flex: 1 },
  button: { marginTop: 12, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
});
