import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SearchResult } from "../lib/api";
import { color, font, space } from "../theme/tokens";
import { GameCover } from "../components/GameCover";
import { HudLabel } from "../components/Bits";

/** A studio and everything they've made. Reached by tapping a developer name. */
export function Developer({
  slug, onBack, onOpenGame,
}: { slug: string; onBack: () => void; onOpenGame: (slug: string) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Fill the row edge to edge rather than leaving a dead column.
  const columns = width >= 700 ? 5 : 3;
  const coverWidth = Math.floor((width - space(5) * 2 - space(3) * (columns - 1)) / columns);
  const [name, setName] = useState<string | null>(null);
  const [games, setGames] = useState<SearchResult[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.developer(slug)
      .then((d) => { setName(d.name); setGames(d.games); })
      .catch(() => setError(true));
  }, [slug]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn&apos;t load this developer</Text>
        <Pressable onPress={onBack}><Text style={styles.back}>← BACK</Text></Pressable>
      </View>
    );
  }
  if (!name) return <View style={styles.center}><ActivityIndicator color={color.accent} /></View>;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + space(3), paddingBottom: space(16) }}
    >
      <Pressable onPress={onBack} hitSlop={16} style={{ paddingHorizontal: space(5) }}>
        <Text style={styles.back}>← BACK</Text>
      </Pressable>

      <View style={{ paddingHorizontal: space(5), paddingTop: space(5) }}>
        <HudLabel>Developer</HudLabel>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.count}>{games.length} GAMES</Text>
      </View>

      <View style={styles.grid}>
        {games.map((g) => (
          <GameCover
            key={g.id}
            width={coverWidth}
            onPress={() => onOpenGame(g.slug)}
            game={{
              name: g.name, cover: g.coverUrl ?? "",
              year: g.releaseYear ?? 0, rating: null, platform: null,
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", gap: space(4) },
  back: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.6, color: color.n400 },
  name: { fontFamily: font.displayBold, fontSize: 30, letterSpacing: -0.8, color: color.n50, marginTop: space(3) },
  count: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.8, color: color.n500, marginTop: space(2) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3), paddingHorizontal: space(5), paddingTop: space(7) },
  errTitle: { fontFamily: font.displayBold, fontSize: 20, color: color.n100 },
});
