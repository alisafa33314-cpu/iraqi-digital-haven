import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { resolvePublicBackend, googleOAuthRedirect } from "./backend-config";
import vercel from "../../vercel.json";

describe("Vercel backend configuration", () => {
  test("uses the requested project URL", () => {
    assert.equal(resolvePublicBackend(vercel.env).url, "https://maeniuozqrionnhmssli.supabase.co");
    assert.equal(vercel.env.SUPABASE_URL, "https://maeniuozqrionnhmssli.supabase.co");
  });
  test("uses the store backend's public key for browser and server public access", () => {
    assert.equal(resolvePublicBackend(vercel.env).key, "sb_publishable_A-6Q--ON6buJy4QrkIHIYA_j_e3JxNO");
    assert.equal(vercel.env.SUPABASE_PUBLISHABLE_KEY, "sb_publishable_A-6Q--ON6buJy4QrkIHIYA_j_e3JxNO");
  });
  test("returns Google sign-in to the requested store domain", () => {
    assert.equal(googleOAuthRedirect("https://fpistor.com"), "https://fpistor.com");
    assert.equal(googleOAuthRedirect("https://www.fpistor.com"), "https://fpistor.com");
  });
  test("rejects an incomplete connection instead of mixing project keys", () => {
    assert.throws(() => resolvePublicBackend({ VITE_SUPABASE_URL: "https://maeniuozqrionnhmssli.supabase.co" }));
  });
});