import { createServerFn } from "@tanstack/react-start";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const PATH_RE = /^payment-proofs\/[A-Za-z0-9-]+\.[A-Za-z0-9]{1,8}$/;

// إثباتات الدفع خاصة (لا قراءة عامة)، لذلك التوقيع يتم من الخادم فقط.
export const signPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => {
    const path = String(data?.path ?? "");
    if (!PATH_RE.test(path)) throw new Error("invalid_path");
    return { path };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("shop-assets")
      .createSignedUrl(data.path, TEN_YEARS);
    if (error || !signed) return { ok: false as const, error: error?.message || "sign_failed" };
    return { ok: true as const, url: signed.signedUrl };
  });
