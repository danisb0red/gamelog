import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import type { Session } from "@supabase/supabase-js";
import {
  Figtree_400Regular, Figtree_500Medium,
} from "@expo-google-fonts/figtree";
import {
  SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  SpaceMono_400Regular, SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";

import { supabase } from "./src/lib/supabase";
import { color, font, space } from "./src/theme/tokens";
import { SignIn } from "./src/screens/SignIn";
import { Home } from "./src/screens/Home";
import { Shelf } from "./src/screens/Shelf";
import { Search } from "./src/screens/Search";
import { Profile } from "./src/screens/Profile";
import { GameDetail } from "./src/screens/GameDetail";
import { Developer } from "./src/screens/Developer";
import { Diary } from "./src/screens/Diary";

SplashScreen.preventAutoHideAsync().catch(() => {});

type Tab = "home" | "shelf" | "search" | "profile";

/**
 * Navigation is a small hand-rolled stack rather than react-navigation.
 *
 * Four tabs and three pushed screens (game detail, developer, diary). A
 * navigator would add a dependency, a native module and a theming layer to
 * express what two pieces of state already express — and it would fight the
 * custom tab bar, which is doing real identity work here.
 */
function Shell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("home");
  // A two-level stack expressed as state. Developer sits above game detail, so
  // backing out of a studio returns you to the game you came from.
  const [gameSlug, setGameSlug] = useState<string | null>(null);
  const [devSlug, setDevSlug] = useState<string | null>(null);
  /** null = closed; otherwise which view of the history is open. */
  const [diary, setDiary] = useState<null | "all" | "reviews">(null);

  if (diary) {
    return (
      <Diary
        reviewsOnly={diary === "reviews"}
        onBack={() => setDiary(null)}
        onOpenGame={(slug) => { setDiary(null); setGameSlug(slug); }}
      />
    );
  }

  if (devSlug) {
    return (
      <Developer
        slug={devSlug}
        onBack={() => setDevSlug(null)}
        onOpenGame={(slug) => { setDevSlug(null); setGameSlug(slug); }}
      />
    );
  }

  if (gameSlug) {
    return (
      <GameDetail
        slug={gameSlug}
        onBack={() => setGameSlug(null)}
        onOpenDeveloper={setDevSlug}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1 }}>
        {tab === "home" && <Home onOpenGame={setGameSlug} onOpenDiary={() => setDiary("all")} />}
        {tab === "shelf" && <Shelf onOpenGame={setGameSlug} />}
        {tab === "search" && <Search onOpenGame={setGameSlug} />}
        {tab === "profile" && (
          <Profile
            onOpenGame={setGameSlug}
            onOpenDiary={() => setDiary("all")}
            onOpenReviews={() => setDiary("reviews")}
          />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom || space(3) }]}>
        {(
          [
            ["home", "Home"],
            ["shelf", "Shelf"],
            ["search", "Search"],
            ["profile", "You"],
          ] as [Tab, string][]
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <Pressable key={key} style={styles.tab} onPress={() => setTab(key)} hitSlop={8}>
              {/* The active marker is a lit pixel, not an icon — same language
                  the web app uses for status. */}
              <View style={[styles.pip, active && { backgroundColor: color.accent }]} />
              <Text style={[styles.tabLabel, active && { color: color.n100 }]}>
                {label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular, Figtree_500Medium,
    SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
    SpaceMono_400Regular, SpaceMono_700Bold,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onReady = useCallback(() => {
    if (fontsLoaded && !checking) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, checking]);

  if (!fontsLoaded || checking) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: color.bg }} onLayout={onReady}>
        <StatusBar barStyle="light-content" />
        {session ? <Shell /> : <SignIn />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: color.n800,
    backgroundColor: color.surface1,
    paddingTop: space(3),
  },
  tab: { flex: 1, alignItems: "center", gap: space(1.5) },
  pip: { width: 5, height: 5, backgroundColor: color.n700 },
  tabLabel: { fontFamily: font.mono, fontSize: 9, letterSpacing: 1.6, color: color.n500 },
});
