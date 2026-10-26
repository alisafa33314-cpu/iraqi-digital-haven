/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { resolvePublicBackend, googleOAuthRedirect } from "./backend-config";
import vercel from "../../vercel.json";

describe("Vercel backend configuration", () => {
  test("uses the requested project URL", () => {
    expect(resolvePublicBackend(vercel.env).url).toBe("https://cjriylxkwoqovvlhlruq.supabase.co");
    expect(vercel.env.SUPABASE_URL).toBe("https://cjriylxkwoqovvlhlruq.supabase.co");
  });
  test("uses the new project's public key for browser and server public access", () => {
    expect(resolvePublicBackend(vercel.env).key).toBe("sb_publishable_TXHfpw2Zj1iVpn8ch61N9A_1ROUzfcW");
    expect(vercel.env.SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_TXHfpw2Zj1iVpn8ch61N9A_1ROUzfcW");
  });
  test("returns Google sign-in to the requested store domain", () => {
    expect(googleOAuthRedirect("https://fpistor.com")).toBe("https://fpistor.com");
    expect(googleOAuthRedirect("https://www.fpistor.com")).toBe("https://fpistor.com");
  });
  test("rejects an incomplete connection instead of mixing project keys", () => {
    expect(() => resolvePublicBackend({ VITE_SUPABASE_URL: "https://cjriylxkwoqovvlhlruq.supabase.co" })).toThrow();
  });
});