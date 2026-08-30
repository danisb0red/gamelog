import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { color, font, space } from "../theme/tokens";

/** Sign in / create account. Plain language — no game-menu costume. */
export function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.mark} />
          <Text style={styles.wordmark}>
            game<Text style={{ color: color.accent }}>log</Text>
          </Text>
        </View>

        <Text style={styles.title}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Text>
        <Text style={styles.sub}>Every game you've ever played.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={color.n600}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={color.n600}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={color.accentFg} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          hitSlop={12}
        >
          <Text style={styles.switch}>
            {mode === "signin" ? "NEED AN ACCOUNT? SIGN UP" : "ALREADY HAVE ONE? SIGN IN"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, justifyContent: "center" },
  inner: { paddingHorizontal: space(7) },
  brand: { flexDirection: "row", alignItems: "center", gap: space(2.5), marginBottom: space(10) },
  mark: { width: 14, height: 14, backgroundColor: color.accent },
  wordmark: { fontFamily: font.displayBold, fontSize: 17, color: color.n100 },
  title: { fontFamily: font.displayBold, fontSize: 34, letterSpacing: -1, color: color.n50 },
  sub: { fontFamily: font.body, fontSize: 15, color: color.n400, marginTop: space(2), marginBottom: space(8) },
  input: {
    fontFamily: font.body, fontSize: 16, color: color.n100,
    backgroundColor: color.surface1,
    borderWidth: 1, borderColor: color.n800,
    paddingHorizontal: space(3.5), paddingVertical: space(3.5),
    marginBottom: space(3),
  },
  button: {
    backgroundColor: color.accent,
    paddingVertical: space(4),
    alignItems: "center",
    marginTop: space(3),
  },
  buttonText: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 2, color: color.accentFg },
  switch: {
    fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6,
    color: color.n500, textAlign: "center", marginTop: space(6),
  },
  error: { fontFamily: font.body, fontSize: 13, color: color.dropped, marginBottom: space(2) },
  notice: { fontFamily: font.body, fontSize: 13, color: color.playing, marginBottom: space(2) },
});
