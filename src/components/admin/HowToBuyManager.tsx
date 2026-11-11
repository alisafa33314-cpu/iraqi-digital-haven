import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/lib/catalog";
import { uploadImage } from "@/lib/upload";
import { parseHowToBuy, type HowToBuyStep } from "@/lib/how-to-buy";

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-2 border border-border focus:border-primary outline-none text-sm";

export function HowToBuyManager({ adminCode, onChange }: { adminCode: string; onChange: () => void }) {
  const settings = useCatalog((s) => s.settings);
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [steps, setSteps] = useState<HowToBuyStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    setEnabled(settings["how_to_buy_enabled"] !== "false");
    setTitle(settings["how_to_buy_title"] || "كيفية الشراء");
    setSubtitle(settings["how_to_buy_subtitle"] || "خطوات بسيطة للحصول على طلبك");
    setSteps(parseHowToBuy(settings["how_to_buy_steps"]));
  }, [settings]);

  const update = (i: number, patch: Partial<HowToBuyStep>) =>
    setSteps((arr) => arr.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) =>
    setSteps((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const n = [...arr];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const upload = async (i: number, f: File) => {
    setUploadingIdx(i);
    try {
      update(i, { image: await uploadImage(f, "how-to-buy") });
      toast.success("تم رفع الصورة");
    } catch (e: any) { toast.error("فشل الرفع: " + (e?.message || "")); }
    finally { setUploadingIdx(null); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const clean = steps.filter((s) => s.title.trim() || s.text.trim() || s.image);
      const pairs: [string, string][] = [
        ["how_to_buy_enabled", enabled ? "true" : "false"],
        ["how_to_buy_title", title],
        ["how_to_buy_subtitle", subtitle],
        ["how_to_buy_steps", JSON.stringify(clean)],
      ];
      for (const [k, v] of pairs) {
        const { error } = await supabase.rpc("admin_set_setting" as any, { _code: adminCode, _key: k, _value: v });
        if (error) throw error;
      }
      toast.success("تم الحفظ");
      onChange();
    } catch (e: any) { toast.error("فشل: " + (e?.message || "")); }
    finally { setBusy(false); }
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6 space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-primary" />
        إظهار القسم في الصفحة الرئيسية
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="عنوان القسم" />
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} placeholder="وصف قصير" />
      </div>

      {steps.length === 0 && <p className="text-sm text-muted-foreground">لا توجد خطوات بعد — أضف أول خطوة.</p>}

      {steps.map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">{i + 1}</span>
            <span className="font-bold text-sm flex-1">الخطوة {i + 1}</span>
            <button onClick={() => move(i, -1)} className="p-1.5 rounded bg-surface-2" aria-label="تحريك للأعلى"><ArrowUp className="w-4 h-4" /></button>
            <button onClick={() => move(i, 1)} className="p-1.5 rounded bg-surface-2" aria-label="تحريك للأسفل"><ArrowDown className="w-4 h-4" /></button>
            <button onClick={() => setSteps((a) => a.filter((_, j) => j !== i))} className="p-1.5 rounded bg-surface-2 text-destructive" aria-label="حذف الخطوة"><Trash2 className="w-4 h-4" /></button>
          </div>
          <input value={s.title} onChange={(e) => update(i, { title: e.target.value })} className={inputCls} placeholder="عنوان الخطوة (مثال: اختر المنتج)" />
          <textarea value={s.text} onChange={(e) => update(i, { text: e.target.value })} className={inputCls} rows={2} placeholder="شرح الخطوة" />
          <div className="flex items-center gap-3 flex-wrap">
            {s.image && <img src={s.image} alt="" className="w-20 h-14 object-cover rounded-lg border border-border" />}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border cursor-pointer text-xs hover:border-primary/50">
              <Upload className="w-3.5 h-3.5" /> {uploadingIdx === i ? "جاري الرفع…" : s.image ? "تغيير الصورة" : "إضافة صورة"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingIdx !== null}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(i, f); e.target.value = ""; }} />
            </label>
            {s.image && <button onClick={() => update(i, { image: "" })} className="text-xs text-destructive">إزالة الصورة</button>}
          </div>
        </div>
      ))}

      <button onClick={() => setSteps((a) => [...a, { title: "", text: "", image: "" }])}
        className="w-full py-2.5 rounded-lg border border-dashed border-primary/50 text-primary font-bold flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> إضافة خطوة
      </button>
      <button onClick={save} disabled={busy || uploadingIdx !== null}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
        {busy ? "جاري الحفظ…" : "حفظ"}
      </button>
    </div>
  );
}
