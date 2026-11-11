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
            <img src= alt= className="w-full h-full object-cover"/>
            <Button variant="outline" size="icon" type="button" onClick= aria-label={t("نسخ رابط المنتج")} title={t("نسخ رابط المنتج")} className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:border-primary hover:text-primary transition">
              <Link2 className="w-5 h-5"/>
            </Button>
            <div className="absolute top-3 right-3">
              
            </div>
            
          </div>
          <div>
            <Link to="/category/$slug" params= className="text-xs text-primary font-bold">{t(" \u2190 \u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0642\u0633\u0645 ")}</Link>
            <h1 className="text-2xl md:text-3xl font-black mt-3 mb-3"></h1>

            

            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-3xl md:text-4xl font-black text-primary text-glow break-words"></span>
              
            </div>
            

            <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-wrap"></p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button disabled= onClick= className="h-auto min-h-12 px-2 py-3 rounded-lg font-bold whitespace-normal btn-glow">
                <Zap className="w-5 h-5"/>{t(" \u0634\u0631\u0627\u0621 \u0627\u0644\u0622\u0646 ")}</Button>
              <Button variant="outline" disabled= onClick= className="h-auto min-h-12 px-2 py-3 rounded-lg font-bold whitespace-normal">
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
                
              </div>
            </div>
          </div>
        </div>

        {/* Product reviews */}
        <div className="mt-14">
          <h2 className="text-2xl font-black mb-5 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500"/>{t(" \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0627\u0644\u0632\u0628\u0627\u0626\u0646 ")}</h2>
          
        </div>

        

        </div>
      </Container>

      {/* Mobile sticky purchase bar; left padding keeps clear of floating contact buttons */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur border-t border-border pr-3 pl-20 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          
          <div className="font-black text-primary text-base"></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled= onClick= aria-label={t("إضافة إلى السلة")} className="h-11 px-2 text-xs font-bold gap-1">
          <ShoppingCart className="w-4 h-4"/>{t(" \u0627\u0644\u0633\u0644\u0629 ")}</Button>
        <Button disabled= onClick= className="h-11 px-2 text-xs font-bold gap-1">
          <Zap className="w-4 h-4"/>{t(" \u0634\u0631\u0627\u0621 \u0627\u0644\u0622\u0646 ")}</Button>
        </div>
      </div>
    </Layout>);
}
