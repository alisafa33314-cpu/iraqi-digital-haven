import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useCatalog } from "@/lib/catalog";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "الأقسام — FPI STOR" },
      { name: "description", content: "تصفح جميع أقسام متجر FPI STOR: بلايستيشن، اكس بوكس، بث، كفت كارد، ستيم، وخدمات ذكاء اصطناعي بالدينار العراقي." },
      { property: "og:title", content: "الأقسام — FPI STOR" },
      { property: "og:description", content: "جميع أقسام المتجر الرقمي بالدينار العراقي." },
      { property: "og:url", content: "https://iraqi-digital-haven.lovable.app/categories" },
    ],
    links: [{ rel: "canonical", href: "https://iraqi-digital-haven.lovable.app/categories" }],
  }),
  component: CategoriesPage,
});


function CategoriesPage() {
  const categories = useCatalog((s) => s.categories);
  return (
    <Layout>
      <Container className="py-10">
        <h1 className="text-3xl md:text-4xl font-black mb-2">جميع الأقسام</h1>
        <p className="text-muted-foreground mb-8">اختر القسم الذي يناسبك</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="card-neon rounded-2xl p-6 flex flex-col items-center text-center gap-2"
            >
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className="w-20 h-20 rounded-xl object-cover mb-1" />
              ) : (
                <div className="text-5xl mb-2">{c.icon}</div>
              )}
              <div className="font-bold text-lg">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.count} منتج متاح</div>
            </Link>
          ))}
        </div>
      </Container>
    </Layout>
  );
}
