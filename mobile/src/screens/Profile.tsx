import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { GameCover } from "../components/GameCover";
import { supabase } from "../lib/supabase";
import { color, font, space, statusColor } from "../theme/tokens";
import { HudLabel, PixelRule, PixelController } from "../components/Bits";
import { STATUS_LABELS } from "../theme/status";

export function Profile({
  onOpenGame, onOpenDiary, onOpenReviews,
}: {
  onOpenGame?: (slug: string) => void;
  onOpenDiary?: () => void;
  onOpenReviews?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slotWidth = Math.floor((width - space(5) * 2 - space(3) * 3) / 4);
  const [me, setMe] = useState<Awaited<ReturnType<typeof api.me>> | null>(null);
  const [favorites, setFavorites] = useState<
    Awaited<ReturnType<typeof api.favorites>>["favorites"]
  >([]);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.favorites().then((d) => setFavorites(d.favorites)).catch(() => {});
  }, []);

  if (!me) return <View style={styles.center}><ActivityIndicator color={color.accent} /></View>;

  const initial = (me.displayName ?? me.username ?? "?").charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + space(6), paddingBottom: space(16) }}
    >
      <View style={styles.head}>
        <View style={styles.idRow}>
          <View style={styles.plate}><Text style={styles.plateText}>{initial}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{me.displayName ?? me.username}</Text>
            <Text style={styles.handle}>@{me.username}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          {[
            { v: String(me.stats.total), c: "games" },
            { v: String(me.stats.rated), c: "rated" },
            { v: me.stats.average ? me.stats.average.toFixed(1) : "—", c: "average" },
          ].map((s) => (
            <View key={s.c}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statCaption}>{s.c.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: space(5), paddingVertical: space(6) }}><PixelRule /></View>

      {/* Four favourites. Empty slots are drawn rather than hidden — seeing the
          gaps is the invitation, and it makes the cap read as curation. */}
      <View style={styles.section}>
        <HudLabel>Favorites</HudLabel>
        <View style={styles.favRow}>
          {[0, 1, 2, 3].map((i) => {
            const f = favorites[i];
            if (!f) {
              return (
                <View key={`slot-${i}`} style={[styles.favSlot, { width: slotWidth }]}>
                  <Text style={styles.favSlotNum}>{String(i + 1).padStart(2, "0")}</Text>
                </View>
              );
            }
            return (
              <GameCover
                key={f.gameId}
                width={slotWidth}
                showTitle={false}
                onPress={() => onOpenGame?.(f.gameSlug)}
                game={{
                  name: f.gameName, cover: f.coverUrl ?? "",
                  year: f.releaseYear ?? 0, rating: null, platform: null,
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <HudLabel>Breakdown</HudLabel>
        <View style={{ marginTop: space(4), gap: space(3) }}>
          {Object.entries(me.stats.counts).map(([k, n]) => (
            <View key={k} style={styles.breakdownRow}>
              <View style={[styles.pixel, { backgroundColor: statusColor[k] ?? color.n600 }]} />
              <Text style={styles.breakdownLabel}>{STATUS_LABELS[k] ?? k}</Text>
              <Text style={styles.breakdownCount}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Two ways into the history: everything, or just what you wrote. */}
      <View style={styles.section}>
        <Pressable style={styles.link} onPress={onOpenDiary}>
          <Text style={styles.linkLabel}>DIARY</Text>
          <Text style={styles.linkArrow}>→</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={onOpenReviews}>
          <Text style={styles.linkLabel}>YOUR REVIEWS</Text>
          <Text style={styles.linkArrow}>→</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.footerRow}>
          <PixelController />
          <Text style={styles.email}>{me.email}</Text>
        </View>
        <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" },
  head: { paddingHorizontal: space(5) },
  idRow: { flexDirection: "row", alignItems: "center", gap: space(4), marginTop: space(5) },
  plate: { width: 64, height: 64, backgroundColor: color.accent, alignItems: "center", justifyContent: "center" },
  plateText: { fontFamily: font.displayBold, fontSize: 28, color: color.accentFg },
  name: { fontFamily: font.displayBold, fontSize: 28, letterSpacing: -0.8, color: color.n50 },
  handle: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.6, color: color.n400, marginTop: space(1) },
  stats: { flexDirection: "row", gap: space(10), marginTop: space(7) },
  statValue: { fontFamily: font.displayBold, fontSize: 28, color: color.n100 },
  statCaption: { fontFamily: font.mono, fontSize: 9, letterSpacing: 1.6, color: color.n500, marginTop: space(1.5) },
  section: { paddingHorizontal: space(5), paddingTop: space(4) },
  favRow: { flexDirection: "row", gap: space(3), marginTop: space(4) },
  link: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: color.n800, paddingVertical: space(4),
  },
  linkLabel: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.8, color: color.n200 },
  linkArrow: { fontFamily: font.mono, fontSize: 13, color: color.n500 },
  favSlot: {
    aspectRatio: 3 / 4, borderWidth: 1, borderStyle: "dashed",
    borderColor: color.n800, alignItems: "center", justifyContent: "center",
  },
  favSlotNum: { fontFamily: font.mono, fontSize: 11, color: color.n700 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  pixel: { width: 7, height: 7 },
  breakdownLabel: { flex: 1, fontFamily: font.body, fontSize: 15, color: color.n300 },
  breakdownCount: { fontFamily: font.monoBold, fontSize: 14, color: color.n400 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: space(3), marginTop: space(8) },
  email: { fontFamily: font.mono, fontSize: 11, color: color.n600 },
  signOut: { borderWidth: 1, borderColor: color.n800, paddingVertical: space(3.5), alignItems: "center", marginTop: space(5) },
  signOutText: { fontFamily: font.mono, fontSize: 11, letterSpacing: 2, color: color.n400 },
});
