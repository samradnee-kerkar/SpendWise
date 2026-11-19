import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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
import { auth } from "@/lib/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // No navigation needed: the app switches to the tabs automatically.
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
              SpendWise
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.subtitle, { color: colors.secondary }]}
            >
              Welcome back! Log in to continue.
            </Text>

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

            {error ? <HelperText type="error">{error}</HelperText> : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              textColor="#0B1220"
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Log in
            </Button>

            <Button mode="text" onPress={() => router.push("/register" as any)}>
              New here? Create an account
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
