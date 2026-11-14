/**
 * Returns the SpendWise colors for the currently selected theme.
 * The theme (light or dark) comes from AppThemeProvider, which also
 * saves the user's choice so it is remembered after closing the app.
 */

import { useAppTheme } from "@/hooks/use-app-theme";

export function useTheme() {
  const { colors } = useAppTheme();

  return colors;
}
