import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";

export function AppSplash() {
  const [visible, setVisible] = useState(true);
  const scale = useRef(new Animated.Value(0.6)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the plain native splash so ours is visible.
    SplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1000),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [contentOpacity, overlayOpacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[
          styles.center,
          { opacity: contentOpacity, transform: [{ scale }] },
        ]}
      >
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.Text style={styles.name}>SpendWise</Animated.Text>
        <Animated.Text style={styles.tagline}>Track every rupee</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#101827",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  center: { alignItems: "center" },
  logo: { width: 180, height: 180 },
  name: { color: "#F8FAFC", fontSize: 32, fontWeight: "700", marginTop: 8 },
  tagline: { color: "#35C98B", fontSize: 16, marginTop: 4 },
});
