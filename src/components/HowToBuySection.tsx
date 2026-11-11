import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { useCatalog } from "@/lib/catalog";
import { parseHowToBuy } from "@/lib/how-to-buy";
export function HowToBuySection() {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const steps = parseHowToBuy(settings["how_to_buy_steps"]);
    if (settings["how_to_buy_enabled"] === "false" || steps.length === 0)
        return null;
    const title = settings["how_to_buy_title"] || "كيفية الشراء";
    const subtitle = settings["how_to_buy_subtitle"] || "خطوات بسيطة للحصول على طلبك";
    return (<section id="how-to-buy" className="py-12 border-t border-border scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black"></h2>
          <p className="text-muted-foreground text-sm mt-1"></p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
        </ol>
      </div>
    </section>);
}
