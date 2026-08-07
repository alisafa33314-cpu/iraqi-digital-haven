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
// إذا فشل التوقيع (خطأ شبكة/نشر) نُعيد مسار الملف بدل إفشال الطلب بالكامل.
export async function uploadPaymentProof(file: File): Promise<string> {
  const path = `payment-proofs/${crypto.randomUUID()}.${safeExt(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  try {
    const res = await signPaymentProof({ data: { path } });
    if (res?.ok && res.url) return res.url;
  } catch {
    /* تجاهل فشل التوقيع */
  }
  return `${BUCKET}/${path}`;
}

// عرض الأصول الخاصة (إثبات الدفع): إذا كانت القيمة رابطاً كاملاً نستخدمه،
// وإذا كانت مساراً داخل المخزن نولّد رابطاً موقّعاً (يتطلب صلاحية أدمن).
export async function resolveAssetUrl(value: string): Promise<string> {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const path = v.replace(/^\/+/, "").replace(new RegExp(`^${BUCKET}/`), "");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data) {
    console.error("[proof] failed to sign", path, error);
    return "";
  }
  return data.signedUrl;
}
