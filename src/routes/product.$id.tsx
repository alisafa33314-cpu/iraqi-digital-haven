import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { baseProductName, formatIQD, listableProducts, variantsOf } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useState } from "react";
import { ShoppingCart, Shield, Zap, Star, Link2 } from "lucide-react";
import { toast } from "sonner";
export const Route = createFileRoute("/product/$id")({
    component: ProductPage,
    errorComponent: () => (<Layout><Container className="py-20 text-center">{t("\u062D\u062F\u062B \u062E\u0637\u0623")}</Container></Layout>),
    head: ({ params }) => ({
        meta: [
            { title: `منتج — FPI STOR` },
            { name: "description", content: "اطلب منتجك الرقمي من FPI STOR بالدينار العراقي مع تسليم فوري." },
            { property: "og:title", content: "تفاصيل المنتج — FPI STOR" },
            { property: "og:description", content: "اختر مدة اشتراكك واطلب منتجك الرقمي بالدينار العراقي من FPI STOR." },
            { name: "twitter:card", content: "summary" },
            { property: "og:type", content: "product" },
            { property: "og:url", content: `https://fpistor.com/product/${params.id}` },
        ],
        links: [{ rel: "canonical", href: `https://fpistor.com/product/${params.id}` }],
    }),
});
function ProductPage() {
    useLanguage();
    const { id } = Route.useParams();
    const [showAllReviews, setShowAllReviews] = useState(false);
    const products = useCatalog((s) => s.products);
    const paymentMethods = useCatalog((s) => s.paymentMethods);
    const allReviews = useCatalog((s) => s.reviews);
    const found = products.find((p) => p.id === id);
    const variants = found ? variantsOf(products, found) : [];
    const [variantId, setVariantId] = useState<string | null>(null);
    const product = (variantId && variants.find((v) => v.id === variantId)) || found;
    const add = useCart((s) => s.add);
    const clear = useCart((s) => s.clear);
    const navigate = useNavigate();
    const productReviews = allReviews.filter((r) => r.product_id === id);
    if (!product) {
        return (<Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black">{t("\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F")}</h1>
        </Container>
      </Layout>);
    }
    const addToCart = () => {
        if (!product.inStock)
            return;
        if (add(product))
            toast.success(t("تمت الإضافة إلى السلة"));
        else
            toast.error(t("لا يمكن إضافة أكثر من الكمية المتوفرة"));
    };
    const buyNow = () => {
        if (!product.inStock)
            return;
        clear();
        if (add(product))
            navigate({ to: "/checkout" });
        else
            toast.error(t("لا يمكن إضافة أكثر من الكمية المتوفرة"));
    };
    const copyLink = async () => {
        const url = `${window.location.origin}/product/${product.id}`;
        try {
            try {
                await navigator.clipboard.writeText(url);
            }
            catch {
                const ta = document.createElement("textarea");
                ta.value = url;
                ta.setAttribute("readonly", "");
                document.body.appendChild(ta);
                try {
                    ta.select();
                    if (!document.execCommand("copy"))
                        throw new Error("Copy failed");
                }
                finally {
                    ta.remove();
                }
            }
            toast.success(t("تم نسخ رابط المنتج بنجاح"));
        }
        catch {
            toast.error(t("تعذر نسخ الرابط، حاول مرة ثانية"));
        }
    };
    const related = listableProducts(products)
        .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id && !(product.variantGroup && p.variantGroup === product.variantGroup))
        .slice(0, 4);
    return (<Layout>
      <Container className="py-8 pb-40 md:pb-8">
        <div className="pl-14 md:pl-0">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative rounded-3xl overflow-hidden bg-surface aspect-square card-neon">
            <img src={product.image} alt={t(product.name ?? "")} className="w-full h-full object-cover"/>
            <Button variant="outline" size="icon" type="button" onClick={copyLink} aria-label={t("نسخ رابط المنتج")} title={t("نسخ رابط المنتج")} className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:border-primary hover:text-primary transition">
              <Link2 className="w-5 h-5"/>
            </Button>
            <div className="absolute top-3 right-3">
              {product.inStock ? (<span className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-black shadow-lg">{t(" \u2713 \u0645\u062A\u0648\u0641\u0631 ")}</span>) : (<span className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-black shadow-lg">{t(" \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 ")}</span>)}
            </div>
            {!product.inStock && (<div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="px-4 py-2 rounded-lg bg-destructive font-bold">{t("\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631")}</span>
              </div>)}
          </div>
          <div>
            <Link to="/category/$slug" params={{ slug: product.categorySlug }} className="text-xs text-primary font-bold">{t(" \u2190 \u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0642\u0633\u0645 ")}</Link>
            <h1 className="text-2xl md:text-3xl font-black mt-3 mb-3">{baseProductName(product)}</h1>

            {variants.length > 1 && (<div className="mb-5">
                <div className="text-sm font-bold mb-2">{t("\u0627\u062E\u062A\u0631 \u0645\u062F\u0629 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {variants.map((v) => {
                useLanguage();
                const active = v.id === product.id;
                return (<button key={v.id} type="button" onClick={() => setVariantId(v.id)} aria-pressed={active} className={`rounded-xl px-3 py-3 text-right border transition ${active
                        ? "border-primary bg-primary/10 btn-glow"
                        : "border-border bg-surface-2 hover:border-primary/50"}`}>
                        <div className="text-sm font-bold">{t(v.variantLabel ?? "")}</div>
                        <div className={`text-xs font-black ${active ? "text-primary" : "text-muted-foreground"}`}>
                          {formatIQD(v.price)}
                        </div>
                      </button>);
            })}
                </div>
              </div>)}

            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-3xl md:text-4xl font-black text-primary text-glow break-words">{formatIQD(product.price)}</span>
              {product.oldPrice && (<span className="text-lg text-muted-foreground line-through">{formatIQD(product.oldPrice)}</span>)}
            </div>
            {product.inStock && typeof product.stock === "number" && (<div className={`text-sm font-bold mb-6 ${product.stock === 0 ? "text-destructive" : product.stock <= 5 ? "text-orange-500" : "text-emerald-500"}`}>
                {product.stock === 0 ? t("نفذت الكمية") : `الكمية المتوفرة: ${product.stock}`}
              </div>)}

            <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap">{t(product.description ?? "")}</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button disabled={!product.inStock} onClick={buyNow} className="h-auto min-h-12 px-2 py-3 rounded-lg font-bold whitespace-normal btn-glow">
                <Zap className="w-5 h-5"/>{t(" \u0634\u0631\u0627\u0621 \u0627\u0644\u0622\u0646 ")}</Button>
              <Button variant="outline" disabled={!product.inStock} onClick={addToCart} className="h-auto min-h-12 px-2 py-3 rounded-lg font-bold whitespace-normal">
                <ShoppingCart className="w-5 h-5"/>{t(" \u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629 ")}</Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card-neon rounded-xl p-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary"/>
                <div className="text-xs">
                  <div className="font-bold">{t("\u062A\u0633\u0644\u064A\u0645 \u0641\u0648\u0631\u064A")}</div>
                  <div className="text-muted-foreground">{t("\u062E\u0644\u0627\u0644 \u062F\u0642\u0627\u0626\u0642")}</div>
                </div>
              </div>
              <div className="card-neon rounded-xl p-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary"/>
                <div className="text-xs">
                  <div className="font-bold">{t("\u0636\u0645\u0627\u0646 \u0627\u0644\u062C\u0648\u062F\u0629")}</div>
                  <div className="text-muted-foreground">{t("\u062D\u0633\u0627\u0628\u0627\u062A \u0645\u0648\u062B\u0648\u0642\u0629")}</div>
                </div>
              </div>
            </div>

            <div className="card-neon rounded-xl p-4">
              <div className="text-sm font-bold mb-3">{t("\u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u062A\u0627\u062D\u0629")}</div>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((m) => (<span key={m.id} className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border inline-flex items-center gap-2">
                    {m.image_url && <img src={m.image_url} alt="" className="w-4 h-4 rounded object-cover"/>}
                    {t(m.name ?? "")}
                  </span>))}
              </div>
            </div>
          </div>
        </div>

        {/* Product reviews */}
        <div className="mt-14">
          <h2 className="text-2xl font-black mb-5 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500"/>{t(" \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0627\u0644\u0632\u0628\u0627\u0626\u0646 ")}</h2>
          {productReviews.length === 0 ? (<div className="text-sm text-muted-foreground p-6 card-neon rounded-2xl text-center">{t(" \u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C \u0628\u0639\u062F. ")}</div>) : (<>
              <div className="grid gap-3 md:grid-cols-2">
                {(showAllReviews ? productReviews : productReviews.slice(0, 3)).map((r) => (<div key={r.id} className="card-neon rounded-2xl p-4">
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: r.rating }).map((_, j) => (<Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500"/>))}
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground leading-relaxed mb-3">"{t(r.comment ?? "")}"</p>}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="font-bold">
                        {r.customer_name}
                        {r.product_name && (<span className="font-medium text-muted-foreground">{t(" \u2014 \u0642\u0627\u0645 \u0628\u0634\u0631\u0627\u0621: ")}<span className="text-primary">{t(r.product_name ?? "")}</span></span>)}
                      </div>
                      <div className="text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleDateString(locale())}</div>
                    </div>
                  </div>))}
              </div>
              <button onClick={() => setShowAllReviews(!showAllReviews)} className="w-full py-3 mt-4 bg-secondary text-foreground font-bold rounded-lg flex items-center justify-center gap-2 border border-border hover:opacity-90 transition">
                {showAllReviews ? t("طي التقييمات 🔼") : t("عرض باقي التقييمات 🔽")}
              </button>
            </>)}
        </div>

        {related.length > 0 && (<div className="mt-16">
            <h2 className="text-2xl font-black mb-5">{t("\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0634\u0627\u0628\u0647\u0629")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p.id} product={p}/>)}
            </div>
          </div>)}

        </div>
      </Container>

      {/* Mobile sticky purchase bar; left padding keeps clear of floating contact buttons */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur border-t border-border pr-3 pl-20 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {product.variantLabel && <div className="text-xs text-muted-foreground break-words">{t(product.variantLabel ?? "")}</div>}
          <div className="font-black text-primary text-base">{formatIQD(product.price)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={!product.inStock} onClick={addToCart} aria-label={t("إضافة إلى السلة")} className="h-11 px-2 text-xs font-bold gap-1">
          <ShoppingCart className="w-4 h-4"/>{t(" \u0627\u0644\u0633\u0644\u0629 ")}</Button>
        <Button disabled={!product.inStock} onClick={buyNow} className="h-11 px-2 text-xs font-bold gap-1">
          <Zap className="w-4 h-4"/>{t(" \u0634\u0631\u0627\u0621 \u0627\u0644\u0622\u0646 ")}</Button>
        </div>
      </div>
    </Layout>);
}
