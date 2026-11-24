import { t, useLanguage } from "@/lib/i18n";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { memo } from "react";
import { useCart } from "@/lib/cart";
import { baseProductName, formatIQD, type Product } from "@/lib/data";
import { toast } from "sonner";

function ProductCardBase({ product }: { product: Product }) {
    useLanguage();
    const add = useCart((s) => s.add);
    const clear = useCart((s) => s.clear);
    const navigate = useNavigate();
    const discount = product.oldPrice ? Math.round(100 - (product.price / product.oldPrice) * 100) : 0;
    const soldOut = !product.inStock || product.stock === 0;
    const lowStock = !soldOut && typeof product.stock === "number" && product.stock <= 5;
    const addToCart = () => {
        if (soldOut) return;
        if (add(product)) toast.success(t("تمت الإضافة إلى السلة"));
        else toast.error(t("لا يمكن إضافة أكثر من الكمية المتوفرة"));
    };
    const orderNow = () => {
        if (soldOut) return;
        clear();
        if (add(product)) navigate({ to: "/checkout" });
        else toast.error(t("لا يمكن إضافة أكثر من الكمية المتوفرة"));
    };
    return (<div className="card-neon rounded-2xl overflow-hidden flex flex-col">
      <Link to="/product/$id" params={{ id: product.id }} className="relative aspect-square overflow-hidden bg-surface-2 block">
        <img src={product.image} alt={t(product.name ?? "")} loading="lazy" decoding="async" className="w-full h-full object-cover"/>
        {discount > 0 && (<span className="absolute top-2 right-2 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-bold">-{discount}%</span>)}
        {soldOut && (<div className="absolute inset-0 bg-background/75 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-bold text-sm">{t("غير متوفر")}</span>
          </div>)}
      </Link>
      <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2">
        <Link to="/product/$id" params={{ id: product.id }} className="font-bold text-sm sm:text-[15px] leading-snug line-clamp-2 min-h-[2.6rem] hover:text-primary transition-colors">
          {t(baseProductName(product))}
        </Link>
        {!soldOut && (<div className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${lowStock ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {lowStock ? <>{t("متوفر: ")}{product.stock}</> : <><Check className="w-3 h-3"/>{t("تسليم فوري")}</>}
          </div>)}
        <div className="mt-auto pt-1">
          {product.variantGroup && <div className="text-[11px] text-muted-foreground">{t("يبدأ من")}</div>}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-black text-base sm:text-lg text-foreground">{formatIQD(product.price)}</span>
            {product.oldPrice && (<span className="text-xs text-muted-foreground line-through">{formatIQD(product.oldPrice)}</span>)}
          </div>
        </div>
        {product.variantGroup ? (<Link to="/product/$id" params={{ id: product.id }} className="w-full min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90">
            {t("عرض الخيارات")}</Link>) : (<div className="flex gap-2">
            <button onClick={orderNow} disabled={soldOut} className="flex-1 min-h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity hover:opacity-90">
              <Zap className="w-4 h-4"/>{t("اطلب الآن")}</button>
            <button onClick={addToCart} disabled={soldOut} aria-label={t("أضف للسلة")} className="w-11 min-h-11 shrink-0 rounded-xl bg-secondary border border-border flex items-center justify-center disabled:opacity-40 hover:border-primary/50 transition-colors">
              <ShoppingCart className="w-4 h-4"/></button>
          </div>)}
      </div>
    </div>);
}
export const ProductCard = memo(ProductCardBase);
