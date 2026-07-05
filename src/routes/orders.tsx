import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useMyOrderIds, STATUS_AR, STATUS_STYLES } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { PackageOpen, KeyRound, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "طلباتي — FPI STOR" }] }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total: number;
  status: string;
  subscription_info: string | null;
  subscription_image_url: string | null;
  created_at: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
};

function OrdersPage() {
  const ids = useMyOrderIds((s) => s.ids);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (ids.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_orders_by_ids" as any, { _ids: ids });
    if (error) toast.error("فشل جلب الطلبات");
    setOrders(((data as any[]) || []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 15000); // refresh
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (loading)
    return (
      <Layout>
        <Container className="py-20 text-center text-muted-foreground">جاري التحميل…</Container>
      </Layout>
    );

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
                  <div className="font-black text-lg" dir="ltr">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("ar-IQ")}
                  </div>
                </div>
                <span
                  className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${
                    STATUS_STYLES[o.status] || ""
                  }`}
                >
                  {STATUS_AR[o.status] || o.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {o.items.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 line-clamp-1">{i.product_name}</div>
                    <div className="text-muted-foreground">× {i.quantity}</div>
                    <div className="font-bold shrink-0">{formatIQD(i.unit_price * i.quantity)}</div>
                  </div>
                ))}
              </div>

              {/* Subscription info shown when admin completed the order */}
              {o.status === "completed" && (o.subscription_info || o.subscription_image_url) && (
                <div className="mb-4 p-4 rounded-xl border border-green-500/40 bg-green-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                    <KeyRound className="w-4 h-4" />
                    معلومات الاشتراك
                  </div>
                  {o.subscription_info && (
                    <>
                      <pre
                        dir="ltr"
                        className="text-xs whitespace-pre-wrap break-words bg-surface-2 rounded-lg p-3 font-mono"
                      >
                        {o.subscription_info}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(o.subscription_info || "");
                          toast.success("تم النسخ");
                        }}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 font-bold"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </>
                  )}
                  {o.subscription_image_url && (
                    <a href={o.subscription_image_url} target="_blank" rel="noreferrer" className="block">
                      <img src={o.subscription_image_url} alt="صورة الاشتراك"
                        className="max-h-80 rounded-lg border border-border object-contain bg-surface-2" />
                      <div className="text-[11px] text-muted-foreground mt-1">اضغط لفتح الصورة</div>
                    </a>
                  )}
                </div>
              )}

              {o.status === "pending" && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300">
                  ⏳ طلبك قيد المراجعة. سيتم إرسال معلومات الاشتراك هنا فور إكمال الطلب من الإدارة.
                </div>
              )}

              <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="text-muted-foreground">
                  الاسم: <span className="text-foreground font-bold">{o.customer_name}</span>
                </div>
                <div className="font-black text-lg text-primary">{formatIQD(o.total)}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Layout>
  );
}
