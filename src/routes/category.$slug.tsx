import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { useCatalog } from "@/lib/catalog";
import { listableProducts } from "@/lib/data";
import { useMemo } from "react";
export const Route = createFileRoute("/category/$slug")({
    component: CategoryPage,
    errorComponent: () => (<Layout><Container className="py-20 text-center">{t("\u062D\u062F\u062B \u062E\u0637\u0623")}</Container></Layout>),
    head: ({ params }) => ({
        meta: [
            { title: `قسم ${params.slug} — FPI STOR` },
            { name: "description", content: `تصفح منتجات قسم ${params.slug} في متجر FPI STOR بالدينار العراقي مع تسليم فوري.` },
            { property: "og:title", content: `قسم ${params.slug} — FPI STOR` },
            { property: "og:description", content: `منتجات قسم ${params.slug} بالدينار العراقي.` },
            { property: "og:url", content: `https://fpistor.com/category/${params.slug}` },
        ],
        links: [{ rel: "canonical", href: `https://fpistor.com/category/${params.slug}` }],
    }),
});
function CategoryPage() {
    useLanguage();
    const { slug } = Route.useParams();
    const categories = useCatalog((s) => s.categories);
    const products = useCatalog((s) => s.products);
    const ready = useCatalog((s) => s.ready);
    const cat = useMemo(() => categories.find((c) => c.slug === slug), [categories, slug]);
    const items = useMemo(() => listableProducts(products).filter((p) => p.categorySlug === slug), [products, slug]);
    if (!cat) {
        return (<Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black">{t("\u0627\u0644\u0642\u0633\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F")}</h1>
        </Container>
      </Layout>);
    }
    return (<Layout>
      <Container className="py-10">
        <div className="mb-8 flex items-center gap-4">
          
          <div>
            <h1 className="text-3xl font-black"></h1>
            <div className="text-sm text-muted-foreground">{t(" \u0645\u0646\u062A\u062C")}</div>
          </div>
        </div>
        
      </Container>
    </Layout>);
}
