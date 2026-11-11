import { t, useLanguage } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { HowToBuySection } from "@/components/HowToBuySection";
import { useCatalog } from "@/lib/catalog";
import { parseHowToBuy } from "@/lib/how-to-buy";
import { ArrowLeft, MessageCircle } from "lucide-react";
export const Route = createFileRoute("/how-to-buy")({
    head: () => ({
        meta: [
            { title: "دليل الشراء — FPI STOR" },
            { name: "description", content: "دليل الشراء في متجر FPI STOR: خطوات بسيطة لاختيار المنتج وإتمام الطلب والاستلام بالدينار العراقي." },
            { property: "og:title", content: "دليل الشراء — FPI STOR" },
            { property: "og:description", content: "خطوات بسيطة لاختيار المنتج وإتمام الطلب والاستلام في متجر FPI STOR." },
            { property: "og:url", content: "https://fpistor.com/how-to-buy" },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: "https://fpistor.com/how-to-buy" }],
    }),
    component: HowToBuyPage,
});
function HowToBuyPage() {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const steps = parseHowToBuy(settings["how_to_buy_steps"]);
    const hidden = settings["how_to_buy_enabled"] === "false" || steps.length === 0;
    return (<Layout>
      <Container className="py-10">
        <h1 className="text-3xl md:text-4xl font-black mb-2">{t("دليل الشراء")}</h1>
        {hidden ? (<div className="card-neon rounded-2xl p-6 text-center mt-8">
            <p className="text-muted-foreground">{t("لا توجد خطوات منشورة حالياً — تواصل معنا وسنرشدك خطوة بخطوة.")}</p>
            <a href="https://wa.me/9647770586502" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:btn-glow transition">
              <MessageCircle className="w-4 h-4"/>{t("تواصل عبر واتساب")}
            </a>
          </div>) : (<HowToBuySection />)}
        <div className="mt-8">
          <Link to="/categories" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">
            {t("تصفح المتجر")}<ArrowLeft className="w-4 h-4"/>
          </Link>
        </div>
      </Container>
    </Layout>);
}
