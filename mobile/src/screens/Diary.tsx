import { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, SectionList, Pressable, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type DiaryEntry } from "../lib/api";
import { color, font, space, statusColor } from "../theme/tokens";
import { HudLabel } from "../components/Bits";

const VERB: Record<string, string> = {
  playing: "started playing",
  finished: "finished",
  backlog: "shelved",
  replaying: "went back to",
  dropped: "dropped",
};
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * The full log history, grouped by month.
 *
 * A game can appear many times — every dated entry is its own row, which is the
 * whole point of a diary versus a shelf. The shelf answers "what do I have",
 * this answers "what did I do".
 *
 * SectionList rather than a mapped ScrollView so month headers stick and long
 * histories stay cheap to render.
 */
export function Diary({
  onBack, onOpenGame, reviewsOnly = false,
}: {
  onBack: () => void;
  onOpenGame: (slug: string) => void;
  /** Filters to entries that have a written review — used by the You tab. */
  reviewsOnly?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);

  useEffect(() => {
    api.diary().then((d) => setEntries(d.entries)).catch(() => setEntries([]));
  }, []);

  const sections = useMemo(() => {
    if (!entries) return [];
    const filtered = reviewsOnly ? entries.filter((e) => e.review) : entries;
    const byMonth = new Map<string, DiaryEntry[]>();
    for (const e of filtered) {
      const d = new Date(e.loggedAt);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(e);
    }
    return [...byMonth.entries()].map(([title, data]) => ({ title, data }));
  }, [entries, reviewsOnly]);

  if (!entries) {
    return <View style={styles.center}><ActivityIndicator color={color.accent} /></View>;
  }

  const total = sections.reduce((n, s) => n + s.data.length, 0);

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingTop: insets.top + space(3), paddingBottom: space(12) }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: space(5), paddingBottom: space(6) }}>
            <Pressable onPress={onBack} hitSlop={16}>
              <Text style={styles.back}>← BACK</Text>
            </Pressable>
            <View style={{ marginTop: space(5) }}>
              <HudLabel>{reviewsOnly ? "Written" : "History"}</HudLabel>
            </View>
            <Text style={styles.title}>{reviewsOnly ? "Your reviews" : "Diary"}</Text>
            <Text style={styles.count}>
              {total} {reviewsOnly ? "REVIEWS" : "ENTRIES"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {reviewsOnly ? "You haven't written any reviews yet." : "Nothing logged yet."}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHeader}>
            <Text style={styles.month}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const d = new Date(item.loggedAt);
          return (
            <Pressable style={styles.row} onPress={() => onOpenGame(item.gameSlug)}>
              {/* Day column — a diary is organised by when, so the date leads. */}
              <View style={styles.dayCol}>
                <Text style={styles.dayNum}>{String(d.getDate()).padStart(2, "0")}</Text>
                <Text style={styles.dayName}>{DAYS[d.getDay()]}</Text>
              </View>

              <Image source={item.coverUrl ?? ""} style={styles.cover} contentFit="cover" />

              <View style={{ flex: 1 }}>
                <Text style={styles.game} numberOfLines={2}>{item.gameName}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.pixel, { backgroundColor: statusColor[item.status] ?? color.n600 }]} />
                  <Text style={[styles.verb, { color: statusColor[item.status] ?? color.n500 }]}>
                    {VERB[item.status] ?? item.status}
                  </Text>
                  {item.rating && (
                    <Text style={styles.rating}>{Number(item.rating).toFixed(1)}★</Text>
                  )}
                </View>
                {item.review && <Text style={styles.review}>{item.review}</Text>}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" },
  back: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.6, color: color.n400 },
  title: { fontFamily: font.displayBold, fontSize: 32, letterSpacing: -1, color: color.n50, marginTop: space(3) },
  count: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.8, color: color.n500, marginTop: space(2) },
  monthHeader: {
    backgroundColor: color.bg,
    paddingHorizontal: space(5), paddingVertical: space(3),
    borderBottomWidth: 1, borderBottomColor: color.n800,
  },
  month: { fontFamily: font.mono, fontSize: 10, letterSpacing: 2, color: color.n400 },
  row: { flexDirection: "row", gap: space(3.5), paddingHorizontal: space(5), paddingVertical: space(4) },
  dayCol: { width: 34, alignItems: "center" },
  dayNum: { fontFamily: font.displayBold, fontSize: 20, color: color.n200 },
  dayName: { fontFamily: font.mono, fontSize: 8, letterSpacing: 1.2, color: color.n600, marginTop: space(0.5) },
  cover: { width: 44, height: 59, borderRadius: 2, backgroundColor: color.surface2 },
  game: { fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.n100 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space(2), marginTop: space(1.5) },
  pixel: { width: 6, height: 6 },
  verb: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.2 },
  rating: { fontFamily: font.monoBold, fontSize: 11, color: color.accent, marginLeft: space(1) },
  review: {
    fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.n400,
    fontStyle: "italic", marginTop: space(2),
    borderLeftWidth: 2, borderLeftColor: color.n800, paddingLeft: space(3),
  },
  empty: { fontFamily: font.body, fontSize: 14, color: color.n500, textAlign: "center", marginTop: space(10) },
});
