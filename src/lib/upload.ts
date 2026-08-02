import { cloud as supabase } from "@/lib/cloud-client";

const BUCKET = "shop-assets";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadImage(file: File, folder = "misc"): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr || new Error("failed to sign");
  return data.signedUrl;
}
