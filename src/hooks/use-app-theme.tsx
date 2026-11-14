import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { Colors } from "../constants/theme";

type ThemeMode = "light" | "dark";

type ThemeContextType = {
  theme: ThemeMode;
  colors: (typeof Colors)["light"];
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem("app-theme");

        if (savedTheme === "light" || savedTheme === "dark") {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.log("Could not load theme:", error);
      } finally {
        setLoaded(true);
      }
    }

    loadTheme();
  }, []);

  async function setTheme(mode: ThemeMode) {
    setThemeState(mode);

    try {
      await AsyncStorage.setItem("app-theme", mode);
    } catch (error) {
      console.log("Could not save theme:", error);
    }
  }

  function toggleTheme() {
    void setTheme(theme === "dark" ? "light" : "dark");
  }

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: Colors[theme],
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }

  return context;
}
