import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "السلة — FPI STOR" },
      { name: "description", content: "راجع منتجاتك واستكمل عملية الشراء." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = items.reduce((a, i) => a + i.qty * i.product.price, 0);

  if (items.length === 0)
    return (
      <Layout>
        <Container className="py-20 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-black mb-2">سلتك فارغة</h1>
          <p className="text-muted-foreground mb-6">أضف بعض المنتجات لتبدأ التسوق</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">
            تصفح المنتجات
          </Link>
        </Container>
      </Layout>
    );

  return (
    <Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">سلة المشتريات</h1>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map((i) => (
              <div key={i.product.id} className="card-neon rounded-2xl p-4 flex gap-3">
                <img src={i.product.image} alt={i.product.name} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <Link to="/product/$id" params={{ id: i.product.id }} className="font-bold text-sm line-clamp-1 hover:text-primary">
                    {i.product.name}
                  </Link>
                  <div className="text-primary font-black mt-1">{formatIQD(i.product.price)}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
                      <button onClick={() => setQty(i.product.id, i.qty - 1)} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{i.qty}</span>
                      <button
                        onClick={() => {
                          const max = typeof i.product.stock === "number" ? i.product.stock : Infinity;
                          if (i.qty + 1 > max) { toast.error("لا يمكن إضافة أكثر من الكمية المتوفرة"); return; }
                          setQty(i.product.id, i.qty + 1);
                        }}
                        className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => remove(i.product.id)} className="text-destructive hover:opacity-80 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="card-neon rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h2 className="font-black text-lg mb-4">ملخص الطلب</h2>
            <div className="space-y-2 text-sm mb-4 pb-4 border-b border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الجزئي</span>
                <span className="font-bold">{formatIQD(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد المنتجات</span>
                <span className="font-bold">{items.reduce((a, i) => a + i.qty, 0)}</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-black mb-5">
              <span>الإجمالي</span>
              <span className="text-primary text-glow">{formatIQD(subtotal)}</span>
            </div>
            <Link to="/checkout" className="block w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-center btn-glow">
              متابعة الدفع
            </Link>
            <div className="text-[11px] text-muted-foreground text-center mt-3">
              * قد تُضاف ضريبة عند اختيار آسيا سيل
            </div>
          </aside>
        </div>
      </Container>
    </Layout>
  );
}
