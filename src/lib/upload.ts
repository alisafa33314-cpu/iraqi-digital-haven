import { cloud as supabase } from "@/lib/cloud-client";
import { signPaymentProof } from "@/lib/upload.functions";

const BUCKET = "shop-assets";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const ALLOWED_EXT = ["png", "jpg", "jpeg", "webp", "gif", "avif", "heic"];

function safeExt(file: File) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ALLOWED_EXT.includes(ext)) return ext;
  const fromType = (file.type.split("/").pop() || "").toLowerCase();
  return ALLOWED_EXT.includes(fromType) ? fromType : "jpg";
}

export async function uploadImage(file: File, folder = "misc"): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${safeExt(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr || new Error("failed to sign");
  return data.signedUrl;
}

// إثبات الدفع: الزائر يستطيع الرفع فقط، والتوقيع يتم على الخادم.
export async function uploadPaymentProof(file: File): Promise<string> {
  const path = `payment-proofs/${crypto.randomUUID()}.${safeExt(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const res = await signPaymentProof({ data: { path } });
  if (!res?.ok || !res.url) throw new Error(res?.error || "failed to sign");
  return res.url;
}
