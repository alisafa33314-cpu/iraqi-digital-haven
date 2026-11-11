import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { SkeletonCards } from "@/components/Skeleton";
import { useCatalog } from "@/lib/catalog";
export const Route = createFileRoute("/categories")({
    head: () => ({
        meta: [
            { title: "الأقسام — FPI STOR" },
            { name: "description", content: "تصفح جميع أقسام متجر FPI STOR: بلايستيشن، اكس بوكس، بث، كفت كارد، ستيم، وخدمات ذكاء اصطناعي بالدينار العراقي." },
            { property: "og:title", content: "الأقسام — FPI STOR" },
            { property: "og:description", content: "جميع أقسام المتجر الرقمي بالدينار العراقي." },
            { property: "og:url", content: "https://fpistor.com/categories" },
        {property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}],
        links: [{ rel: "canonical", href: "https://fpistor.com/categories" }],
    }),
    component: CategoriesPage,
});
function CategoriesPage() {
    useLanguage();
    const categories = useCatalog((s) => s.categories);
    const ready = useCatalog((s) => s.ready);
    return (<Layout>
      <Container className="py-10">
        <h1 className="text-3xl md:text-4xl font-black mb-2">{t("\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0642\u0633\u0627\u0645")}</h1>
        <p className="text-muted-foreground mb-8">{t("\u0627\u062E\u062A\u0631 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0630\u064A \u064A\u0646\u0627\u0633\u0628\u0643")}</p>
        {!ready ? (<SkeletonCards count={9} className="grid grid-cols-2 md:grid-cols-3 gap-4"/>) : (<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((c) => (<Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="card-neon rounded-2xl p-6 flex flex-col items-center text-center gap-2">
                {c.image_url ? (<img src={c.image_url} alt={t(c.name ?? "")} loading="lazy" decoding="async" className="w-20 h-20 rounded-xl object-cover mb-1"/>) : (<div className="text-5xl mb-2">{c.icon}</div>)}
                <div className="font-bold text-lg">{t(c.name ?? "")}</div>
                <div className="text-xs text-muted-foreground">{c.count}{t(" \u0645\u0646\u062A\u062C \u0645\u062A\u0627\u062D")}</div>
              </Link>))}
          </div>)}
      </Container>
    </Layout>);
}
