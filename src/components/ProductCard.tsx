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
      <Link to="/product/$id" params= className="relative aspect-square overflow-hidden bg-surface-2 block">
        <img src= alt= loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"/>
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          
          
          
        </div>
        
      </Link>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <Link to="/product/$id" params= className="font-bold text-sm leading-tight line-clamp-2 hover:text-primary transition min-h-[2.5rem]">
          
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500"/>
          <span className="font-medium text-foreground"></span>
          <span>()</span>
        </div>
        
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="font-black text-primary text-glow"></span>
          
        </div>
        
        

      </div>
    </div>);
}
// Memoized: skips re-render when the product prop is unchanged (big grids)
export const ProductCard = memo(ProductCardBase);
