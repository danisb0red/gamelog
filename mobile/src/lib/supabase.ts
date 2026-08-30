import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for the device.
 *
 * Auth only — this client never queries Postgres. All user data goes through
 * the Next.js API so there is exactly one authorisation implementation and
 * IGDB credentials never leave the server.
 *
 * AsyncStorage rather than SecureStore: Supabase sessions exceed SecureStore's
 * 2048-byte limit once the JWT and refresh token are serialised together.
 */
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // No URL to parse on a device; leaving this on causes a startup warning.
      detectSessionInUrl: false,
    },
  },
);
