import { View, Text, StyleSheet, ScrollView } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { color, font, space } from "../theme/tokens";

/** Small mono section marker with the 4px accent square. */
export function HudLabel({ children }: { children: string }) {
  return (
    <View style={styles.hudRow}>
      <View style={styles.hudSquare} />
      <Text style={styles.hudText}>{children.toUpperCase()}</Text>
    </View>
  );
}

/** Section heading in the display face. */
export function Heading({ children, count }: { children: string; count?: number }) {
  return (
    <View style={styles.headingRow}>
      <Text style={styles.heading}>{children}</Text>
      {count !== undefined && (
        <Text style={styles.headingCount}>{String(count).padStart(2, "0")}</Text>
      )}
    </View>
  );
}

/** Divider that fades from both sides into a single 3px square. */
export function PixelRule() {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleLine} />
      <View style={styles.ruleSquare} />
      <View style={styles.ruleLine} />
    </View>
  );
}

/**
 * Pixel sprites port unchanged — they were already inline SVG rects on the web,
 * so react-native-svg renders the identical geometry.
 */
export function PixelController({ size = 15, fill = color.n600 }: { size?: number; fill?: string }) {
  const s = size / 14;
  const r = (x: number, y: number, w: number, h: number, f: string = fill) => (
    <Rect key={`${x}-${y}-${w}-${h}`} x={x * s} y={y * s} width={w * s} height={h * s} fill={f} />
  );
  return (
    <Svg width={size} height={(size * 9) / 14}>
      {r(2, 1, 10, 1)}
      {r(1, 2, 12, 4)}
      {r(0, 3, 1, 4)}
      {r(13, 3, 1, 4)}
      {r(1, 6, 3, 2)}
      {r(10, 6, 3, 2)}
      {r(3, 3, 3, 1, color.bg)}
      {r(4, 2, 1, 3, color.bg)}
      {r(9, 2, 1, 1, color.bg)}
      {r(10, 4, 1, 1, color.bg)}
    </Svg>
  );
}

/** Horizontal shelf: covers standing on a lit edge. */
export function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {children}
      </ScrollView>
      <View style={styles.shelfEdge} />
    </View>
  );
}

const styles = StyleSheet.create({
  hudRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  hudSquare: { width: 4, height: 4, backgroundColor: color.accent },
  hudText: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: color.n400,
  },
  headingRow: { flexDirection: "row", alignItems: "baseline", gap: space(2.5) },
  heading: {
    fontFamily: font.displayBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: color.n100,
  },
  headingCount: { fontFamily: font.mono, fontSize: 13, color: color.n500 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
  ruleLine: { flex: 1, height: 1, backgroundColor: "rgba(231,220,203,0.13)" },
  ruleSquare: { width: 3, height: 3, backgroundColor: color.accent, opacity: 0.7 },
  shelfContent: { gap: space(4), paddingHorizontal: space(5), paddingBottom: space(4) },
  shelfEdge: {
    height: 1,
    marginHorizontal: space(5),
    backgroundColor: "rgba(229,113,91,0.28)",
  },
});
