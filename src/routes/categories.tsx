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
        ],
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
        
      </Container>
    </Layout>);
}
