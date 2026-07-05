import { createFileRoute, notFound } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { getCategory, productsByCategory } from "@/lib/data";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  notFoundComponent: () => (
    <Layout><Container className="py-20 text-center">القسم غير موجود</Container></Layout>
  ),
  errorComponent: () => (
    <Layout><Container className="py-20 text-center">حدث خطأ</Container></Layout>
  ),
  loader: ({ params }) => {
    const cat = getCategory(params.slug);
    if (!cat) throw notFound();
    return { cat, items: productsByCategory(params.slug) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.cat.name} — FPI STOR` },
          { name: "description", content: `تصفح منتجات قسم ${loaderData.cat.name} في متجر FPI STOR بالدينار العراقي.` },
        ]
      : [{ title: "قسم — FPI STOR" }],
  }),
});

function CategoryPage() {
  const { cat, items } = Route.useLoaderData();
  return (
    <Layout>
      <Container className="py-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="text-5xl">{cat.icon}</div>
          <div>
            <h1 className="text-3xl font-black">{cat.name}</h1>
            <div className="text-sm text-muted-foreground">{items.length} منتج</div>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            لا توجد منتجات في هذا القسم حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </Container>
    </Layout>
  );
}
