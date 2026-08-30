import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { color, font, shadow, space, statusColor } from "../theme/tokens";
import { HudLabel } from "../components/Bits";

type Detail = Awaited<ReturnType<typeof api.game>>;
const STATUSES = ["playing", "finished", "backlog", "dropped", "replaying"] as const;

export function GameDetail({
  slug, onBack, onOpenDeveloper,
}: {
  slug: string;
  onBack: () => void;
  onOpenDeveloper: (slug: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    api.game(slug).then(setData).catch((e) =>
      setError(e instanceof Error ? e.message : "Couldn't load this game"),
    );
  }, [slug]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Couldn&apos;t load this game</Text>
        <Text style={styles.errBody}>The games database isn&apos;t responding.</Text>
        <Pressable onPress={onBack}><Text style={styles.back}>BACK</Text></Pressable>
      </View>
    );
  }
  if (!data) {
    return <View style={styles.center}><ActivityIndicator color={color.accent} /></View>;
  }

  const g = data.game;

  return (
    <View style={styles.root}>
      {g.coverUrl && (
        <View style={[styles.ambient, { height: 340 + insets.top }]} pointerEvents="none">
          <Image source={g.coverUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(21,17,12,0.45)", "rgba(21,17,12,0.9)", color.bg]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space(3), paddingBottom: space(16) }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} hitSlop={16} style={styles.backWrap}>
          <Text style={styles.back}>← BACK</Text>
        </Pressable>

        <View style={styles.head}>
          <Image source={g.coverUrl ?? ""} style={[styles.cover, shadow.cover]} contentFit="cover" />
          <Text style={styles.title}>{g.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{g.releaseYear}</Text>
            {g.developers[0] && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Pressable
                  onPress={() => onOpenDeveloper(g.developers[0].slug)}
                  hitSlop={8}
                >
                  <Text style={styles.metaLink}>
                    {g.developers[0].name.toUpperCase()}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.ratingRow}>
            <View>
              <HudLabel>Community</HudLabel>
              <Text style={styles.ratingValue}>
                {data.aggregate.average != null
                  ? `${data.aggregate.average.toFixed(1)} (${data.aggregate.ratingCount})`
                  : "Not yet rated"}
              </Text>
            </View>
            {g.metacritic != null && (
              <View>
                <HudLabel>Metacritic</HudLabel>
                {/* Metacritic's own convention: green is good, yellow is mixed,
                    red is bad. A plain number carries none of that. */}
                <View
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor:
                        g.metacritic >= 75 ? color.playing
                        : g.metacritic >= 50 ? color.finished
                        : color.dropped,
                    },
                  ]}
                >
                  <Text style={styles.metaChipText}>{g.metacritic}</Text>
                </View>
              </View>
            )}
          </View>

          <Pressable style={styles.cta} onPress={() => setSheet(true)}>
            <Text style={styles.ctaText}>
              {data.mine ? "EDIT YOUR LOG" : "LOG, RATE, REVIEW"}
            </Text>
          </Pressable>

          {data.mine && (
            <Text style={styles.yours}>
              <Text style={{ color: statusColor[data.mine.status] }}>
                {data.mine.status.toUpperCase()}
              </Text>
              {data.mine.rating ? `  ·  ${Number(data.mine.rating).toFixed(1)}★` : ""}
            </Text>
          )}
        </View>

        {g.description && (
          <View style={styles.section}>
            <HudLabel>About</HudLabel>
            <Text style={styles.body}>{g.description}</Text>
          </View>
        )}

        {g.screenshots.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space(6) }} contentContainerStyle={{ gap: space(3), paddingHorizontal: space(5) }}>
            {g.screenshots.map((s) => (
              <Image key={s} source={s} style={styles.shot} contentFit="cover" />
            ))}
          </ScrollView>
        )}

        {g.genres.length > 0 && (
          <View style={styles.section}>
            <HudLabel>Genres</HudLabel>
            <Text style={styles.body}>{g.genres.join(", ")}</Text>
          </View>
        )}

        {/* Community reviews. Everyone who logged this game with something to
            say about it — the half of the product that isn't just a database. */}
        <View style={styles.section}>
          <HudLabel>Reviews</HudLabel>
          {data.reviews.length === 0 ? (
            <Text style={styles.body}>No reviews yet.</Text>
          ) : (
            <View style={{ marginTop: space(4), gap: space(5) }}>
              {data.reviews.map((r) => (
                <View key={r.id} style={styles.reviewInput}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewer}>{r.username.toUpperCase()}</Text>
                    {r.rating && (
                      <Text style={styles.reviewRating}>
                        {Number(r.rating).toFixed(1)}★
                      </Text>
                    )}
                  </View>
                  <Text style={styles.reviewBody}>{r.review}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <LogSheet
        visible={sheet}
        game={g}
        existing={data.mine}
        onClose={() => setSheet(false)}
        onSaved={() => { setSheet(false); api.game(slug).then(setData).catch(() => {}); }}
      />
    </View>
  );
}

/** Bottom sheet — the native idiom for this, rather than a centred web dialog. */
function LogSheet({
  visible, game, existing, onClose, onSaved,
}: {
  visible: boolean;
  game: Detail["game"];
  existing: Detail["mine"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<string>(existing?.status ?? "finished");
  const [rating, setRating] = useState<number | null>(
    existing?.rating ? Number(existing.rating) : null,
  );
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.log({
        game: {
          id: game.id, name: game.name, slug: game.slug,
          coverUrl: game.coverUrl, releaseYear: game.releaseYear,
        },
        status, rating, review: review.trim() || null, platform: null,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onSaved(); }, 700);
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          {saved ? (
            <View style={styles.savedBox}>
              <Text style={styles.savedText}>SAVED</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sheetTitle}>{game.name}</Text>

              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.chip,
                      status === s && { backgroundColor: statusColor[s], borderColor: statusColor[s] },
                    ]}
                  >
                    <Text style={[styles.chipText, status === s && { color: color.bg }]}>
                      {s.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setRating(n === rating ? null : n)} hitSlop={6}>
                    <Text style={[styles.star, { color: rating && n <= rating ? color.accent : color.n700 }]}>
                      ★
                    </Text>
                  </Pressable>
                ))}
                {rating != null && (
                  <Pressable onPress={() => setRating(null)} hitSlop={8}>
                    <Text style={styles.clear}>CLEAR</Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                style={styles.reviewInput}
                placeholder="Add a review or notes (optional)…"
                placeholderTextColor={color.n600}
                value={review}
                onChangeText={setReview}
                multiline
              />

              <Pressable style={styles.cta} onPress={save} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={color.accentFg} />
                  : <Text style={styles.ctaText}>SAVE LOG</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", gap: space(3) },
  ambient: { position: "absolute", top: 0, left: 0, right: 0 },
  backWrap: { paddingHorizontal: space(5), paddingBottom: space(2) },
  back: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.6, color: color.n400 },
  head: { paddingHorizontal: space(5), paddingTop: space(3) },
  cover: { width: 148, aspectRatio: 3 / 4, borderRadius: 3, backgroundColor: color.surface2 },
  title: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, color: color.n50, marginTop: space(5) },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space(2), marginTop: space(2) },
  meta: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, color: color.n500 },
  metaDot: { color: color.n700, fontSize: 10 },
  metaLink: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, color: color.accent },
  review: { borderLeftWidth: 2, borderLeftColor: color.n800, paddingLeft: space(3.5) },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: space(3) },
  reviewer: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, color: color.n400 },
  reviewRating: { fontFamily: font.monoBold, fontSize: 11, color: color.accent },
  reviewBody: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.n300, marginTop: space(2) },
  ratingRow: { flexDirection: "row", gap: space(10), marginTop: space(6) },
  ratingValue: { fontFamily: font.monoBold, fontSize: 16, color: color.n200, marginTop: space(1.5) },
  metaChip: {
    marginTop: space(1.5), alignSelf: "flex-start",
    paddingHorizontal: space(2), paddingVertical: space(1),
  },
  metaChipText: { fontFamily: font.monoBold, fontSize: 16, color: color.bg },
  cta: { backgroundColor: color.accent, paddingVertical: space(4), alignItems: "center", marginTop: space(7) },
  ctaText: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 2, color: color.accentFg },
  yours: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1.4, color: color.n400, marginTop: space(3), textAlign: "center" },
  section: { paddingHorizontal: space(5), paddingTop: space(8) },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.n300, marginTop: space(3) },
  shot: { width: 260, height: 146, borderRadius: 3, backgroundColor: color.surface2 },
  errTitle: { fontFamily: font.displayBold, fontSize: 22, color: color.n100 },
  errBody: { fontFamily: font.body, fontSize: 14, color: color.n400 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: color.surface2, borderTopWidth: 1, borderColor: color.n800, padding: space(5), paddingBottom: space(10) },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: color.n700, marginBottom: space(5) },
  sheetTitle: { fontFamily: font.displayBold, fontSize: 20, color: color.n100, marginBottom: space(5) },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { borderWidth: 1, borderColor: color.n700, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipText: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.2, color: color.n400 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: space(2), marginTop: space(5) },
  star: { fontSize: 30 },
  clear: { fontFamily: font.mono, fontSize: 10, color: color.n500, marginLeft: space(3) },
  reviewInput: {
    fontFamily: font.body, fontSize: 15, color: color.n100, backgroundColor: color.surface1,
    borderWidth: 1, borderColor: color.n800, padding: space(3), marginTop: space(5), minHeight: 80,
    textAlignVertical: "top",
  },
  savedBox: { alignItems: "center", paddingVertical: space(12) },
  savedText: { fontFamily: font.monoBold, fontSize: 14, letterSpacing: 4, color: color.accent },
});
