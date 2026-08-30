import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type ShelfGame, type DiaryEntry } from "../lib/api";
import { color, font, space, statusColor } from "../theme/tokens";
import { GameCover } from "../components/GameCover";
import { HudLabel, Heading, PixelRule, PixelController, Shelf } from "../components/Bits";

const VERB: Record<string, string> = {
  playing: "started playing",
  finished: "finished",
  backlog: "shelved",
  replaying: "went back to",
  dropped: "dropped",
};
const MONTH = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function Home({
  onOpenGame, onOpenDiary,
}: {
  onOpenGame: (slug: string) => void;
  onOpenDiary: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<Awaited<ReturnType<typeof api.me>> | null>(null);
  const [playing, setPlaying] = useState<ShelfGame[]>([]);
  const [shelf, setShelf] = useState<ShelfGame[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, s, d] = await Promise.all([api.me(), api.shelf(), api.diary()]);
      setMe(m); setPlaying(s.playing); setShelf(s.games); setDiary(d.entries.slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your shelf");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  const heroArt = playing[0]?.coverUrl ?? shelf[0]?.coverUrl ?? null;
  const name = me?.displayName || me?.username || "player";

  return (
    <View style={styles.root}>
      {/* Ambient wash — the screen is coloured by whatever you're playing. */}
      {heroArt && (
        <View style={[styles.ambient, { height: 380 + insets.top }]} pointerEvents="none">
          <Image source={heroArt} style={StyleSheet.absoluteFill} contentFit="cover" />
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(21,17,12,0.5)", "rgba(21,17,12,0.9)", color.bg]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <ScrollView
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
        <View style={styles.hero}>
          <Text style={styles.name}>
            {name}
            <Text style={{ color: color.accent }}>.</Text>
          </Text>
          <View style={styles.countRow}>
            <PixelController />
            <Text style={styles.countText}>
              {(me?.stats.total ?? 0)} GAMES ON THE SHELF
            </Text>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ paddingHorizontal: space(5) }}><PixelRule /></View>

        <View style={styles.section}>
          <Heading count={playing.length}>Currently playing</Heading>
        </View>
        {playing.length > 0 ? (
          <Shelf>
            {playing.map((g) => (
              <GameCover
                key={g.gameId}
                width={150}
                onPress={() => onOpenGame(g.gameSlug)}
                game={{
                  name: g.gameName, cover: g.coverUrl ?? "", year: g.releaseYear ?? 0,
                  status: g.status, rating: g.rating ? Number(g.rating) : null, platform: g.platform,
                }}
              />
            ))}
          </Shelf>
        ) : (
          <Text style={styles.empty}>Nothing in progress.</Text>
        )}

        <View style={styles.section}>
          <HudLabel>Collection</HudLabel>
          <View style={styles.stats}>
            {[
              { v: String(me?.stats.total ?? 0), c: "logged" },
              { v: String(me?.stats.counts.finished ?? 0), c: "finished" },
              { v: String(me?.stats.counts.backlog ?? 0), c: "in backlog" },
              { v: me?.stats.average ? me.stats.average.toFixed(1) : "—", c: "avg rating" },
            ].map((s) => (
              <View key={s.c}>
                <Text style={styles.statValue}>{s.v}</Text>
                <Text style={styles.statCaption}>{s.c.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          {(me?.stats.total ?? 0) > 0 && (
            <View style={styles.meter}>
              {Object.entries(me?.stats.counts ?? {})
                .filter(([, n]) => n > 0)
                .map(([k, n]) => (
                  <View key={k} style={{ flex: n, backgroundColor: statusColor[k] ?? color.n600 }} />
                ))}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: space(5) }}><PixelRule /></View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Heading>Recent activity</Heading>
            <Pressable onPress={onOpenDiary} hitSlop={10}>
              <Text style={styles.seeAll}>ALL →</Text>
            </Pressable>
          </View>
          {diary.length === 0 ? (
            <Text style={styles.empty}>Nothing logged yet.</Text>
          ) : (
            <View style={styles.timeline}>
              {diary.map((e) => {
                const d = new Date(e.loggedAt);
                return (
                  <View key={e.id} style={styles.entry}>
                    <View style={[styles.node, { backgroundColor: statusColor[e.status] ?? color.n500 }]} />
                    <Image source={e.coverUrl ?? ""} style={styles.entryCover} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryDate}>
                        {MONTH[d.getMonth()]} {String(d.getDate()).padStart(2, "0")}
                      </Text>
                      <Text style={styles.entryLine}>
                        <Text style={{ color: statusColor[e.status] }}>{VERB[e.status] ?? e.status}</Text>
                        <Text style={{ color: color.n100 }}> {e.gameName}</Text>
                      </Text>
                      {e.review && <Text style={styles.entryReview}>{e.review}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" },
  ambient: { position: "absolute", top: 0, left: 0, right: 0 },
  hero: { paddingHorizontal: space(5), paddingTop: space(4), paddingBottom: space(7) },
  name: { fontFamily: font.displayBold, fontSize: 38, lineHeight: 42, letterSpacing: -1.2, color: color.n50, marginTop: space(3) },
  countRow: { flexDirection: "row", alignItems: "center", gap: space(2.5), marginTop: space(3) },
  countText: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.8, color: color.n500 },
  section: { paddingHorizontal: space(5), paddingTop: space(8), paddingBottom: space(4) },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, color: color.accent },
  empty: { fontFamily: font.body, fontSize: 14, color: color.n500, paddingHorizontal: space(5), paddingTop: space(2) },
  error: { fontFamily: font.mono, fontSize: 11, color: color.dropped, paddingHorizontal: space(5), paddingBottom: space(3) },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space(9), marginTop: space(5) },
  statValue: { fontFamily: font.displayBold, fontSize: 32, letterSpacing: -1, color: color.n100 },
  statCaption: { fontFamily: font.mono, fontSize: 9, letterSpacing: 1.6, color: color.n500, marginTop: space(1.5) },
  meter: { flexDirection: "row", height: 6, borderRadius: 999, overflow: "hidden", marginTop: space(6), backgroundColor: "rgba(240,229,214,0.07)" },
  timeline: { marginTop: space(5), gap: space(6), borderLeftWidth: 1, borderLeftColor: color.n800, paddingLeft: space(5) },
  entry: { flexDirection: "row", gap: space(3.5) },
  node: { position: "absolute", left: -25, top: 5, width: 7, height: 7 },
  entryCover: { width: 42, height: 56, borderRadius: 2, backgroundColor: color.surface2 },
  entryDate: { fontFamily: font.mono, fontSize: 9, letterSpacing: 1.6, color: color.n400 },
  entryLine: { fontFamily: font.body, fontSize: 15, lineHeight: 20, marginTop: space(1) },
  entryReview: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.n400, fontStyle: "italic", marginTop: space(2), borderLeftWidth: 2, borderLeftColor: color.n800, paddingLeft: space(3) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(5), paddingHorizontal: space(5), paddingTop: space(4) },
});
