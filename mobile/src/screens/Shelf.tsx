import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ShelfGame } from "../lib/api";
import { color, font, space, statusColor } from "../theme/tokens";
import { GameCover } from "../components/GameCover";
import { Heading } from "../components/Bits";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "playing", label: "Playing" },
  { key: "backlog", label: "Backlog" },
  { key: "finished", label: "Played" },
  { key: "replaying", label: "Replaying" },
  { key: "dropped", label: "Dropped" },
];

const GUTTER = space(5);
const GAP = space(3);

/**
 * The collection, on its own tab.
 *
 * Split out of Home because a full grid underneath an activity feed made the
 * home screen endless — Letterboxd keeps your films separate from what's
 * happening for the same reason.
 */
export function Shelf({ onOpenGame }: { onOpenGame: (slug: string) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [games, setGames] = useState<ShelfGame[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Three columns, sized from the actual viewport rather than a hardcoded
   * width. A fixed 104px left a dead column on most phones — this fills the
   * row edge to edge on every screen size, and the covers get *bigger*, not
   * smaller, because the leftover gutter is redistributed.
   */
  const columns = width >= 700 ? 5 : 3;
  const coverWidth = Math.floor((width - GUTTER * 2 - GAP * (columns - 1)) / columns);

  const load = useCallback(async () => {
    try {
      const d = await api.shelf();
      setGames(d.games);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={color.accent} /></View>;
  }

  const visible = filter === "all" ? games : games.filter((g) => g.status === filter);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + space(4), paddingBottom: space(12) }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={color.n500}
        />
      }
    >
      <View style={{ paddingHorizontal: GUTTER }}>
        <Heading count={visible.length}>Shelf</Heading>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = f.key === "all" ? games.length : games.filter((g) => g.status === f.key).length;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={styles.filter} hitSlop={6}>
              {f.key !== "all" && (
                <View style={[styles.pixel, { backgroundColor: statusColor[f.key], opacity: active ? 1 : 0.4 }]} />
              )}
              <Text style={[styles.filterText, active && { color: color.n100 }]}>
                {f.label.toUpperCase()}
              </Text>
              <Text style={styles.filterCount}>{n}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.grid, { paddingHorizontal: GUTTER, gap: GAP }]}>
        {visible.length === 0 && <Text style={styles.empty}>Nothing here yet.</Text>}
        {visible.map((g, i) => (
          <GameCover
            key={g.gameId}
            width={coverWidth}
            catalogNumber={i + 1}
            onPress={() => onOpenGame(g.gameSlug)}
            game={{
              name: g.gameName, cover: g.coverUrl ?? "", year: g.releaseYear ?? 0,
              status: g.status, rating: g.rating ? Number(g.rating) : null, platform: g.platform,
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" },
  filters: { gap: space(5), paddingHorizontal: GUTTER, paddingTop: space(4) },
  filter: { flexDirection: "row", alignItems: "center", gap: space(1.5) },
  pixel: { width: 6, height: 6 },
  filterText: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4, color: color.n500 },
  filterCount: { fontFamily: font.mono, fontSize: 10, color: color.n700 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingTop: space(6) },
  empty: { fontFamily: font.body, fontSize: 14, color: color.n500, paddingTop: space(6) },
});
