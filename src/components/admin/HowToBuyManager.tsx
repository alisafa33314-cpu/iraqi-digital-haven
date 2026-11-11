import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/lib/catalog";
import { uploadImage } from "@/lib/upload";
import { parseHowToBuy, type HowToBuyStep } from "@/lib/how-to-buy";
const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-2 border border-border focus:border-primary outline-none text-sm";
export function HowToBuyManager({ adminCode, onChange }: {
    adminCode: string;
    onChange: () => void;
}) {
    useLanguage();
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
    const update = (i: number, patch: Partial<HowToBuyStep>) => setSteps((arr) => arr.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    const move = (i: number, d: number) => setSteps((arr) => {
        const j = i + d;
        if (j < 0 || j >= arr.length)
            return arr;
        const n = [...arr];
        [n[i], n[j]] = [n[j], n[i]];
        return n;
    });
    const upload = async (i: number, f: File) => {
        setUploadingIdx(i);
        try {
            update(i, { image: await uploadImage(f, "how-to-buy") });
            toast.success(t("تم رفع الصورة"));
        }
        catch (e: any) {
            toast.error(t("فشل الرفع: " + (e?.message || "")));
        }
        finally {
            setUploadingIdx(null);
        }
    };
    const save = async () => {
        setBusy(true);
        try {
            const clean = steps.filter((s) => s.title.trim() || s.text.trim() || s.image);
            const pairs: [
                string,
                string
            ][] = [
                ["how_to_buy_enabled", enabled ? "true" : "false"],
                ["how_to_buy_title", title],
                ["how_to_buy_subtitle", subtitle],
                ["how_to_buy_steps", JSON.stringify(clean)],
            ];
            for (const [k, v] of pairs) {
                const { error } = await supabase.rpc("admin_set_setting" as any, { _code: adminCode, _key: k, _value: v });
                if (error)
                    throw error;
            }
            toast.success(t("تم الحفظ"));
            onChange();
        }
        catch (e: any) {
            toast.error(t("فشل: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6 space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked= onChange= className="accent-primary"/>{t(" \u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0642\u0633\u0645 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 ")}</label>
      <div className="grid sm:grid-cols-2 gap-3">
        <input value= onChange= className= placeholder={t("عنوان القسم")}/>
        <input value= onChange= className= placeholder={t("وصف قصير")}/>
      </div>

      

      

      <button onClick= className="w-full py-2.5 rounded-lg border border-dashed border-primary/50 text-primary font-bold flex items-center justify-center gap-2">
        <Plus className="w-4 h-4"/>{t(" \u0625\u0636\u0627\u0641\u0629 \u062E\u0637\u0648\u0629 ")}</button>
      <button onClick= disabled= className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
        
      </button>
    </div>);
}
