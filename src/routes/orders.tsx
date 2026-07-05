import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useMyOrderIds, useReviewedOrders, STATUS_AR, STATUS_STYLES } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { PackageOpen, KeyRound, Copy, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCatalog } from "@/lib/catalog";
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
  subscription_image_urls: string[] | null;
  created_at: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
};

function OrdersPage() {
  const ids = useMyOrderIds((s) => s.ids);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOrder, setReviewOrder] = useState<OrderRow | null>(null);

  const fetchOrders = async () => {
    if (ids.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_orders_by_ids" as any, { _ids: ids });
    if (error) toast.error("فشل جلب الطلبات");
    setOrders(((data as any[]) || []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  if (loading)
    return <Layout><Container className="py-20 text-center text-muted-foreground">جاري التحميل…</Container></Layout>;

  if (orders.length === 0)
    return (
      <Layout>
        <Container className="py-20 text-center">
          <PackageOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-black mb-2">لا توجد طلبات بعد</h1>
          <p className="text-muted-foreground mb-6">ابدأ التسوق واستمتع بأفضل العروض</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">تصفح المتجر</Link>
        </Container>
      </Layout>
    );

  return (
    <Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">طلباتي</h1>
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} onReview={() => setReviewOrder(o)} />
          ))}
        </div>
      </Container>
      {reviewOrder && (
        <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />
      )}
    </Layout>
  );
}

function OrderCard({ o, onReview }: { o: OrderRow; onReview: () => void }) {
  const reviewedIds = useReviewedOrders((s) => s.ids);
  const alreadyReviewed = reviewedIds.includes(o.id);
  const images = (o.subscription_image_urls && o.subscription_image_urls.length > 0)
    ? o.subscription_image_urls
    : (o.subscription_image_url ? [o.subscription_image_url] : []);

  return (
    <div className="card-neon rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-black text-lg" dir="ltr">#{o.id.slice(0, 8).toUpperCase()}</div>
          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-IQ")}</div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${STATUS_STYLES[o.status] || ""}`}>
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

      {o.status === "completed" && (o.subscription_info || images.length > 0) && (
        <div className="mb-4 p-4 rounded-xl border border-green-500/40 bg-green-500/5 space-y-3">
          <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
            <KeyRound className="w-4 h-4" /> معلومات الاشتراك
          </div>
          {o.subscription_info && (
            <>
              <pre dir="ltr" className="text-xs whitespace-pre-wrap break-words bg-surface-2 rounded-lg p-3 font-mono">
                {o.subscription_info}
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(o.subscription_info || ""); toast.success("تم النسخ"); }}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 font-bold">
                <Copy className="w-3 h-3" /> نسخ
              </button>
            </>
          )}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                  <img src={u} alt={`مرفق ${i + 1}`} className="w-full h-32 rounded-lg border border-border object-cover bg-surface-2" />
                </a>
              ))}
            </div>
          )}
          {!alreadyReviewed && (
            <div className="mt-3 p-3 rounded-xl border border-yellow-500/40 bg-yellow-500/5">
              <div className="text-sm font-bold text-yellow-300 mb-2">⭐ الرجاء تقييم الخدمة</div>
              <button onClick={onReview}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-black font-bold text-sm">
                <Star className="w-4 h-4 fill-current" /> قيّم الآن
              </button>
            </div>
          )}
          {alreadyReviewed && (
            <div className="text-xs text-green-400">✓ شكراً لتقييمك</div>
          )}
        </div>
      )}

      {o.status === "pending" && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300">
          ⏳ طلبك قيد المراجعة. سيتم إرسال معلومات الاشتراك هنا فور إكمال الطلب.
        </div>
      )}

      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-muted-foreground">الاسم: <span className="text-foreground font-bold">{o.customer_name}</span></div>
        <div className="font-black text-lg text-primary">{formatIQD(o.total)}</div>
      </div>
    </div>
  );
}

function ReviewModal({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const products = useCatalog((s) => s.products);
  const refreshCatalog = useCatalog((s) => s.refresh);
  const markReviewed = useReviewedOrders((s) => s.markReviewed);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  // Default to first item's matching product
  const firstItemName = order.items[0]?.product_name || "";
  const matchedProduct = products.find((p) => p.name === firstItemName);
  const [productId, setProductId] = useState<string>(matchedProduct?.id || "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!comment.trim()) return toast.error("اكتب تعليقاً");
    setBusy(true);
    const { error } = await supabase.from("reviews" as any).insert({
      order_id: order.id,
      product_id: productId || null,
      customer_name: order.customer_name,
      rating,
      comment: comment.trim(),
    } as any);
    setBusy(false);
    if (error) return toast.error("فشل إرسال التقييم: " + error.message);
    markReviewed(order.id);
    toast.success("شكراً لتقييمك!");
    refreshCatalog();
    onClose();
  };

  const orderProducts = order.items
    .map((i) => products.find((p) => p.name === i.product_name))
    .filter(Boolean) as { id: string; name: string }[];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">تقييم الخدمة</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2"><X className="w-4 h-4 mx-auto" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">التقييم</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`w-8 h-8 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          {orderProducts.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المنتج (اختياري)</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">— تقييم عام للمتجر —</option>
                {orderProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">تعليقك</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
              placeholder="شاركنا رأيك في الخدمة…"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? "جاري الإرسال…" : "إرسال التقييم"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
