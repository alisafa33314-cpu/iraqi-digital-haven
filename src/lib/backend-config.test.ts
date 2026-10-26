import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { resolvePublicBackend, googleOAuthRedirect } from "./backend-config";
import vercel from "../../vercel.json";

describe("Vercel backend configuration", () => {
  test("uses the requested project URL", () => {
    assert.equal(resolvePublicBackend(vercel.env).url, "https://cjriylxkwoqovvlhlruq.supabase.co");
    assert.equal(vercel.env.SUPABASE_URL, "https://cjriylxkwoqovvlhlruq.supabase.co");
  });
  test("uses the new project's public key for browser and server public access", () => {
    assert.equal(resolvePublicBackend(vercel.env).key, "sb_publishable_TXHfpw2Zj1iVpn8ch61N9A_1ROUzfcW");
    assert.equal(vercel.env.SUPABASE_PUBLISHABLE_KEY, "sb_publishable_TXHfpw2Zj1iVpn8ch61N9A_1ROUzfcW");
  });
  test("returns Google sign-in to the requested store domain", () => {
    assert.equal(googleOAuthRedirect("https://fpistor.com"), "https://fpistor.com");
    assert.equal(googleOAuthRedirect("https://www.fpistor.com"), "https://fpistor.com");
  });
  test("rejects an incomplete connection instead of mixing project keys", () => {
    assert.throws(() => resolvePublicBackend({ VITE_SUPABASE_URL: "https://cjriylxkwoqovvlhlruq.supabase.co" }));
  });
});