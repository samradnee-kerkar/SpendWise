import { Platform } from "react-native";

export const Colors = {
  light: {
    dark: false,
    background: "#F5F7FA",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E2E8F0",
    surface: "#FFFFFF",
    primary: "#16A36A",
    secondary: "#64748B",
    text: "#172033",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    card: "#FFFFFF",
    error: "#DC2626",
  },
  dark: {
    dark: true,
    background: "#101827",
    backgroundElement: "#1B2738",
    backgroundSelected: "#26354A",
    surface: "#1B2738",
    primary: "#35C98B",
    secondary: "#A0AEC0",
    text: "#F8FAFC",
    textSecondary: "#A0AEC0",
    border: "#334155",
    card: "#1B2738",
    error: "#F87171",
  },
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  android: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  default: {
    sans: "system-ui",
    serif: "serif",
    rounded: "system-ui",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  },
})!;

// Standard spacing sizes used by the template components.
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

export const MaxContentWidth = 800;
