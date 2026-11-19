import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { friendlyAuthError } from "@/lib/auth-errors";
import { auth, db } from "@/lib/firebase";

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all the fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await updateProfile(result.user, { displayName: name.trim() });

      // Save the user's details in Firestore.
      try {
        await setDoc(doc(db, "users", result.user.uid), {
          name: name.trim(),
          email: email.trim(),
          currency: "INR",
          createdAt: serverTimestamp(),
        });
      } catch (firestoreError) {
        console.log("Could not save user in Firestore:", firestoreError);
      }
    } catch (e) {
      setError(friendlyAuthError(e));
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
              variant="displaySmall"
              style={[styles.brand, { color: colors.primary }]}
            >
              Create account
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.subtitle, { color: colors.secondary }]}
            >
              Start tracking your money with SpendWise.
            </Text>

            <TextInput
              label="Full name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label="Password"
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />
            <TextInput
              label="Confirm password"
              mode="outlined"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
              style={styles.input}
            />

            {error ? <HelperText type="error">{error}</HelperText> : null}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              textColor="#0B1220"
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Register
            </Button>

            <Button mode="text" onPress={() => router.back()}>
              Already have an account? Log in
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
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  form: { width: "100%", maxWidth: 420, alignSelf: "center" },
  brand: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center", marginBottom: 32, marginTop: 4 },
  input: { marginBottom: 12 },
  button: { marginTop: 12, marginBottom: 8, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
});
