import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD, getProduct, paymentMethods, products } from "@/lib/data";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { Star, ShoppingCart, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
  notFoundComponent: () => (
    <Layout><Container className="py-20 text-center">المنتج غير موجود</Container></Layout>
  ),
  errorComponent: () => (
    <Layout><Container className="py-20 text-center">حدث خطأ</Container></Layout>
  ),
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — FPI STOR` },
          { name: "description", content: loaderData.product.description },
          { property: "og:title", content: loaderData.product.name },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [{ title: "منتج — FPI STOR" }],
  }),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const add = useCart((s) => s.add);
  const related = products.filter(
    (p) => p.categorySlug === product.categorySlug && p.id !== product.id,
  ).slice(0, 4);

  return (
    <Layout>
      <Container className="py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative rounded-3xl overflow-hidden bg-surface aspect-square card-neon">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            {!product.inStock && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="px-4 py-2 rounded-lg bg-destructive font-bold">غير متوفر</span>
              </div>
            )}
          </div>
          <div>
            <Link
              to="/category/$slug"
              params={{ slug: product.categorySlug }}
              className="text-xs text-primary font-bold"
            >
              ← عودة إلى القسم
            </Link>
            <h1 className="text-2xl md:text-3xl font-black mt-3 mb-3">{product.name}</h1>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="font-bold">{product.rating}</span>
                <span className="text-muted-foreground">({product.reviews} تقييم)</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md font-bold ${
                product.inStock
                  ? "bg-green-500/15 text-green-400 border border-green-500/30"
                  : "bg-destructive/15 text-destructive border border-destructive/30"
              }`}>
                {product.inStock ? "متوفر" : "غير متوفر"}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-primary text-glow">{formatIQD(product.price)}</span>
              {product.oldPrice && (
                <span className="text-lg text-muted-foreground line-through">{formatIQD(product.oldPrice)}</span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

            <div className="flex gap-3 mb-6">
              <button
                disabled={!product.inStock}
                onClick={() => { add(product); toast.success("تمت الإضافة إلى السلة"); }}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 btn-glow"
              >
                <ShoppingCart className="w-5 h-5" />
                أضف للسلة
              </button>
              <Link
                to="/cart"
                onClick={() => product.inStock && add(product)}
                className="flex-1 py-3.5 rounded-xl bg-surface border border-border font-bold text-center hover:border-primary/50 transition"
              >
                اشترِ الآن
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card-neon rounded-xl p-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <div className="text-xs">
                  <div className="font-bold">تسليم فوري</div>
                  <div className="text-muted-foreground">خلال دقائق</div>
                </div>
              </div>
              <div className="card-neon rounded-xl p-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <div className="text-xs">
                  <div className="font-bold">ضمان الجودة</div>
                  <div className="text-muted-foreground">حسابات موثوقة</div>
                </div>
              </div>
            </div>

            <div className="card-neon rounded-xl p-4">
              <div className="text-sm font-bold mb-3">طرق الدفع المتاحة</div>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((m) => (
                  <span key={m.name} className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-black mb-5">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </Container>
    </Layout>
  );
}
