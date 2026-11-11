import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
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
    useLanguage();
    const items = useCart((s) => s.items);
    const setQty = useCart((s) => s.setQty);
    const remove = useCart((s) => s.remove);
    const subtotal = items.reduce((a, i) => a + i.qty * i.product.price, 0);
    if (items.length === 0)
        return (<Layout>
        <Container className="py-20 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4"/>
          <h1 className="text-2xl font-black mb-2">{t("\u0633\u0644\u062A\u0643 \u0641\u0627\u0631\u063A\u0629")}</h1>
          <p className="text-muted-foreground mb-6">{t("\u0623\u0636\u0641 \u0628\u0639\u0636 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0644\u062A\u0628\u062F\u0623 \u0627\u0644\u062A\u0633\u0648\u0642")}</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">{t(" \u062A\u0635\u0641\u062D \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A ")}</Link>
        </Container>
      </Layout>);
    return (<Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">{t("\u0633\u0644\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A")}</h1>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            
          </div>

          <aside className="card-neon rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h2 className="font-black text-lg mb-4">{t("\u0645\u0644\u062E\u0635 \u0627\u0644\u0637\u0644\u0628")}</h2>
            <div className="space-y-2 text-sm mb-4 pb-4 border-b border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("\u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062C\u0632\u0626\u064A")}</span>
                <span className="font-bold"></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("\u0639\u062F\u062F \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")}</span>
                <span className="font-bold"></span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-black mb-5">
              <span>{t("\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A")}</span>
              <span className="text-primary text-glow"></span>
            </div>
            <Link to="/checkout" className="block w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-center btn-glow">{t(" \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0641\u0639 ")}</Link>
            <div className="text-[11px] text-muted-foreground text-center mt-3">{t(" * \u0642\u062F \u062A\u064F\u0636\u0627\u0641 \u0636\u0631\u064A\u0628\u0629 \u0639\u0646\u062F \u0627\u062E\u062A\u064A\u0627\u0631 \u0622\u0633\u064A\u0627 \u0633\u064A\u0644 ")}</div>
          </aside>
        </div>
      </Container>
    </Layout>);
}
