import { useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, FlatList, Pressable, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type SearchResult } from "../lib/api";
import { color, font, space } from "../theme/tokens";

export function Search({ onOpenGame }: { onOpenGame: (slug: string) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Trending fills the screen before the first keystroke — an empty search box
  // over an empty screen is the worst first impression a search tab can make.
  useEffect(() => {
    api.trending().then((d) => setResults(d.games)).catch(() => {});
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setSearched(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await api.search(term);
        setResults(d.results); setSearched(true);
      } catch { /* keep whatever is on screen */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(3) }]}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder="Search games…"
          placeholderTextColor={color.n600}
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {!searched && q.trim() === "" && (
        <Text style={styles.kicker}>TRENDING</Text>
      )}

      {loading && <ActivityIndicator color={color.accent} style={{ marginTop: space(4) }} />}

      <FlatList
        data={results}
        keyExtractor={(g) => String(g.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: space(24), paddingTop: space(2) }}
        ListEmptyComponent={
          searched && !loading ? <Text style={styles.empty}>No games found.</Text> : null
        }
        renderItem={({ item, index }) => (
          <Pressable style={styles.row} onPress={() => onOpenGame(item.slug)}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Image source={item.coverUrl ?? ""} style={styles.cover} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.releaseYear ? <Text style={styles.year}>{item.releaseYear}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  searchWrap: { paddingHorizontal: space(5), paddingBottom: space(3) },
  input: {
    fontFamily: font.body, fontSize: 16, color: color.n100,
    backgroundColor: color.surface1, borderWidth: 1, borderColor: color.n800,
    paddingHorizontal: space(4), paddingVertical: space(3), borderRadius: 999,
  },
  kicker: { fontFamily: font.mono, fontSize: 10, letterSpacing: 2, color: color.n500, paddingHorizontal: space(5), paddingTop: space(2) },
  row: { flexDirection: "row", alignItems: "center", gap: space(3.5), paddingHorizontal: space(5), paddingVertical: space(2.5) },
  rank: { width: 22, textAlign: "right", fontFamily: font.monoBold, fontSize: 13, color: color.n700 },
  cover: { width: 40, height: 54, borderRadius: 2, backgroundColor: color.surface2 },
  name: { fontFamily: font.bodyMedium, fontSize: 15, color: color.n200 },
  year: { fontFamily: font.mono, fontSize: 11, color: color.n600, marginTop: space(0.5) },
  empty: { fontFamily: font.body, fontSize: 14, color: color.n500, textAlign: "center", marginTop: space(10) },
});
