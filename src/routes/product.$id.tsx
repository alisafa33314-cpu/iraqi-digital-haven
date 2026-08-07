import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { useState } from "react";
import { ShoppingCart, Shield, Zap, Star } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
  errorComponent: () => (
    <Layout><Container className="py-20 text-center">حدث خطأ</Container></Layout>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `منتج — FPI STOR` },
      { name: "description", content: "اطلب منتجك الرقمي من FPI STOR بالدينار العراقي مع تسليم فوري." },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `https://iraqi-digital-haven.lovable.app/product/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `https://iraqi-digital-haven.lovable.app/product/${params.id}` }],
  }),
});


function ProductPage() {
  const { id } = Route.useParams();
  const [showAllReviews, setShowAllReviews] = useState(false);
  const products = useCatalog((s) => s.products);
  const paymentMethods = useCatalog((s) => s.paymentMethods);
  const allReviews = useCatalog((s) => s.reviews);
  const product = products.find((p) => p.id === id);
  const add = useCart((s) => s.add);
  const productReviews = allReviews.filter((r) => r.product_id === id);


  if (!product) {
    return (
      <Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black">المنتج غير موجود</h1>
        </Container>
      </Layout>
    );
  }

  const related = products
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, 4);

  return (
    <Layout>
      <Container className="py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative rounded-3xl overflow-hidden bg-surface aspect-square card-neon">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3">
              {product.inStock ? (
                <span className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-black shadow-lg">
                  ✓ متوفر
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-black shadow-lg">
                  غير متوفر
                </span>
              )}
            </div>
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

            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl font-black text-primary text-glow">{formatIQD(product.price)}</span>
              {product.oldPrice && (
                <span className="text-lg text-muted-foreground line-through">{formatIQD(product.oldPrice)}</span>
              )}
            </div>
            {product.inStock && typeof product.stock === "number" && (
              <div className={`text-sm font-bold mb-6 ${product.stock === 0 ? "text-destructive" : product.stock <= 5 ? "text-orange-500" : "text-emerald-500"}`}>
                {product.stock === 0 ? "نفذت الكمية" : `الكمية المتوفرة: ${product.stock}`}
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap">{product.description}</p>

            <div className="flex gap-3 mb-6">
              <button
                disabled={!product.inStock}
                onClick={() => {
                  if (add(product)) toast.success("تمت الإضافة إلى السلة");
                  else toast.error("لا يمكن إضافة أكثر من الكمية المتوفرة");
                }}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 btn-glow"
              >
                <ShoppingCart className="w-5 h-5" />
                أضف للسلة
              </button>
              <Link
                to="/cart"
                onClick={() => { if (product.inStock) add(product); }}
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
                  <span key={m.id} className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border inline-flex items-center gap-2">
                    {m.image_url && <img src={m.image_url} alt="" className="w-4 h-4 rounded object-cover" />}
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product reviews */}
        <div className="mt-14">
          <h2 className="text-2xl font-black mb-5 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> تقييمات الزبائن
          </h2>
          {productReviews.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 card-neon rounded-2xl text-center">
              لا توجد تقييمات لهذا المنتج بعد.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {(showAllReviews ? productReviews : productReviews.slice(0, 4)).map((r) => (
                  <div key={r.id} className="card-neon rounded-2xl p-4">
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground leading-relaxed mb-3">"{r.comment}"</p>}
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold">{r.customer_name}</div>
                      <div className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar-IQ")}</div>
                    </div>
                  </div>
                ))}
              </div>
              {productReviews.length > 4 && (
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllReviews((v) => !v)}
                    className="px-6 py-3 rounded-xl bg-surface border border-border font-bold hover:border-primary/50 transition"
                  >
                    {showAllReviews ? "طي التقييمات 🔼" : "عرض المزيد من التقييمات 🔽"}
                  </button>
                </div>
              )}
            </>
          )}
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
