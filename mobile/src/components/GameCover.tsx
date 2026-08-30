import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { color, font, radius, shadow, space, statusColor } from "../theme/tokens";

/**
 * A piece of box art treated as an object, not a card.
 *
 * Ports three details from the web version that carry most of the identity:
 * the case spine (a hairline of light down the left edge), the square status
 * pixel with its highlight, and a brown-black contact shadow. No panel, no
 * border — the artwork is the card.
 */
export function GameCover({
  game,
  width = 132,
  catalogNumber,
  onPress,
  showTitle = true,
}: {
  game: { name: string; cover: string; year: number; status?: string; rating?: number | null; platform?: string | null };
  width?: number;
  catalogNumber?: number;
  onPress?: () => void;
  /** Favourite slots show art only — the title would crowd a 72px cover. */
  showTitle?: boolean;
}) {
  const status = game.status ? statusColor[game.status] : undefined;

  return (
    <Pressable style={{ width }} onPress={onPress}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }}>
          <View style={[styles.caseWrap, shadow.cover, { width, height: width * (4 / 3) }]}>
            <Image
              source={game.cover}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={220}
            />

            {/* Case spine — the detail that turns a jpg into a boxed game. */}
            <LinearGradient
              colors={["rgba(255,255,255,0.24)", "rgba(255,255,255,0.05)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.13, y: 0 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {status && (
              <View style={[styles.statusPixel, { backgroundColor: status }]}>
                <View style={styles.statusHighlight} />
              </View>
            )}

            {game.rating != null && (
              <View style={styles.ratingChip}>
                <Text style={styles.ratingText}>{game.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {showTitle && catalogNumber !== undefined && (
            <Text style={styles.catalog}>
              № {String(catalogNumber).padStart(3, "0")}
            </Text>
          )}
          {showTitle && (
            <Text style={styles.title} numberOfLines={2}>
              {game.name}
            </Text>
          )}
          {showTitle && (
            <Text style={styles.meta} numberOfLines={1}>
              {game.year}
              {game.platform ? `  ·  ${game.platform}` : ""}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caseWrap: {
    borderRadius: radius.cover,
    overflow: "hidden",
    backgroundColor: color.surface2,
  },
  statusPixel: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 7,
    height: 7,
    borderWidth: 1.5,
    borderColor: "rgba(10,6,3,0.75)",
  },
  statusHighlight: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 2,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  ratingChip: {
    position: "absolute",
    right: 5,
    bottom: 5,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  ratingText: {
    fontFamily: font.monoBold,
    fontSize: 10,
    color: color.accent,
  },
  catalog: {
    fontFamily: font.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    color: color.n700,
    marginTop: space(2.5),
  },
  title: {
    fontFamily: font.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    color: color.n200,
    marginTop: space(1.5),
  },
  meta: {
    fontFamily: font.mono,
    fontSize: 10,
    color: color.n500,
    marginTop: space(0.5),
  },
});
