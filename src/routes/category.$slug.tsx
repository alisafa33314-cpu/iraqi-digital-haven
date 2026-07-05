import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  errorComponent: () => (
    <Layout><Container className="py-20 text-center">حدث خطأ</Container></Layout>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `قسم — FPI STOR` },
      { name: "description", content: `تصفح منتجات القسم في متجر FPI STOR بالدينار العراقي.` },
    ],
  }),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const categories = useCatalog((s) => s.categories);
  const products = useCatalog((s) => s.products);
  const cat = categories.find((c) => c.slug === slug);
  const items = products.filter((p) => p.categorySlug === slug);

  if (!cat) {
    return (
      <Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black">القسم غير موجود</h1>
        </Container>
      </Layout>
    );
  }

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
