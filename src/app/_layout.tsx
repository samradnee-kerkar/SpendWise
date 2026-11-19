import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

import { AppSplash } from "@/components/app-splash";
import { AppThemeProvider, useAppTheme } from "@/hooks/use-app-theme";
import { AuthProvider, useAuth } from "@/lib/use-auth";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, colors } = useAppTheme();
  const { user, loading } = useAuth();

  const navigationTheme = {
    ...(theme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  const basePaperTheme = theme === "dark" ? MD3DarkTheme : MD3LightTheme;
  const paperTheme = {
    ...basePaperTheme,
    colors: {
      ...basePaperTheme.colors,
      primary: colors.primary,
      background: colors.background,
      surface: colors.surface,
      onSurface: colors.text,
      onSurfaceVariant: colors.secondary,
      outline: colors.border,
      error: colors.error,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <PaperProvider theme={paperTheme}>
        {loading ? null : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!user}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={!user}>
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
            </Stack.Protected>
          </Stack>
        )}
        <AppSplash />
      </PaperProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AppThemeProvider>
  );
}
