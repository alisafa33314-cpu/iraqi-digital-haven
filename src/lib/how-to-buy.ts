export type HowToBuyStep = { title: string; text: string; image: string };

export function parseHowToBuy(raw: string | undefined): HowToBuyStep[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((s: any) => ({ title: String(s?.title || ""), text: String(s?.text || ""), image: String(s?.image || "") }))
      .filter((s) => s.title || s.text || s.image);
  } catch {
    return [];
  }
}
