import { Link, useNavigate } from "@tanstack/react-router";
import { Star, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatIQD, type Product } from "@/lib/data";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const discount = product.oldPrice
    ? Math.round(100 - (product.price / product.oldPrice) * 100)
    : 0;


  return (
    <div className="card-neon rounded-2xl overflow-hidden group flex flex-col">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative aspect-square overflow-hidden bg-surface-2 block"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {product.bestseller && (
            <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
              الأكثر مبيعاً
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-bold">
              جديد
            </span>
          )}
          {discount > 0 && (
            <span className="px-2 py-1 rounded-md bg-yellow-500 text-black text-[10px] font-bold">
              خصم {discount}%
            </span>
          )}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm">
              غير متوفر
            </span>
          </div>
        )}
      </Link>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="font-bold text-sm leading-tight line-clamp-2 hover:text-primary transition min-h-[2.5rem]"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviews})</span>
        </div>
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="font-black text-primary text-glow">{formatIQD(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatIQD(product.oldPrice)}
            </span>
          )}
        </div>
        {product.inStock && typeof product.stock === "number" && (
          <div className={`text-[11px] font-bold ${product.stock === 0 ? "text-destructive" : product.stock <= 5 ? "text-orange-500" : "text-emerald-500"}`}>
            {product.stock === 0 ? "نفذت الكمية" : `متوفر: ${product.stock}`}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (!product.inStock) return;
              if (add(product)) toast.success("تمت الإضافة إلى السلة");
              else toast.error("لا يمكن إضافة أكثر من الكمية المتوفرة");
            }}
            disabled={!product.inStock}
            className="w-full py-2 rounded-lg bg-surface-2 border border-border text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary/50 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            أضف للسلة
          </button>
          <button
            onClick={() => {
              if (!product.inStock) return;
              clear();
              if (add(product)) navigate({ to: "/checkout" });
              else toast.error("لا يمكن إضافة أكثر من الكمية المتوفرة");
            }}
            disabled={!product.inStock}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:btn-glow transition"
          >
            <Zap className="w-4 h-4" />
            شراء الآن
          </button>
        </div>

      </div>
    </div>
  );
}
