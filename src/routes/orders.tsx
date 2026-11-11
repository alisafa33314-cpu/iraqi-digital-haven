import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useMyOrderIds, useReviewedOrders, STATUS_AR, STATUS_STYLES } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { PackageOpen, KeyRound, Copy, Star, X, ListChecks, Check, XCircle } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { cloud as supabase } from "@/lib/cloud-client";
import { useSession } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog";
import { toast } from "sonner";
export const Route = createFileRoute("/orders")({
    head: () => ({ meta: [{ title: "طلباتي — FPI STOR" },{name:"description", content:"Manage your FPI STOR orders and account."},{property:"og:title", content:"طلباتي — FPI STOR"},{property:"og:description", content:"Manage your FPI STOR orders and account."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}] }),
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
    rejection_reason: string | null;
    created_at: string;
    items: {
        product_name: string;
        quantity: number;
        unit_price: number;
    }[];
};
function OrdersPage() {
    useLanguage();
    const ids = useMyOrderIds((s) => s.ids);
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewOrder, setReviewOrder] = useState<OrderRow | null>(null);
    const inAppEnabled = useCatalog((s) => s.settings["notify_customer_inapp"] !== "false");
    const prevStatuses = useRef<Record<string, string>>({});
    const fetchOrders = async () => {
        // اجمع طلبات هذا الحساب (إن كان مسجّلاً) مع الطلبات المحفوظة محلياً
        let allIds = [...ids];
        try {
            const { data: sess } = await supabase.auth.getSession();
            const uid = sess.session?.user?.id;
            if (uid) {
                // ربط طلبات الضيف المحفوظة محلياً بحساب الزبون (مرة واحدة)
                if (ids.length > 0) {
                    await supabase.rpc("claim_my_orders" as any, { _ids: ids });
                }
                const { data: owned } = await (supabase.from as any)("orders").select("id").eq("user_id", uid);
                const ownedIds = ((owned as any[]) || []).map((r) => r.id as string);
                allIds = Array.from(new Set([...ownedIds, ...ids]));
            }
        }
        catch {
            /* تجاهل ومتابعة بالطلبات المحلية */
        }
        if (allIds.length === 0) {
            setOrders([]);
            setLoading(false);
            return;
        }
        await supabase.rpc("auto_advance_pending_orders" as any).then(() => { }, () => { });
        const { data, error } = await supabase.rpc("get_orders_by_ids" as any, { _ids: allIds });
        if (error)
            toast.error(t("فشل جلب الطلبات"));
        const rows = ((data as any[]) || []) as OrderRow[];
        // إشعارات داخل الموقع عند تغيّر حالة الطلب (تُفعَّل من لوحة التحكم)
        if (inAppEnabled) {
            for (const o of rows) {
                const prev = prevStatuses.current[o.id];
                if (prev && prev !== o.status) {
                    toast.info(t(o.status === "completed"
                        ? `تم تسليم طلبك #${o.id.slice(0, 8).toUpperCase()} — تفقّد تفاصيل الاشتراك`
                        : `تم تحديث حالة طلبك #${o.id.slice(0, 8).toUpperCase()}: ${STATUS_AR[o.status] || o.status}`));
                }
            }
        }
        prevStatuses.current = Object.fromEntries(rows.map((o) => [o.id, o.status]));
        setOrders(rows);
        setLoading(false);
    };
    useEffect(() => {
        fetchOrders();
        const t = setInterval(fetchOrders, 15000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ids.join(",")]);
    if (loading)
        return <Layout><Container className="py-20 text-center text-muted-foreground">{t("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026")}</Container></Layout>;
    if (orders.length === 0)
        return (<Layout>
        <Container className="py-20 text-center">
          <PackageOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4"/>
          <h1 className="text-2xl font-black mb-2">{t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u0628\u0639\u062F")}</h1>
          <p className="text-muted-foreground mb-6">{t("\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0633\u0648\u0642 \u0648\u0627\u0633\u062A\u0645\u062A\u0639 \u0628\u0623\u0641\u0636\u0644 \u0627\u0644\u0639\u0631\u0648\u0636")}</p>
          <Link to="/" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">{t("\u062A\u0635\u0641\u062D \u0627\u0644\u0645\u062A\u062C\u0631")}</Link>
        </Container>
      </Layout>);
    return (<Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">{t("\u0637\u0644\u0628\u0627\u062A\u064A")}</h1>
        <div className="space-y-4">
          {orders.map((o) => (<OrderCard key={o.id} o={o} onReview={() => setReviewOrder(o)}/>))}
        </div>
      </Container>
      {reviewOrder && (<ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)}/>)}
    </Layout>);
}
const ORDER_STEPS = [
    { key: "pending", label: "قيد التنفيذ" },
    { key: "processing", label: "جاري التجهيز" },
    { key: "completed", label: "مكتمل" },
];
/** أفقي: الخطوات المنجزة بالأحمر مع علامة صح، والحالية تنبض خفيف. */
function OrderStepper({ status }: {
    status: string;
}) {
    useLanguage();
    const finished = status === "completed";
    const found = ORDER_STEPS.findIndex((s) => s.key === status);
    const idx = found === -1 ? 0 : found;
    return (<ol className="flex items-start w-full mb-4" aria-label={t("مراحل الطلب")}>
      {ORDER_STEPS.map((s, i) => {
            useLanguage();
            const done = finished || i < idx;
            const active = !finished && i === idx;
            const last = i === ORDER_STEPS.length - 1;
            return (<li key={s.key} className={cn("flex items-start", last ? "" : "flex-1")}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span aria-current={active ? "step" : undefined} className={cn("w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black transition-colors", done && "bg-primary text-primary-foreground border-primary", active && "bg-primary/15 text-primary border-primary animate-step-pulse", !done && !active && "bg-surface-2 text-muted-foreground border-border")}>
                {done ? <Check className="w-4 h-4" strokeWidth={3}/> : i + 1}
              </span>
              <span className={cn("text-[10px] sm:text-xs font-bold whitespace-nowrap", done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground")}>
                {t(s.label ?? "")}
              </span>
            </div>
            {!last && (<div className={cn("flex-1 h-0.5 mt-[15px] mx-1 rounded-full transition-colors", done ? "bg-primary" : "bg-border")}/>)}
          </li>);
        })}
    </ol>);
}
/** شارة حمراء واضحة + سبب الرفض بدل الخطوات. */
function RejectedBanner({ reason }: {
    reason: string | null;
}) {
    useLanguage();
    const text = (reason || "").trim();
    return (<div className="mb-4 rounded-xl border-2 border-destructive/60 bg-destructive/10 p-3 flex items-start gap-3">
      <XCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5"/>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-destructive text-destructive-foreground px-3 py-1 text-xs font-black">
          <X className="w-3 h-3" strokeWidth={3}/>{t(" \u0637\u0644\u0628 \u0645\u0631\u0641\u0648\u0636 ")}</span>
        <div className="text-sm font-bold text-destructive mt-2 break-words">{t(" \u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636: ")}{text || t("لم يُذكر سبب للرفض")}
        </div>
      </div>
    </div>);
}
const OrderCard = memo(function OrderCard({ o, onReview }: {
    o: OrderRow;
    onReview: () => void;
}) {
    useLanguage();
    const reviewedIds = useReviewedOrders((s) => s.ids);
    const catalogProducts = useCatalog((s) => s.products);
    const alreadyReviewed = reviewedIds.includes(o.id);
    const images = (o.subscription_image_urls && o.subscription_image_urls.length > 0)
        ? o.subscription_image_urls
        : (o.subscription_image_url ? [o.subscription_image_url] : []);
    const activations = o.items
        .map((i) => {
        const p = catalogProducts.find((cp) => cp.name === i.product_name);
        if (!p)
            return null;
        const steps = (p.activationInstructions || "").trim();
        const imgs = p.activationImages || [];
        if (!steps && imgs.length === 0)
            return null;
        return { name: i.product_name, steps, imgs };
    })
        .filter(Boolean) as {
        name: string;
        steps: string;
        imgs: string[];
    }[];
    return (<div className="card-neon rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <button type="button" dir="ltr" aria-label={t("نسخ رقم الطلب")} onClick={async () => {
            const number = o.id.slice(0, 8).toUpperCase();
            try {
                await navigator.clipboard.writeText(number);
                toast.success(t("تم نسخ رقم الطلب"));
            }
            catch {
                toast.error(t("تعذّر النسخ"));
            }
        }} className="font-black text-lg inline-flex items-center gap-1.5 hover:text-primary transition-colors">
            #{o.id.slice(0, 8).toUpperCase()}
            <Copy className="w-4 h-4 text-muted-foreground"/>
          </button>
          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString(locale())}</div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${STATUS_STYLES[o.status] || ""}`}>
          {t((STATUS_AR[o.status] || o.status) ?? "")}
        </span>
      </div>

      {o.status === "cancelled"
            ? <RejectedBanner reason={o.rejection_reason}/>
            : <OrderStepper status={o.status}/>}

      <div className="space-y-2 mb-4">
        {o.items.map((i, idx) => (<div key={idx} className="flex items-center gap-3 text-sm">
            <div className="flex-1 line-clamp-1">{t(i.product_name ?? "")}</div>
            <div className="text-muted-foreground">× {i.quantity}</div>
            <div className="font-bold shrink-0">{formatIQD(i.unit_price * i.quantity)}</div>
          </div>))}
      </div>

      {o.status === "completed" && (o.subscription_info || images.length > 0) && (<div className="mb-4 p-4 rounded-xl border border-green-500/40 bg-green-500/5 space-y-3">
          <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
            <KeyRound className="w-4 h-4"/>{t(" \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 ")}</div>
          {o.subscription_info && (<>
              <pre dir="ltr" className="text-xs whitespace-pre-wrap break-words bg-surface-2 rounded-lg p-3 font-mono">
                {o.subscription_info}
              </pre>
              <button onClick={() => { navigator.clipboard.writeText(o.subscription_info || ""); toast.success(t("تم النسخ")); }} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 font-bold">
                <Copy className="w-3 h-3"/>{t(" \u0646\u0633\u062E ")}</button>
            </>)}
          {images.length > 0 && (<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((u, i) => (<a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                  <img loading="lazy" decoding="async" src={u} alt={t(`مرفق ${i + 1}`)} className="w-full h-32 rounded-lg border border-border object-cover bg-surface-2"/>
                </a>))}
            </div>)}
          {!alreadyReviewed && (<div className="mt-3 p-3 rounded-xl border border-yellow-500/40 bg-yellow-500/5">
              <div className="text-sm font-bold text-yellow-300 mb-2">{t("\u2B50 \u0627\u0644\u0631\u062C\u0627\u0621 \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u062E\u062F\u0645\u0629")}</div>
              <button onClick={onReview} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-black font-bold text-sm">
                <Star className="w-4 h-4 fill-current"/>{t(" \u0642\u064A\u0651\u0645 \u0627\u0644\u0622\u0646 ")}</button>
            </div>)}
          {alreadyReviewed && (<div className="text-xs text-green-400">{t("\u2713 \u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0642\u064A\u064A\u0645\u0643")}</div>)}
        </div>)}

      {o.status === "completed" && activations.length > 0 && (<div className="mb-4 p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <ListChecks className="w-4 h-4"/>{t(" \u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062A\u0641\u0639\u064A\u0644 \u0648\u0627\u0644\u0635\u0648\u0631 ")}</div>
          {activations.map((a, idx) => (<div key={idx} className="space-y-2">
              <div className="font-bold text-sm">{t(a.name ?? "")}</div>
              {a.steps && (<div className="text-xs leading-6 whitespace-pre-wrap bg-surface-2 rounded-lg p-3">{t(a.steps ?? "")}</div>)}
              {a.imgs.length > 0 && (<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {a.imgs.map((u, i) => (<a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                      <img loading="lazy" decoding="async" src={u} alt={t(`خطوة ${i + 1}`)} className="w-full h-32 rounded-lg border border-border object-cover bg-surface-2"/>
                    </a>))}
                </div>)}
            </div>))}
        </div>)}


      {o.status === "pending" && (<div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300">{t(" \u23F3 \u0637\u0644\u0628\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629. \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0647\u0646\u0627 \u0641\u0648\u0631 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0637\u0644\u0628. ")}</div>)}

      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-muted-foreground">{t("\u0627\u0644\u0627\u0633\u0645: ")}<span className="text-foreground font-bold">{o.customer_name}</span></div>
        <div className="font-black text-lg text-primary">{formatIQD(o.total)}</div>
      </div>
    </div>);
});
function ReviewModal({ order, onClose }: {
    order: OrderRow;
    onClose: () => void;
}) {
    useLanguage();
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
        if (!comment.trim())
            return toast.error(t("اكتب تعليقاً"));
        setBusy(true);
        const { error } = await supabase.from("reviews" as any).insert({
            order_id: order.id,
            product_id: productId || null,
            customer_name: order.customer_name,
            rating,
            comment: comment.trim(),
        } as any);
        setBusy(false);
        if (error) {
            const msg = /duplicate|unique/i.test(error.message)
                ? "تم تقييم هذا الطلب مسبقاً"
                : /row-level|not_allowed/i.test(error.message)
                    ? "التقييم متاح فقط للطلبات المكتملة"
                    : error.message;
            return toast.error(t("فشل إرسال التقييم: " + msg));
        }
        markReviewed(order.id);
        toast.success(t("شكراً لتقييمك!"));
        refreshCatalog();
        onClose();
    };
    const orderProducts = order.items
        .map((i) => products.find((p) => p.name === i.product_name))
        .filter(Boolean) as {
        id: string;
        name: string;
    }[];
    return (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">{t("\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u062E\u062F\u0645\u0629")}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2"><X className="w-4 h-4 mx-auto"/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">{t("\u0627\u0644\u062A\u0642\u064A\u064A\u0645")}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (<button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`w-8 h-8 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}/>
                </button>))}
            </div>
          </div>
          {orderProducts.length > 0 && (<div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("\u0627\u0644\u0645\u0646\u062A\u062C (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)")}</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">{t("\u2014 \u062A\u0642\u064A\u064A\u0645 \u0639\u0627\u0645 \u0644\u0644\u0645\u062A\u062C\u0631 \u2014")}</option>
                {orderProducts.map((p) => <option key={p.id} value={p.id}>{t(p.name ?? "")}</option>)}
              </select>
            </div>)}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("\u062A\u0639\u0644\u064A\u0642\u0643")}</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder={t("شاركنا رأيك في الخدمة…")} className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"/>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={busy} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? t("جاري الإرسال…") : t("إرسال التقييم")}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">{t("\u0625\u0644\u063A\u0627\u0621")}</button>
        </div>
      </div>
    </div>);
}
