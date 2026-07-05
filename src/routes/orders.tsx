import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useOrders } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { PackageOpen } from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "طلباتي — FPI STOR" }] }),
  component: OrdersPage,
});

const statusStyles: Record<string, string> = {
  "قيد التنفيذ": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "جاري التجهيز": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "مكتمل": "bg-green-500/15 text-green-400 border-green-500/30",
  "مرفوض": "bg-destructive/15 text-destructive border-destructive/30",
};

function OrdersPage() {
  const orders = useOrders((s) => s.orders);

  if (orders.length === 0)
    return (
      <Layout>
        <Container className="py-20 text-center">
          <PackageOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-black mb-2">لا توجد طلبات بعد</h1>
          <p className="text-muted-foreground mb-6">ابدأ التسوق واستمتع بأفضل العروض</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">
            تصفح المتجر
          </Link>
        </Container>
      </Layout>
    );

  return (
    <Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">طلباتي</h1>
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card-neon rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="font-black text-lg" dir="ltr">{o.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString("ar-IQ")}
                  </div>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${statusStyles[o.status]}`}>
                  {o.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                {o.items.map((i) => (
                  <div key={i.product.id} className="flex items-center gap-3 text-sm">
                    <img src={i.product.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 line-clamp-1">{i.product.name}</div>
                    <div className="text-muted-foreground">× {i.qty}</div>
                    <div className="font-bold shrink-0">{formatIQD(i.product.price * i.qty)}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="text-muted-foreground">طريقة الدفع: <span className="text-foreground font-bold">{o.method}</span></div>
                <div className="font-black text-lg text-primary">{formatIQD(o.total)}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Layout>
  );
}
