import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { Link, useNavigate } from "@tanstack/react-router";
import { Star, ShoppingCart, Zap } from "lucide-react";
import { memo } from "react";
import { useCart } from "@/lib/cart";
import { baseProductName, formatIQD, type Product } from "@/lib/data";
import { toast } from "sonner";
function ProductCardBase({ product }: {
    product: Product;
}) {
    useLanguage();
    const add = useCart((s) => s.add);
    const clear = useCart((s) => s.clear);
    const navigate = useNavigate();
    const discount = product.oldPrice
        ? Math.round(100 - (product.price / product.oldPrice) * 100)
        : 0;
    return (<div className="card-neon rounded-2xl overflow-hidden group flex flex-col">
      <Link to="/product/$id" params={{ id: product.id }} className="relative aspect-square overflow-hidden bg-surface-2 block">
        <img src={product.image} alt={t(product.name ?? "")} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/>
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {product.bestseller && (<span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">{t(" \u0627\u0644\u0623\u0643\u062B\u0631 \u0645\u0628\u064A\u0639\u0627\u064B ")}</span>)}
          {product.isNew && (<span className="px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-bold">{t(" \u062C\u062F\u064A\u062F ")}</span>)}
          {discount > 0 && (<span className="px-2 py-1 rounded-md bg-yellow-500 text-black text-[10px] font-bold">{t(" \u062E\u0635\u0645 ")}{discount}%
            </span>)}
        </div>
        {!product.inStock && (<div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm">{t(" \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 ")}</span>
          </div>)}
      </Link>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <Link to="/product/$id" params={{ id: product.id }} className="font-bold text-sm leading-tight line-clamp-2 hover:text-primary transition min-h-[2.5rem]">
          {baseProductName(product)}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500"/>
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviews})</span>
        </div>
        {product.variantLabel && (<div className="text-[11px] text-muted-foreground">{t(" \u064A\u0628\u062F\u0623 \u0645\u0646 ")}<span className="font-bold text-foreground">{t(product.variantLabel ?? "")}</span>{t(" \u2014 \u0639\u062F\u0629 \u0645\u062F\u062F \u0645\u062A\u0627\u062D\u0629 ")}</div>)}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="font-black text-primary text-glow">{formatIQD(product.price)}</span>
          {product.oldPrice && (<span className="text-xs text-muted-foreground line-through">
              {formatIQD(product.oldPrice)}
            </span>)}
        </div>
        {product.inStock && typeof product.stock === "number" && (<div className={`text-[11px] font-bold ${product.stock === 0 ? "text-destructive" : product.stock <= 5 ? "text-orange-500" : "text-emerald-500"}`}>
            {product.stock === 0 ? t("نفذت الكمية") : `متوفر: ${product.stock}`}
          </div>)}
        {product.variantGroup ? (<Link to="/product/$id" params={{ id: product.id }} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:btn-glow transition">
            <Zap className="w-4 h-4"/>{t(" \u0627\u062E\u062A\u0631 \u0627\u0644\u0645\u062F\u0629 ")}</Link>) : (<div className="grid grid-cols-2 gap-2">
          <button onClick={() => {
                if (!product.inStock)
                    return;
                if (add(product))
                    toast.success(t(t("تمت الإضافة إلى السلة")));
                else
                    toast.error(t(t("لا يمكن إضافة أكثر من الكمية المتوفرة")));
            }} disabled={!product.inStock} className="w-full py-2 rounded-lg bg-surface-2 border border-border text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary/50 transition">
            <ShoppingCart className="w-4 h-4"/>{t(" \u0623\u0636\u0641 \u0644\u0644\u0633\u0644\u0629 ")}</button>
          <button onClick={() => {
                if (!product.inStock)
                    return;
                clear();
                if (add(product))
                    navigate({ to: "/checkout" });
                else
                    toast.error(t(t("لا يمكن إضافة أكثر من الكمية المتوفرة")));
            }} disabled={!product.inStock} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:btn-glow transition">
            <Zap className="w-4 h-4"/>{t(" \u0634\u0631\u0627\u0621 \u0627\u0644\u0622\u0646 ")}</button>
        </div>)}

      </div>
    </div>);
}
// Memoized: skips re-render when the product prop is unchanged (big grids)
export const ProductCard = memo(ProductCardBase);
