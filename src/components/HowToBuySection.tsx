import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { useCatalog } from "@/lib/catalog";
import { parseHowToBuy } from "@/lib/how-to-buy";
export function HowToBuySection({ ignoreHomeToggle = false }: {
    ignoreHomeToggle?: boolean;
}) {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const steps = parseHowToBuy(settings["how_to_buy_steps"]);
    if ((!ignoreHomeToggle && settings["how_to_buy_enabled"] === "false") || steps.length === 0)
        return null;
    const title = settings["how_to_buy_title"] || "كيفية الشراء";
    const subtitle = settings["how_to_buy_subtitle"] || "خطوات بسيطة للحصول على طلبك";
    return (<section id="how-to-buy" className="py-12 border-t border-border scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black">{t(title ?? "")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t(subtitle ?? "")}</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (<li key={i} className="card-neon rounded-2xl overflow-hidden flex flex-col">
              {s.image && (<div className="aspect-video bg-surface-2">
                  <img src={s.image} alt={s.title || `الخطوة ${i + 1}`} loading="lazy" className="w-full h-full object-cover"/>
                </div>)}
              <div className="p-4 flex gap-3">
                <span className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  {s.title && <h3 className="font-black">{t(s.title ?? "")}</h3>}
                  {s.text && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line break-words">{t(s.text ?? "")}</p>}
                </div>
              </div>
            </li>))}
        </ol>
      </div>
    </section>);
}
