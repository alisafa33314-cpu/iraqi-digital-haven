import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD, type Product, type PaymentMethod, type Category } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Package, ShoppingBag, DollarSign, Users, LogOut, KeyRound, Plus, Edit, Trash2, CreditCard, Upload, Eye, X, Star, Image as ImageIcon, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { cloud as supabase } from "@/lib/cloud-client";
import { STATUS_AR, STATUS_STYLES } from "@/lib/cart";
import { uploadImage } from "@/lib/upload";
import type { SocialLink, StoreImage, ReviewRow } from "@/lib/catalog";
import { readTheme, applyTheme, THEME_KEYS, THEME_LABELS, THEME_DEFAULTS, themeSettingKey } from "@/lib/theme";
import { adminAnalytics } from "@/lib/track.functions";


export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — FPI STOR" }] }),
  component: AdminPage,
});

type AdminOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_ip: string | null;

  total: number;
  status: string;
  subscription_info: string | null;
  subscription_image_url: string | null;
  subscription_image_urls: string[] | null;
  payment_proof_url: string | null;
  payment_method_name: string | null;
  created_at: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
};


function ImagePicker({ value, onChange, folder }: {
  value: string; onChange: (url: string) => void; folder: string;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async (f: File) => {
    setBusy(true);
    try {
      const url = await uploadImage(f, folder);
      onChange(url);
      toast.success("تم رفع الصورة");
    } catch (e: any) { toast.error("فشل الرفع: " + (e?.message || "")); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className={inputCls} dir="ltr" placeholder="https://... أو ارفع صورة" />
      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border cursor-pointer text-xs hover:border-primary/50">
        <Upload className="w-3.5 h-3.5" />
        {busy ? "جاري الرفع…" : "رفع من الجهاز"}
        <input type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      </label>
      {value && <img src={value} alt="" className="w-24 h-24 rounded-lg object-cover border border-border" />}
    </div>
  );
}

function AdminPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = جاري التحقق
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const checkRole = async (uid: string | null) => {
    if (!uid) { setIsAdmin(false); setChecking(false); return false; }
    setChecking(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setChecking(false);
    if (error) {
      // خطأ في القراءة: لا نُسقط الصلاحية الحالية
      return false;
    }
    const ok = !!data;
    setIsAdmin(ok);
    return ok;
  };

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      await checkRole(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      await checkRole(uid);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setIsAdmin(false);
  };

  if (userId === undefined || (userId && checking && isAdmin === null)) {
    return (
      <Layout>
        <Container className="py-20 text-center text-muted-foreground">جاري التحقق…</Container>
      </Layout>
    );
  }

  if (!userId) return <AdminLogin />;
  if (!isAdmin) return <AdminClaim onDone={() => checkRole(userId)} onSignOut={signOut} />;

  return <AdminDashboard adminCode="" onLogout={signOut} />;
}


function AdminShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <Layout>
      <Container className="py-20 max-w-md">
        <div className="card-neon rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black mb-2 text-center">{title}</h1>
          <p className="text-sm text-muted-foreground mb-6 text-center">{hint}</p>
          {children}
        </div>
      </Container>
    </Layout>
  );
}

function AdminLogin() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) return toast.error("أدخل بريداً صالحاً وكلمة مرور 6 خانات فأكثر");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        if (!data.session) toast.success("تم إنشاء الحساب — افتح بريدك لتأكيد الحساب ثم سجّل الدخول");
        else toast.success("تم إنشاء الحساب");
      }
    } catch (err: any) {
      toast.error("فشل: " + (err?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title="لوحة الإدارة" hint="الدخول متاح لحسابات الإدارة فقط">
      <form onSubmit={submit} className="space-y-3">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="البريد الإلكتروني" dir="ltr" autoComplete="email"
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور" dir="ltr" autoComplete={mode === "in" ? "current-password" : "new-password"}
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none" />
        <button type="submit" disabled={busy}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          {busy ? "…" : mode === "in" ? "دخول" : "إنشاء حساب الإدارة"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="w-full text-xs text-muted-foreground hover:text-primary">
          {mode === "in" ? "ليس لديك حساب إدارة؟ إنشاء حساب" : "لدي حساب — تسجيل الدخول"}
        </button>
      </form>
    </AdminShell>
  );
}

function AdminClaim({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("claim_first_admin" as any, { _code: code });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      if (m.includes("admin_exists")) return toast.error("توجد حساب إدارة بالفعل — سجّل الدخول به");
      if (m.includes("bootstrap_closed")) return toast.error("تم إغلاق منح الصلاحية — استخدم حساب الإدارة الحالي");
      return toast.error("رمز غير صحيح");
    }
    toast.success("تم منح صلاحية الإدارة لحسابك");
    onDone();
  };

  return (
    <AdminShell title="لا تملك صلاحية الإدارة" hint="لأول مرة فقط: أدخل رمز الإدارة القديم لتحويل حسابك إلى أدمن">
      <div className="space-y-3">
        <input type="password" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="رمز الإدارة" dir="ltr"
          className="w-full text-center bg-surface-2 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none tracking-widest" />
        <button onClick={claim} disabled={busy}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          {busy ? "…" : "منح الصلاحية"}
        </button>
        <button onClick={onSignOut} className="w-full text-xs text-muted-foreground hover:text-primary">تسجيل الخروج</button>
      </div>
    </AdminShell>
  );
}

function AdminDashboard({ adminCode, onLogout }: { adminCode: string; onLogout: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const products = useCatalog((s) => s.products);
  const categories = useCatalog((s) => s.categories);
  const paymentMethods = useCatalog((s) => s.paymentMethods);
  const socials = useCatalog((s) => s.socials);
  const storeImages = useCatalog((s) => s.storeImages);
  const reviews = useCatalog((s) => s.reviews);
  const refreshCatalog = useCatalog((s) => s.refresh);


  const fetchOrders = async () => {
    const { data, error } = await supabase.rpc("admin_list_orders" as any, { _code: adminCode });
    if (error) {
      toast.error("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً");
      onLogout();
      return;
    }
    setOrders(((data as any[]) || []) as AdminOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revenue = orders.filter((o) => o.status === "completed").reduce((a, o) => a + Number(o.total), 0);

  const stats = [
    { label: "الإيرادات", value: formatIQD(revenue), icon: DollarSign, color: "text-green-400" },
    { label: "الطلبات", value: orders.length, icon: ShoppingBag, color: "text-blue-400" },
    { label: "المنتجات", value: products.length, icon: Package, color: "text-primary" },
    { label: "الأقسام", value: categories.length, icon: Users, color: "text-yellow-400" },
  ];

  return (
    <Layout>
      <Container className="py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black">لوحة الإدارة</h1>
              <div className="text-xs text-muted-foreground">إدارة المتجر والطلبات</div>
            </div>
          </div>
          <button onClick={onLogout}
            className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50">
            <LogOut className="w-3 h-3" /> خروج
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="card-neon rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="text-xl font-black">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Analytics */}
        <AnalyticsPanel adminCode={adminCode} />

        {/* Orders */}
        <OrdersPanel orders={orders} loading={loading} adminCode={adminCode} onChange={fetchOrders} />


        {/* Collapsible management sections */}
        <AdminSection title="🗂️ أقسام المتجر">
          <CategoriesManager adminCode={adminCode} categories={categories} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="📦 المنتجات">
          <ProductsManager adminCode={adminCode} products={products} categories={categories} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="💳 طرق الدفع / منصات الدفع">
          <PaymentMethodsManager adminCode={adminCode} methods={paymentMethods} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="🔗 روابط التواصل">
          <SocialsManager adminCode={adminCode} socials={socials} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="🖼️ صور المتجر">
          <StoreImagesManager adminCode={adminCode} images={storeImages} onChange={refreshCatalog} />
        </AdminSection>

        {/* Reviews management (has its own collapse) */}
        <ReviewsManager adminCode={adminCode} reviews={reviews} onChange={refreshCatalog} />

        <AdminSection title="🎨 ألوان وتصميم الموقع">
          <ThemeManager adminCode={adminCode} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="📢 الشريط المتحرك">
          <MarqueeManager adminCode={adminCode} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="🏷️ بانر العرض">
          <PromoManager adminCode={adminCode} categories={categories} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="🔔 إعدادات الإشعارات والتنبيهات">
          <NotificationsManager adminCode={adminCode} onChange={refreshCatalog} />
        </AdminSection>

        <AdminSection title="💬 إشعارات الواتساب للمشرف">
          <WhatsAppManager adminCode={adminCode} />
        </AdminSection>

        <AdminSection title="✈️ إشعارات التليجرام للمشرف">
          <TelegramManager adminCode={adminCode} />
        </AdminSection>


        <AdminSection title="🚫 قائمة المحظورين">
          <BlockedManager adminCode={adminCode} />
        </AdminSection>





      </Container>
    </Layout>
  );
}

function AdminSection({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full card-neon rounded-2xl px-5 py-4 flex items-center justify-between gap-3 text-right hover:border-primary/50 transition ${open ? "rounded-b-none" : ""}`}
      >
        <span className="font-black text-lg">{title}</span>
        <span className="text-primary text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 [&>div]:mt-0 [&>div]:rounded-t-none [&>div]:border-t-0 [&>div>h2]:hidden">
          {children}
        </div>
      )}
    </div>
  );
}

function OrdersPanel({ orders, loading, adminCode, onChange }: { orders: AdminOrder[]; loading: boolean; adminCode: string; onChange: () => void; }) {

  const [perPage, setPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const totalPages = Math.max(1, Math.ceil(orders.length / perPage));
  const current = Math.min(page, totalPages);
  const slice = orders.slice((current - 1) * perPage, current * perPage);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-black text-lg">الطلبات <span className="text-xs text-muted-foreground font-bold">({orders.length})</span></h2>
        <div className="flex items-center gap-2">
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs font-bold">
            <option value={5}>5 لكل صفحة</option>
            <option value={10}>10 لكل صفحة</option>
            <option value={20}>20 لكل صفحة</option>
          </select>
          <button onClick={() => setCollapsed((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-bold">
            {collapsed ? "إظهار الطلبات" : "طي الطلبات"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">جاري التحميل…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد طلبات بعد.</div>
      ) : collapsed ? (
        <div className="text-center py-4 text-xs text-muted-foreground">الطلبات مطوية — اضغط «إظهار الطلبات» لعرضها.</div>
      ) : (
        <>
          <div className="space-y-3">
            {slice.map((o) => (
              <OrderRow key={o.id} order={o} adminCode={adminCode} onChange={onChange} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => setPage(current - 1)} disabled={current === 1}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-bold disabled:opacity-40">
                السابق
              </button>
              {pages.map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`text-xs w-8 h-8 rounded-lg border font-bold ${p === current ? "bg-primary text-primary-foreground border-primary" : "bg-surface-2 border-border"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(current + 1)} disabled={current === totalPages}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-bold disabled:opacity-40">
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


function OrderRow({ order, adminCode, onChange }: { order: AdminOrder; adminCode: string; onChange: () => void; }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(order.subscription_info || "");
  const initialImgs = order.subscription_image_urls && order.subscription_image_urls.length > 0
    ? order.subscription_image_urls
    : (order.subscription_image_url ? [order.subscription_image_url] : []);
  const [imgs, setImgs] = useState<string[]>(initialImgs);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);


  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const arr = Array.from(files);
      const urls: string[] = [];
      for (const f of arr) urls.push(await uploadImage(f, "subscriptions"));
      setImgs((prev) => [...prev, ...urls]);
      toast.success(`تم رفع ${urls.length} صورة`);
    } catch (e: any) {
      toast.error("فشل الرفع: " + (e?.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const removeImg = (i: number) => setImgs((prev) => prev.filter((_, idx) => idx !== i));

  const complete = async () => {
    if (!info.trim() && imgs.length === 0) return toast.error("أدخل معلومات الاشتراك أو أرفق صورة");
    setBusy(true);
    const { error } = await supabase.rpc("admin_complete_order_v2" as any, {
      _code: adminCode, _order_id: order.id, _info: info.trim(), _image_urls: imgs,
    });
    setBusy(false);
    if (error) return toast.error("فشل إكمال الطلب: " + error.message);
    toast.success("تم إكمال الطلب");

    // إرسال تفاصيل الاشتراك للزبون بالبريد (لا يوقف نجاح العملية)
    if (order.customer_email) {
      fetch("/api/public/order-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCode, orderId: order.id }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success) toast.success("تم إرسال الإيميل للزبون");
        })
        .catch(() => {});
    }

    onChange();
  };


  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_status" as any, {
      _code: adminCode, _order_id: order.id, _status: "cancelled",
    });
    setBusy(false);
    if (error) return toast.error("فشل التحديث");
    toast.success("تم رفض الطلب");
    onChange();
  };

  const remove = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_delete_order" as any, {
      _code: adminCode, _order_id: order.id,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحذف: " + error.message);
    toast.success("تم حذف الطلب");
    onChange();
  };

  const quickBlock = async (type: "ip" | "phone") => {
    const value = type === "ip" ? order.customer_ip : order.customer_phone;
    if (!value) return;
    if (!confirm(`حظر ${type === "ip" ? "عنوان IP" : "رقم الهاتف"}: ${value} ؟`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_block_entity" as any, {
      _code: adminCode, _type: type, _value: value,
      _reason: `حظر سريع من الطلب ${order.id.slice(0, 8).toUpperCase()}`,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحظر: " + error.message);
    toast.success("تم الحظر بنجاح");
    onChange();
  };



  const done = order.status === "completed";

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-surface-2/50 text-right">
        <div>
          <div className="font-black" dir="ltr">#{order.id.slice(0, 8).toUpperCase()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("ar-IQ")} · {order.customer_name} · {order.customer_phone}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-black text-primary">{formatIQD(Number(order.total))}</div>
          <span className={`text-[10px] px-2 py-1 rounded-md border font-bold ${STATUS_STYLES[order.status] || ""}`}>
            {STATUS_AR[order.status] || order.status}
          </span>
        </div>
      </button>

      {open && (
        <div className="p-4 border-t border-border bg-surface-2/30 space-y-4">
          <div className="text-xs space-y-1">
            <div>الهاتف: <span dir="ltr" className="font-bold">{order.customer_phone}</span></div>
            {order.customer_email && (
              <div>الإيميل: <span dir="ltr" className="font-bold">{order.customer_email}</span></div>
            )}
            <div className="flex items-center gap-2">
              <span>عنوان IP:</span>
              <span dir="ltr" className="font-mono font-bold text-primary">{order.customer_ip || "—"}</span>
              {order.customer_ip && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(order.customer_ip!).then(() => toast.success("تم نسخ IP"), () => {})}
                  className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-[10px] font-bold">نسخ</button>
              )}
            </div>

            {order.payment_method_name && (
              <div>وسيلة الدفع: <span className="font-bold text-primary">{order.payment_method_name}</span></div>
            )}
            {order.payment_proof_url ? (
              <button type="button" onClick={() => setProofOpen(true)}
                className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-green-500/15 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/25">
                <Eye className="w-3.5 h-3.5" /> ✓ عرض إثبات التحويل
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-bold">
                ⚠ لم يصل إثبات التحويل
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">المنتجات:</div>
            {order.items.map((i, idx) => (
              <div key={idx} className="text-sm flex justify-between">
                <span>{i.product_name} × {i.quantity}</span>
                <span className="font-bold">{formatIQD(Number(i.unit_price) * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold mb-1 flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> معلومات الاشتراك (تُرسل للزبون)
            </label>
            <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={4}
              placeholder="مثال:&#10;Email: user@example.com&#10;Password: ******"
              disabled={done}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none disabled:opacity-70"
              dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 flex items-center gap-1">
              <Upload className="w-3 h-3" /> صور مرفقة مع الاشتراك (يمكن اختيار أكثر من صورة)
            </label>
            {imgs.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {imgs.map((u, i) => (
                  <div key={i} className="relative">
                    <img src={u} alt="" className="w-full h-24 rounded-lg object-cover border border-border" />
                    {!done && (
                      <button type="button" onClick={() => removeImg(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!done && (
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border cursor-pointer text-xs hover:border-primary/50">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "جاري الرفع…" : "إضافة صور من الجهاز"}
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => e.target.files && e.target.files.length > 0 && handleUpload(e.target.files)} />
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!done && (
              <button onClick={complete} disabled={busy || uploading}
                className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold text-sm disabled:opacity-60">
                ✓ إكمال الطلب وإرسال المعلومات
              </button>
            )}
            {order.status === "pending" && (
              <button onClick={cancel} disabled={busy}
                className="px-4 py-2 rounded-lg bg-destructive text-white font-bold text-sm disabled:opacity-60">
                رفض
              </button>
            )}
            {done && (
              <div className="text-xs text-green-400 font-bold">✓ تم إكمال الطلب</div>
            )}
            <button onClick={remove} disabled={busy}
              className="px-4 py-2 rounded-lg bg-destructive/20 border border-destructive text-destructive font-bold text-sm disabled:opacity-60 mr-auto">
              🗑 حذف الطلب
            </button>
          </div>

          {/* حظر الزبون — بنقرة واحدة */}
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-3 space-y-2">
            <button onClick={() => setBlockOpen(true)} disabled={busy}
              className="w-full py-3.5 rounded-xl bg-yellow-500 text-black font-black text-base disabled:opacity-60">
              🚫 حظر الزبون
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => quickBlock("ip")} disabled={busy || !order.customer_ip}
                className="py-2 rounded-lg bg-surface-2 border border-yellow-500/40 text-yellow-400 font-bold text-xs disabled:opacity-40">
                حظر IP بنقرة
              </button>
              <button onClick={() => quickBlock("phone")} disabled={busy || !order.customer_phone}
                className="py-2 rounded-lg bg-surface-2 border border-yellow-500/40 text-yellow-400 font-bold text-xs disabled:opacity-40">
                حظر رقم الهاتف بنقرة
              </button>
            </div>
          </div>

          {blockOpen && (
            <BlockCustomerModal order={order} adminCode={adminCode} onClose={() => setBlockOpen(false)} />
          )}
        </div>
      )}



      {proofOpen && order.payment_proof_url && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setProofOpen(false)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-2">
              <div className="text-white font-bold">إثبات التحويل</div>
              <button onClick={() => setProofOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 text-white">
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>
            <img src={order.payment_proof_url} alt="إثبات التحويل"
              className="w-full max-h-[80vh] object-contain rounded-xl bg-black" />
            <a href={order.payment_proof_url} target="_blank" rel="noreferrer"
              className="mt-2 inline-block text-xs text-primary underline">فتح في نافذة جديدة</a>
          </div>
        </div>
      )}
    </div>
  );
}


/* -------------------- Products Manager -------------------- */

type ProductForm = {
  id: string | null;
  name: string;
  description: string;
  price: string;
  old_price: string;
  stock: string;
  image_url: string;
  category_slug: string;
  is_active: boolean;
  activation_instructions: string;
  activation_images: string[];
  is_featured: boolean;
  display_order: string;
};

const emptyProduct: ProductForm = {
  id: null, name: "", description: "", price: "", old_price: "", stock: "0",
  image_url: "", category_slug: "", is_active: true,
  activation_instructions: "", activation_images: [],
  is_featured: false, display_order: "0",
};

function MultiImagePicker({ value, onChange, folder }: {
  value: string[]; onChange: (urls: string[]) => void; folder: string;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async (files: FileList) => {
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadImage(f, folder));
      onChange([...value, ...urls]);
      toast.success(`تم رفع ${urls.length} صورة`);
    } catch (e: any) { toast.error("فشل الرفع: " + (e?.message || "")); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border cursor-pointer text-xs hover:border-primary/50">
        <Upload className="w-3.5 h-3.5" />
        {busy ? "جاري الرفع…" : "رفع صور الشرح"}
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => e.target.files?.length && handle(e.target.files)} />
      </label>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((u, i) => (
            <div key={i} className="relative">
              <img src={u} alt="" className="w-full h-20 rounded-lg object-cover border border-border" />
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute top-1 left-1 w-6 h-6 rounded-md bg-destructive text-white text-xs font-bold">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function StockQuickEdit({ product, adminCode, onSaved }: {
  product: Product; adminCode: string; onSaved: () => void;
}) {
  const [val, setVal] = useState<string>(String(product.stock ?? 0));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(String(product.stock ?? 0)); }, [product.stock]);

  const save = async (next: number) => {
    if (next < 0) next = 0;
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_product_v2" as any, {
      _code: adminCode,
      _id: product.id,
      _name: product.name,
      _description: product.description || "",
      _price: product.price,
      _old_price: product.oldPrice ?? null,
      _stock: next,
      _image_url: product.image || null,
      _category_slug: product.categorySlug || null,
      _is_active: product.inStock,
    });
    setBusy(false);
    if (error) return toast.error("فشل تحديث الكمية");
    toast.success("تم تحديث الكمية");
    onSaved();
  };

  const current = Number(product.stock ?? 0);
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <span className="text-[11px] text-muted-foreground">الكمية:</span>
      <button disabled={busy} onClick={() => save(current - 1)}
        className="w-6 h-6 rounded-md bg-surface-2 border border-border text-sm font-bold disabled:opacity-50">−</button>
      <input
        type="number" inputMode="numeric" value={val} disabled={busy}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { const n = Number(val); if (!Number.isNaN(n) && n !== current) save(n); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-14 h-6 text-center rounded-md bg-surface-2 border border-border text-xs font-bold" dir="ltr" />
      <button disabled={busy} onClick={() => save(current + 1)}
        className="w-6 h-6 rounded-md bg-surface-2 border border-border text-sm font-bold disabled:opacity-50">+</button>
    </div>
  );
}

function AutoStockModal({ product, adminCode, onClose, onChanged }: {
  product: Product; adminCode: string; onClose: () => void; onChanged: () => void;
}) {
  const [rows, setRows] = useState<Array<{ id: string; account_details: string; is_used: boolean }>>([]);
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_stock" as any, {
      _code: adminCode, _product_id: product.id,
    });
    if (error) return toast.error("فشل تحميل المخزون");
    setRows((data as any[]) || []);
  };
  useEffect(() => { load(); }, [product.id]);

  const add = async () => {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("أدخل حساباً واحداً على الأقل");
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_add_stock" as any, {
      _code: adminCode, _product_id: product.id, _lines: lines,
    });
    setBusy(false);
    if (error) return toast.error("فشل الإضافة: " + error.message);
    toast.success(`تمت إضافة ${data} حساب`);
    setBulk("");
    await load();
    onChanged();
  };

  const del = async (id: string) => {
    const { error } = await supabase.rpc("admin_delete_stock" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    await load();
    onChanged();
  };

  const available = rows.filter((r) => !r.is_used).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-1">مخزون التسليم التلقائي</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {product.name} — المتوفر: <span className="text-primary font-bold">{available}</span> حساب
        </p>

        <Field label="أضف حسابات / أكواد (كل سطر = حساب واحد)">
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5}
            className={inputCls} dir="ltr" placeholder={"email:pass\ncode-1234\n..."} />
        </Field>
        <button onClick={add} disabled={busy}
          className="mt-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          {busy ? "جاري الإضافة…" : "إضافة إلى المخزون"}
        </button>

        <div className="mt-5 space-y-1.5">
          {rows.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">لا توجد حسابات في المخزون.</div>
          ) : rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs">
              <span className={`px-1.5 py-0.5 rounded font-bold ${r.is_used ? "bg-destructive/15 text-destructive" : "bg-green-500/15 text-green-400"}`}>
                {r.is_used ? "مُستخدم" : "متوفر"}
              </span>
              <span className="flex-1 min-w-0 break-all" dir="ltr">{r.account_details}</span>
              <button onClick={() => del(r.id)} className="p-1.5 rounded-md bg-surface-2 border border-border text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-lg bg-surface-2 border border-border font-bold">
          إغلاق
        </button>
      </div>
    </div>
  );
}

function ProductsManager({ adminCode, products, categories, onChange }: {
  adminCode: string; products: Product[]; categories: Category[]; onChange: () => void;
}) {
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadCounts = async () => {
    const { data } = await supabase.rpc("admin_stock_counts" as any, { _code: adminCode });
    const map: Record<string, number> = {};
    for (const r of (data as any[]) || []) map[r.product_id] = r.available;
    setCounts(map);
  };
  useEffect(() => { loadCounts(); }, [adminCode]);

  const startNew = () => setEditing({ ...emptyProduct, category_slug: categories[0]?.slug || "" });
  const startEdit = (p: Product) => setEditing({
    id: p.id, name: p.name, description: p.description, price: String(p.price),
    old_price: p.oldPrice != null ? String(p.oldPrice) : "",
    stock: p.stock != null ? String(p.stock) : "0",
    image_url: p.image, category_slug: p.categorySlug, is_active: p.inStock,
    activation_instructions: p.activationInstructions || "",
    activation_images: p.activationImages || [],
    is_featured: p.isFeatured === true,
    display_order: String(p.displayOrder ?? 0),
  });

  const remove = async (id: string, name: string) => {
    if (!confirm(`حذف "${name}"؟`)) return;
    const { error } = await supabase.rpc("admin_delete_product" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><Package className="w-5 h-5" /> المنتجات</h2>
        <button onClick={startNew}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4" /> إضافة منتج
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد منتجات — اضغط "إضافة منتج".</div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-3 rounded-xl border border-border">
              <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm line-clamp-1">{p.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {categories.find((c) => c.slug === p.categorySlug)?.name || "—"} · <span className="text-primary font-bold">{formatIQD(p.price)}</span>
                </div>
                <StockQuickEdit product={p} adminCode={adminCode} onSaved={onChange} />
                <button onClick={() => setStockFor(p)}
                  className={`mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border font-bold ${
                    (counts[p.id] || 0) > 0
                      ? "bg-green-500/10 border-green-500/40 text-green-400"
                      : "bg-surface-2 border-border text-muted-foreground"
                  }`}>
                  ⚡ تسليم تلقائي: {counts[p.id] || 0} حساب
                </button>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => startEdit(p)}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-primary/50">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(p.id, p.name)}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProductEditor form={editing} categories={categories} adminCode={adminCode}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />
      )}

      {stockFor && (
        <AutoStockModal product={stockFor} adminCode={adminCode}
          onClose={() => setStockFor(null)} onChanged={loadCounts} />
      )}
    </div>
  );
}


function ProductEditor({ form, categories, adminCode, onClose, onSaved }: {
  form: ProductForm; categories: Category[]; adminCode: string; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<ProductForm>(form);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim() || !f.price) return toast.error("أدخل الاسم والسعر");
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_product_v4" as any, {
      _code: adminCode,
      _id: f.id,
      _name: f.name.trim(),
      _description: f.description.trim(),
      _price: Number(f.price),
      _old_price: f.old_price ? Number(f.old_price) : null,
      _stock: Number(f.stock) || 0,
      _image_url: f.image_url.trim() || null,
      _category_slug: f.category_slug || null,
      _is_active: f.is_active,
      _activation_instructions: f.activation_instructions.trim() || null,
      _activation_images: f.activation_images,
      _is_featured: f.is_featured,
      _display_order: Number(f.display_order) || 0,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحفظ: " + error.message);
    toast.success(f.id ? "تم التعديل" : "تمت الإضافة");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-4">{f.id ? "تعديل منتج" : "إضافة منتج"}</h3>
        <div className="space-y-3">
          <Field label="الاسم">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="الوصف">
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
              rows={4} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر (د.ع)">
              <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={inputCls} dir="ltr" />
            </Field>
            <Field label="السعر قبل الخصم (اختياري)">
              <input type="number" value={f.old_price} onChange={(e) => setF({ ...f, old_price: e.target.value })}
                className={inputCls} dir="ltr" placeholder="لعرض خصم" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الكمية المتوفرة">
              <input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })}
                className={inputCls} dir="ltr" />
            </Field>
            <Field label="القسم">
              <select value={f.category_slug} onChange={(e) => setF({ ...f, category_slug: e.target.value })} className={inputCls}>
                <option value="">— بدون قسم —</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="صورة المنتج">
            <ImagePicker value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} folder="products" />
          </Field>
          <Field label="خطوات التفعيل (تُرسل للزبون بعد الشراء)">
            <textarea value={f.activation_instructions}
              onChange={(e) => setF({ ...f, activation_instructions: e.target.value })}
              rows={5} className={inputCls} placeholder={"1. افتح التطبيق\n2. اضغط تسجيل الدخول\n3. أدخل البيانات المرسلة"} />
          </Field>
          <Field label="صور شرح التفعيل">
            <MultiImagePicker value={f.activation_images}
              onChange={(urls) => setF({ ...f, activation_images: urls })} folder="activation" />
          </Field>
          <Field label="ترتيب الظهور (الأصغر يظهر أولاً)">
            <input type="number" value={f.display_order}
              onChange={(e) => setF({ ...f, display_order: e.target.value })} className={inputCls} dir="ltr" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} className="accent-primary" />
            عرض في الصفحة الرئيسية
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="accent-primary" />
            متوفر (يظهر للزبائن)
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? "جاري الحفظ…" : "حفظ"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Payment methods -------------------- */

type PMForm = {
  id: string | null;
  name: string;
  account_number: string;
  note: string;
  image_url: string;
  tax: string; // percent (0-100)
  sort_order: string;
  is_active: boolean;
};

const emptyPM: PMForm = {
  id: null, name: "", account_number: "", note: "", image_url: "", tax: "0", sort_order: "0", is_active: true,
};

function PaymentMethodsManager({ adminCode, methods, onChange }: {
  adminCode: string; methods: PaymentMethod[]; onChange: () => void;
}) {
  const [editing, setEditing] = useState<PMForm | null>(null);

  const startEdit = (m: PaymentMethod) => setEditing({
    id: m.id, name: m.name, account_number: m.number, note: m.note || "",
    image_url: m.image_url || "", tax: String(Math.round((m.tax || 0) * 100)),
    sort_order: "0", is_active: true,
  });

  const remove = async (id: string, name: string) => {
    if (!confirm(`حذف طريقة الدفع "${name}"؟`)) return;
    const { error } = await supabase.rpc("admin_delete_payment_method" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" /> طرق الدفع</h2>
        <button onClick={() => setEditing({ ...emptyPM })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4" /> إضافة
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد طرق دفع.</div>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
              {m.image_url ? (
                <img src={m.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">💳</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm line-clamp-1">{m.name}</div>
                <div className="text-[11px] text-muted-foreground" dir="ltr">{m.number}</div>
              </div>
              {m.tax ? (
                <span className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-bold shrink-0">
                  +{Math.round(m.tax * 100)}%
                </span>
              ) : null}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(m)}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-primary/50">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(m.id, m.name)}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PMEditor form={editing} adminCode={adminCode}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />
      )}
    </div>
  );
}

function PMEditor({ form, adminCode, onClose, onSaved }: {
  form: PMForm; adminCode: string; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<PMForm>(form);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim() || !f.account_number.trim()) return toast.error("أدخل الاسم ورقم الحساب");
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_payment_method" as any, {
      _code: adminCode,
      _id: f.id,
      _name: f.name.trim(),
      _account_number: f.account_number.trim(),
      _note: f.note.trim() || null,
      _image_url: f.image_url.trim() || null,
      _tax: (Number(f.tax) || 0) / 100,
      _sort_order: Number(f.sort_order) || 0,
      _is_active: f.is_active,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحفظ: " + error.message);
    toast.success(f.id ? "تم التعديل" : "تمت الإضافة");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-4">{f.id ? "تعديل طريقة دفع" : "إضافة طريقة دفع"}</h3>
        <div className="space-y-3">
          <Field label="الاسم">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="رقم الحساب / المحفظة">
            <input value={f.account_number} onChange={(e) => setF({ ...f, account_number: e.target.value })}
              className={inputCls} dir="ltr" />
          </Field>
          <Field label="ملاحظة للزبون (اختياري)">
            <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={inputCls} />
          </Field>
          <Field label="صورة الشعار">
            <ImagePicker value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} folder="payments" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ضريبة % (0 = بدون)">
              <input type="number" value={f.tax} onChange={(e) => setF({ ...f, tax: e.target.value })} className={inputCls} dir="ltr" />
            </Field>
            <Field label="الترتيب">
              <input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} className={inputCls} dir="ltr" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="accent-primary" />
            مفعّلة (تظهر للزبائن)
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? "جاري الحفظ…" : "حفظ"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

/* -------------------- Categories Manager -------------------- */

type CatForm = {
  original_slug: string | null;
  slug: string;
  name: string;
  icon: string;
  image_url: string;
  sort_order: string;
};

const emptyCat: CatForm = { original_slug: null, slug: "", name: "", icon: "📦", image_url: "", sort_order: "0" };

function CategoriesManager({ adminCode, categories, onChange }: {
  adminCode: string; categories: Category[]; onChange: () => void;
}) {
  const [editing, setEditing] = useState<CatForm | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const remove = async (slug: string, name: string) => {
    if (!confirm(`حذف القسم "${name}"؟ سيتم فصل المنتجات التابعة له.`)) return;
    const { error } = await supabase.rpc("admin_delete_category" as any, { _code: adminCode, _slug: slug });
    if (error) return toast.error("فشل الحذف: " + error.message);
    toast.success("تم الحذف");
    onChange();
  };

  const move = async (slug: string, delta: number) => {
    const sorted = [...categories].sort((a, b) => (a as any).sort_order - (b as any).sort_order);
    const idx = sorted.findIndex((c) => c.slug === slug);
    const target = idx + delta;
    if (target < 0 || target >= sorted.length) return;
    setBusySlug(slug);
    // swap sort_order using index positions
    const a = sorted[idx]; const b = sorted[target];
    await supabase.rpc("admin_reorder_category" as any, { _code: adminCode, _slug: a.slug, _sort_order: target });
    await supabase.rpc("admin_reorder_category" as any, { _code: adminCode, _slug: b.slug, _sort_order: idx });
    setBusySlug(null);
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><Users className="w-5 h-5" /> الأقسام</h2>
        <button onClick={() => setEditing({ ...emptyCat, sort_order: String(categories.length) })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4" /> إضافة قسم
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد أقسام.</div>
      ) : (
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={c.slug} className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm line-clamp-1">{c.name}</div>
                <div className="text-[11px] text-muted-foreground" dir="ltr">/{c.slug} · {c.count} منتج</div>
              </div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button disabled={i === 0 || busySlug === c.slug} onClick={() => move(c.slug, -1)}
                  className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] disabled:opacity-30">▲</button>
                <button disabled={i === categories.length - 1 || busySlug === c.slug} onClick={() => move(c.slug, 1)}
                  className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[10px] disabled:opacity-30">▼</button>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing({
                  original_slug: c.slug, slug: c.slug, name: c.name, icon: c.icon,
                  image_url: c.image_url || "", sort_order: String(i),
                })}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-primary/50">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(c.slug, c.name)}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CategoryEditor form={editing} adminCode={adminCode}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />
      )}
    </div>
  );
}

function CategoryEditor({ form, adminCode, onClose, onSaved }: {
  form: CatForm; adminCode: string; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<CatForm>(form);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!f.name.trim() || !f.slug.trim()) return toast.error("أدخل الاسم والمعرف (slug)");
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_category" as any, {
      _code: adminCode,
      _slug: f.original_slug,
      _new_slug: f.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      _name: f.name.trim(),
      _icon: f.icon.trim() || "📦",
      _sort_order: Number(f.sort_order) || 0,
      _image_url: f.image_url.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحفظ: " + error.message);
    toast.success(f.original_slug ? "تم التعديل" : "تمت الإضافة");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-4">{f.original_slug ? "تعديل قسم" : "إضافة قسم"}</h3>
        <div className="space-y-3">
          <Field label="الاسم بالعربية">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="المعرف (slug) — إنكليزي بدون مسافات">
            <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })}
              className={inputCls} dir="ltr" placeholder="games" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الأيقونة (إيموجي)">
              <input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} className={inputCls} />
            </Field>
            <Field label="الترتيب">
              <input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })}
                className={inputCls} dir="ltr" />
            </Field>
          </div>
          <Field label="صورة القسم (اختياري — تُستخدم بدل الأيقونة)">
            <ImagePicker value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} folder="categories" />
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? "جاري الحفظ…" : "حفظ"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Social Links Manager -------------------- */

type SocialForm = {
  id: string | null;
  name: string;
  url: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};

const emptySocial: SocialForm = { id: null, name: "", url: "", image_url: "", sort_order: "0", is_active: true };

function SocialsManager({ adminCode, socials, onChange }: {
  adminCode: string; socials: SocialLink[]; onChange: () => void;
}) {
  const [editing, setEditing] = useState<SocialForm | null>(null);

  const remove = async (id: string, name: string) => {
    if (!confirm(`حذف "${name}"؟`)) return;
    const { error } = await supabase.rpc("admin_delete_social" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><Share2 className="w-5 h-5" /> منصات التواصل</h2>
        <button onClick={() => setEditing({ ...emptySocial, sort_order: String(socials.length) })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4" /> إضافة منصة
        </button>
      </div>
      {socials.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لم تُضف أي منصة بعد.</div>
      ) : (
        <div className="space-y-2">
          {socials.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
              {s.image_url ? (
                <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">🔗</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{s.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1" dir="ltr">{s.url}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing({
                  id: s.id, name: s.name, url: s.url, image_url: s.image_url || "",
                  sort_order: String(s.sort_order), is_active: true,
                })}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-primary/50">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(s.id, s.name)}
                  className="p-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <SocialEditor form={editing} adminCode={adminCode}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />
      )}
    </div>
  );
}

function SocialEditor({ form, adminCode, onClose, onSaved }: {
  form: SocialForm; adminCode: string; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<SocialForm>(form);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim() || !f.url.trim()) return toast.error("أدخل الاسم والرابط");
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_social" as any, {
      _code: adminCode, _id: f.id, _name: f.name.trim(), _image_url: f.image_url.trim() || null,
      _url: f.url.trim(), _sort_order: Number(f.sort_order) || 0, _is_active: f.is_active,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحفظ: " + error.message);
    toast.success(f.id ? "تم التعديل" : "تمت الإضافة");
    onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-lg mb-4">{f.id ? "تعديل منصة" : "إضافة منصة"}</h3>
        <div className="space-y-3">
          <Field label="الاسم (مثال: واتساب / تليجرام / إنستغرام)">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="الرابط">
            <input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className={inputCls} dir="ltr"
              placeholder="https://..." />
          </Field>
          <Field label="صورة المنصة (شعار)">
            <ImagePicker value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} folder="socials" />
          </Field>
          <Field label="الترتيب">
            <input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })}
              className={inputCls} dir="ltr" />
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? "جاري الحفظ…" : "حفظ"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Store Images Manager -------------------- */

function StoreImagesManager({ adminCode, images, onChange }: {
  adminCode: string; images: StoreImage[]; onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadImage(f, "store");
        const { error } = await supabase.rpc("admin_add_store_image" as any, {
          _code: adminCode, _image_url: url, _sort_order: images.length,
        });
        if (error) throw error;
      }
      toast.success("تمت الإضافة");
      onChange();
    } catch (e: any) { toast.error("فشل: " + (e?.message || "")); }
    finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الصورة؟")) return;
    const { error } = await supabase.rpc("admin_delete_store_image" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5" /> صور المتجر</h2>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? "جاري الرفع…" : "رفع صور"}
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => e.target.files && e.target.files.length > 0 && upload(e.target.files)} />
        </label>
      </div>
      {images.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد صور بعد.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative rounded-xl overflow-hidden border border-border">
              <img src={img.image_url} alt="" className="w-full h-32 object-cover" />
              <button onClick={() => remove(img.id)}
                className="absolute top-1 right-1 w-7 h-7 rounded-lg bg-destructive text-white flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Reviews Manager -------------------- */

function ReviewsManager({ adminCode, reviews, onChange }: {
  adminCode: string; reviews: ReviewRow[]; onChange: () => void;
}) {
  const products = useCatalog((s) => s.products);
  const [open, setOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const remove = async (id: string) => {
    if (!confirm("حذف التقييم؟")) return;
    const { error } = await supabase.rpc("admin_delete_review" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    onChange();
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-right"
      >
        <h2 className="font-black text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" /> تقييمات الزبائن
          <span className="text-xs font-bold text-muted-foreground">({reviews.length})</span>
        </h2>
        {open ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-primary" />}
      </button>

      {open && (
        <div className="mt-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">لا توجد تقييمات بعد.</div>
          ) : (
            <>
              <div className="space-y-2">
                {displayedReviews.map((r) => {
                  const prod = products.find((p) => p.id === r.product_id);
                  return (
                    <div key={r.id} className="p-3 rounded-xl border border-border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex gap-0.5 mb-1">
                            {Array.from({ length: r.rating }).map((_, j) => (
                              <Star key={j} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                            ))}
                          </div>
                          <div className="font-bold text-sm">{r.customer_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("ar-IQ")}
                            {prod && <> · <span className="text-primary">{prod.name}</span></>}
                          </div>
                        </div>
                        <button onClick={() => remove(r.id)}
                          className="p-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {r.comment && <div className="text-sm text-muted-foreground">"{r.comment}"</div>}
                    </div>
                  );
                })}
              </div>
              {reviews.length > 3 && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowAllReviews((v) => !v)}
                    className="px-6 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl font-medium"
                  >
                    {showAllReviews ? "طي التقييمات 🔼" : "عرض باقي التقييمات في اللوحة 🔽"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------- Marquee Manager -------------------- */

function ThemeManager({ adminCode, onChange }: { adminCode: string; onChange: () => void }) {
  const settings = useCatalog((s) => s.settings);
  const [colors, setColors] = useState(() => readTheme(settings));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setColors(readTheme(settings)); }, [settings]);
  useEffect(() => { applyTheme(colors); }, [colors]);

  const save = async () => {
    setBusy(true);
    const results = await Promise.all(
      THEME_KEYS.map((k) =>
        supabase.rpc("admin_set_setting" as any, {
          _code: adminCode, _key: themeSettingKey(k), _value: colors[k],
        }),
      ),
    );
    setBusy(false);
    if (results.some((r) => r.error)) return toast.error("فشل حفظ الألوان");
    toast.success("تم تحديث ألوان الموقع");
    onChange();
  };

  const reset = () => setColors({ ...THEME_DEFAULTS });

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">🎨 ألوان وتصميم الموقع</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {THEME_KEYS.map((k) => (
          <label key={k} className="flex items-center gap-3 rounded-lg bg-surface-2 border border-border p-3">
            <input
              type="color"
              value={colors[k]}
              onChange={(e) => setColors({ ...colors, [k]: e.target.value })}
              className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border bg-transparent"
              aria-label={THEME_LABELS[k]}
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{THEME_LABELS[k]}</span>
              <span className="block text-[11px] text-muted-foreground uppercase">{colors[k]}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={busy}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          {busy ? "جاري الحفظ…" : "حفظ التغييرات"}
        </button>
        <button onClick={reset} type="button"
          className="py-2.5 px-4 rounded-lg bg-surface-2 border border-border font-bold">
          استعادة الافتراضي
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        تُطبَّق الألوان مباشرة على كل صفحات المتجر بعد الحفظ دون إعادة تحميل.
      </p>
    </div>
  );
}

/* -------------------- Notification Settings Manager -------------------- */

const NOTIFY_KEYS = [
  {
    group: "إشعارات الزبون",
    items: [
      { key: "notify_customer_email", label: "بريد إلكتروني للزبون عند تحديث حالة الطلب", hint: "يُرسل تفاصيل الاشتراك للزبون عند تسليم الطلب." },
      { key: "notify_customer_inapp", label: "إشعارات داخل الموقع (صفحة طلباتي)", hint: "تنبيه داخلي فقط عند تغيّر حالة الطلب دون بريد." },
    ],
  },
  {
    group: "إشعارات الإدارة عند وصول طلب جديد",
    items: [
      { key: "notify_admin_whatsapp", label: "واتساب (Green API)", hint: "تنبيه فوري على واتساب المشرف." },
      { key: "notify_admin_telegram", label: "تليجرام (Telegram Bot)", hint: "تنبيه فوري على قناة/حساب التليجرام." },
      { key: "notify_admin_email", label: "بريد المشرف الإلكتروني", hint: "ملخص الطلب الجديد على إيميل الإدارة." },
    ],
  },
] as const;

function NotificationsManager({ adminCode, onChange }: { adminCode: string; onChange: () => void }) {
  const settings = useCatalog((s) => s.settings);
  const read = (src: Record<string, string>) => {
    const out: Record<string, boolean> = {};
    for (const g of NOTIFY_KEYS) for (const it of g.items) out[it.key] = src[it.key] !== "false";
    return out;
  };
  const [flags, setFlags] = useState<Record<string, boolean>>(read(settings));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setFlags(read(settings)); }, [settings]);

  const save = async () => {
    setBusy(true);
    let failed = false;
    for (const [key, value] of Object.entries(flags)) {
      const { error } = await supabase.rpc("admin_set_setting" as any, {
        _code: adminCode, _key: key, _value: value ? "true" : "false",
      });
      if (error) failed = true;
    }
    setBusy(false);
    if (failed) return toast.error("فشل حفظ بعض الإعدادات");
    toast.success("تم حفظ إعدادات الإشعارات");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4">🔔 إعدادات الإشعارات والتنبيهات</h2>
      <div className="space-y-5">
        {NOTIFY_KEYS.map((g) => (
          <div key={g.group}>
            <div className="text-sm font-bold text-primary mb-2">{g.group}</div>
            <div className="space-y-2">
              {g.items.map((it) => (
                <label key={it.key}
                  className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 border border-border p-3 cursor-pointer hover:border-primary/40 transition">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{it.label}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{it.hint}</span>
                  </span>
                  <input type="checkbox" className="accent-primary mt-1 w-4 h-4 shrink-0"
                    checked={!!flags[it.key]}
                    onChange={(e) => setFlags({ ...flags, [it.key]: e.target.checked })} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={busy}
        className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
        {busy ? "جاري الحفظ…" : "حفظ إعدادات الإشعارات"}
      </button>
      <p className="mt-3 text-[11px] text-muted-foreground">
        يفحص الخادم هذه الحالات قبل إرسال أي إشعار، فلا تُستخدم إلا القنوات المفعّلة.
      </p>
    </div>
  );
}

function MarqueeManager({ adminCode, onChange }: { adminCode: string; onChange: () => void }) {
  const settings = useCatalog((s) => s.settings);
  const initialItems: string[] = (() => {
    try { const v = JSON.parse(settings["marquee_items"] || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
  })();
  const [items, setItems] = useState<string[]>(initialItems);
  const [enabled, setEnabled] = useState<boolean>(settings["marquee_enabled"] !== "false");
  const [newItem, setNewItem] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { const v = JSON.parse(settings["marquee_items"] || "[]"); setItems(Array.isArray(v) ? v : []); } catch {}
    setEnabled(settings["marquee_enabled"] !== "false");
  }, [settings]);

  const save = async () => {
    setBusy(true);
    const r1 = await supabase.rpc("admin_set_setting" as any, {
      _code: adminCode, _key: "marquee_items", _value: JSON.stringify(items),
    });
    const r2 = await supabase.rpc("admin_set_setting" as any, {
      _code: adminCode, _key: "marquee_enabled", _value: enabled ? "true" : "false",
    });
    setBusy(false);
    if (r1.error || r2.error) return toast.error("فشل الحفظ");
    toast.success("تم الحفظ");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">📣 الشريط المتحرك</h2>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-primary" />
        إظهار الشريط للزبائن
      </label>
      <div className="space-y-2 mb-3">
        {items.length === 0 && <div className="text-xs text-muted-foreground">لا توجد رسائل — أضف واحدة أدناه.</div>}
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={t}
              onChange={(e) => setItems(items.map((x, idx) => idx === i ? e.target.value : x))}
              className={inputCls} />
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              className="p-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
          placeholder="نص جديد للشريط…" className={inputCls} />
        <button onClick={() => { if (newItem.trim()) { setItems([...items, newItem.trim()]); setNewItem(""); } }}
          className="p-2 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <button onClick={save} disabled={busy}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
        {busy ? "جاري الحفظ…" : "حفظ الشريط"}
      </button>
    </div>
  );
}


/* -------------------- Promo Banner Manager -------------------- */

function PromoManager({ adminCode, categories, onChange }: {
  adminCode: string; categories: Category[]; onChange: () => void;
}) {
  const settings = useCatalog((s) => s.settings);
  const [enabled, setEnabled] = useState(settings["promo_enabled"] !== "false");
  const [subtitle, setSubtitle] = useState(settings["promo_subtitle"] || "");
  const [title, setTitle] = useState(settings["promo_title"] || "");
  const [ctaLabel, setCtaLabel] = useState(settings["promo_cta_label"] || "");
  const [ctaSlug, setCtaSlug] = useState(settings["promo_cta_slug"] || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(settings["promo_enabled"] !== "false");
    setSubtitle(settings["promo_subtitle"] || "");
    setTitle(settings["promo_title"] || "");
    setCtaLabel(settings["promo_cta_label"] || "");
    setCtaSlug(settings["promo_cta_slug"] || "");
  }, [settings]);

  const setOne = async (key: string, value: string) => {
    const { error } = await supabase.rpc("admin_set_setting" as any, { _code: adminCode, _key: key, _value: value });
    if (error) throw error;
  };

  const save = async () => {
    setBusy(true);
    try {
      await setOne("promo_enabled", enabled ? "true" : "false");
      await setOne("promo_subtitle", subtitle);
      await setOne("promo_title", title);
      await setOne("promo_cta_label", ctaLabel);
      await setOne("promo_cta_slug", ctaSlug);
      toast.success("تم الحفظ");
      onChange();
    } catch (e: any) { toast.error("فشل: " + (e?.message || "")); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm("حذف/إخفاء بانر العروض؟")) return;
    setBusy(true);
    try {
      await setOne("promo_enabled", "false");
      await setOne("promo_title", "");
      await setOne("promo_subtitle", "");
      toast.success("تم الحذف");
      onChange();
    } catch (e: any) { toast.error("فشل: " + (e?.message || "")); }
    finally { setBusy(false); }
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">🎁 بانر العروض (الصفحة الرئيسية)</h2>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-primary" />
          إظهار البانر
        </label>
        <Field label="النص العلوي الصغير (مثال: عروض حصرية)">
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
        </Field>
        <Field label="العنوان الرئيسي">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نص الزر">
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="القسم عند الضغط">
            <select value={ctaSlug} onChange={(e) => setCtaSlug(e.target.value)} className={inputCls}>
              <option value="">— بدون —</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            {busy ? "جاري الحفظ…" : "حفظ"}
          </button>
          <button onClick={remove} disabled={busy}
            className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive font-bold">
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- WhatsApp (Green API) Manager -------------------- */

function WhatsAppManager({ adminCode }: { adminCode: string }) {
  const [idInstance, setIdInstance] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_get_private_settings" as any, { _code: adminCode });
      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          if (row.key === "greenapi_id_instance") setIdInstance(row.value || "");
          if (row.key === "greenapi_api_token") setApiToken(row.value || "");
          if (row.key === "greenapi_admin_phone") setPhone(row.value || "");
        }
      }
      setLoading(false);
    })();
  }, [adminCode]);

  const save = async () => {
    setBusy(true);
    try {
      const setOne = async (key: string, value: string) => {
        const { error } = await supabase.rpc("admin_set_setting" as any, { _code: adminCode, _key: key, _value: value });
        if (error) throw error;
      };
      await setOne("greenapi_id_instance", idInstance.trim());
      await setOne("greenapi_api_token", apiToken.trim());
      await setOne("greenapi_admin_phone", phone.replace(/[^\d]/g, ""));
      toast.success("تم حفظ إعدادات واتساب");
    } catch (e: any) { toast.error("فشل: " + (e?.message || "")); }
    finally { setBusy(false); }
  };

  const testSend = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/public/whatsapp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: adminCode,
          idInstance: idInstance.trim(),
          apiToken: apiToken.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success("تم إرسال رسالة الاختبار للواتساب ✅");
      } else {
        // مسار احتياطي: الإرسال من قاعدة البيانات مباشرة (يعمل من أي نطاق)
        const { data: dbRes, error: dbErr } = await supabase.rpc("whatsapp_test_send" as any, { _code: adminCode } as any);
        if (!dbErr && (dbRes as any)?.success) {
          toast.success("تم إرسال رسالة الاختبار من قاعدة البيانات ✅");
        } else {
          toast.error(
            "فشل الاختبار: " +
              ((dbRes as any)?.reason || dbErr?.message || data?.hint || data?.reason || data?.error || res.status),
          );
        }
      }

    } catch (e: any) { toast.error("فشل الاختبار: " + (e?.message || "")); }
    finally { setTesting(false); }
  };


  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-1 flex items-center gap-2">🟢 إشعارات واتساب للمشرف (Green API)</h2>
      <p className="text-xs text-muted-foreground mb-4">
        عند وصول أي طلب جديد، تُرسل رسالة واتساب تحتوي رقم الطلب واسم الزبون والمنتجات والمبلغ ووسيلة الدفع.
      </p>
      <div className="space-y-3">
        <Field label="Green API — idInstance">
          <input value={idInstance} onChange={(e) => setIdInstance(e.target.value)} className={inputCls} dir="ltr"
            placeholder="1101234567" disabled={loading} />
        </Field>
        <Field label="Green API — apiTokenInstance">
          <input value={apiToken} onChange={(e) => setApiToken(e.target.value)} className={inputCls} dir="ltr"
            placeholder="a1b2c3..." disabled={loading} />
        </Field>
        <Field label="رقم واتساب المشرف (مع رمز الدولة بدون +)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} dir="ltr"
            placeholder="9647770586502" disabled={loading} />
        </Field>
        <button onClick={save} disabled={busy || loading}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          {busy ? "جاري الحفظ…" : "حفظ الإعدادات"}
        </button>
        <button type="button" onClick={testSend} disabled={testing || loading}
          className="w-full py-2.5 rounded-lg bg-surface-2 border border-primary/40 text-primary font-bold disabled:opacity-60">
          {testing ? "جاري الإرسال…" : "🧪 اختبار إرسال الواتساب"}
        </button>
      </div>
    </div>
  );
}


type AnalyticsData = Awaited<ReturnType<typeof adminAnalytics>>;

function AnalyticsPanel({ adminCode }: { adminCode: string }) {
  const [d, setD] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await adminAnalytics({ data: { code: adminCode } });
      setD(res); setErr("");
    } catch (e: any) { setErr(e?.message || "فشل التحميل"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminCode]);

  const fmtMs = (ms: number) => {
    if (!ms) return "0ث";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}ث`;
    const m = Math.floor(s / 60); const r = s % 60;
    return `${m}د ${r}ث`;
  };
  const deviceLabel = (k: string) => k === "mobile" ? "📱 موبايل" : k === "desktop" ? "💻 كمبيوتر" : k === "tablet" ? "📱 تابلت" : k === "bot" ? "🤖 بوت" : "❓ غير معروف";

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg">إحصائيات الزوار</h2>
        <div className="text-xs text-muted-foreground">تحديث كل 15ث</div>
      </div>

      {loading && !d ? (
        <div className="text-center py-8 text-sm text-muted-foreground">جاري التحميل…</div>
      ) : err ? (
        <div className="text-center py-4 text-sm text-destructive">{err}</div>
      ) : d ? (
        <div className="space-y-5">
          {/* Top cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="زوار الآن" value={d.liveUsers} accent="text-green-400" pulse />
            <StatCard label="زوار اليوم" value={d.visitors24h} sub={`${d.views24h} مشاهدة`} accent="text-primary" />
            <StatCard label="زوار الأسبوع" value={d.visitors7d} sub={`${d.views7d} مشاهدة`} accent="text-blue-400" />
            <StatCard label="أجهزة" value={d.devices.reduce((a, x) => a + x.n, 0)} sub={d.devices.map((x) => `${deviceLabel(x.k)}: ${x.n}`).join(" · ")} accent="text-yellow-400" />
          </div>

          {/* Live pages */}
          {d.livePages.length > 0 && (
            <Section title="الصفحات المفتوحة الآن">
              <ul className="space-y-1.5">
                {d.livePages.map((p) => (
                  <li key={p.path} className="flex justify-between items-center text-sm bg-surface-2/60 rounded-lg px-3 py-2">
                    <span className="truncate">{p.path}</span>
                    <span className="text-green-400 font-bold">{p.n}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Section title="الصفحات الأكثر زيارة (7 أيام)">
              {d.topPages.length === 0 ? <Empty /> : (
                <ul className="space-y-1.5">
                  {d.topPages.map((p) => (
                    <li key={p.path} className="flex justify-between items-center gap-3 text-sm bg-surface-2/60 rounded-lg px-3 py-2">
                      <span className="truncate flex-1">{p.path}</span>
                      <span className="text-xs text-muted-foreground">{fmtMs(p.avgMs)}</span>
                      <span className="font-bold text-primary">{p.views}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="الأجهزة">
              {d.devices.length === 0 ? <Empty /> : (
                <ul className="space-y-1.5">
                  {d.devices.map((x) => (
                    <li key={x.k} className="flex justify-between items-center text-sm bg-surface-2/60 rounded-lg px-3 py-2">
                      <span>{deviceLabel(x.k)}</span>
                      <span className="font-bold">{x.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="الدول">
              {d.countries.length === 0 ? <Empty /> : (
                <ul className="space-y-1.5">
                  {d.countries.map((x) => (
                    <li key={x.k} className="flex justify-between items-center text-sm bg-surface-2/60 rounded-lg px-3 py-2">
                      <span>{x.k}</span>
                      <span className="font-bold">{x.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="المدن">
              {d.cities.length === 0 ? <Empty /> : (
                <ul className="space-y-1.5">
                  {d.cities.map((x) => (
                    <li key={x.k} className="flex justify-between items-center text-sm bg-surface-2/60 rounded-lg px-3 py-2">
                      <span>{x.k}</span>
                      <span className="font-bold">{x.n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Section title="آخر الأحداث (نقرات وشراء)">
            {d.recentEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground">لا توجد أحداث بعد. استخدم <code className="px-1 rounded bg-surface-2">logEvent(name, data)</code> لتتبع النقرات.</div>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {d.recentEvents.map((e: any, i: number) => (
                  <li key={i} className="text-xs bg-surface-2/60 rounded-lg px-3 py-2 flex justify-between gap-2">
                    <span className="font-bold text-primary">{e.name}</span>
                    <span className="truncate text-muted-foreground flex-1">{e.path || ""}</span>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString("ar-IQ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, sub, accent, pulse }: { label: string; value: number | string; sub?: string; accent?: string; pulse?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2/70 border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {pulse && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>}
        {label}
      </div>
      <div className={`text-2xl font-black ${accent || ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Empty() { return <div className="text-xs text-muted-foreground py-4 text-center">لا توجد بيانات</div>; }

/* -------------------- Blocked entities (حظر الطلبات الوهمية) -------------------- */

type BlockedRow = { id: string; type: string; value: string; reason: string | null; created_at: string };

const BLOCK_TYPE_AR: Record<string, string> = { ip: "عنوان IP", phone: "رقم هاتف", email: "بريد إلكتروني" };

function BlockCustomerModal({ order, adminCode, onClose }: {
  order: AdminOrder; adminCode: string; onClose: () => void;
}) {
  const options = [
    { type: "ip", value: order.customer_ip || "" },
    { type: "phone", value: order.customer_phone || "" },
    { type: "email", value: order.customer_email || "" },
  ].filter((o) => o.value.trim().length > 0);

  const [picked, setPicked] = useState<string[]>(options.map((o) => o.type));
  const [reason, setReason] = useState("طلب وهمي");
  const [busy, setBusy] = useState(false);

  const toggle = (t: string) =>
    setPicked((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const save = async () => {
    const chosen = options.filter((o) => picked.includes(o.type));
    if (chosen.length === 0) return toast.error("اختر عنصراً واحداً على الأقل للحظر");
    setBusy(true);
    for (const c of chosen) {
      const { error } = await supabase.rpc("admin_block_entity" as any, {
        _code: adminCode, _type: c.type, _value: c.value.trim(), _reason: reason.trim() || null,
      });
      if (error) {
        setBusy(false);
        return toast.error("فشل الحظر: " + error.message);
      }
    }
    setBusy(false);
    toast.success(`تم حظر ${chosen.length} عنصر`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-neon rounded-2xl p-5 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black">حظر الزبون</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2 border border-border">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        {options.length === 0 ? (
          <div className="text-sm text-muted-foreground">لا توجد بيانات قابلة للحظر في هذا الطلب.</div>
        ) : (
          <>
            <div className="space-y-2">
              {options.map((o) => (
                <label key={o.type}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm ${
                    picked.includes(o.type) ? "border-destructive bg-destructive/10" : "border-border bg-surface-2"
                  }`}>
                  <input type="checkbox" checked={picked.includes(o.type)} onChange={() => toggle(o.type)} className="accent-primary" />
                  <span className="text-xs text-muted-foreground w-24">{BLOCK_TYPE_AR[o.type]}</span>
                  <span className="font-bold" dir="ltr">{o.value}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">السبب (اختياري)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
            </div>
            <button onClick={save} disabled={busy}
              className="w-full py-2.5 rounded-lg bg-destructive text-white font-bold text-sm disabled:opacity-60">
              {busy ? "جاري الحظر…" : "🚫 تأكيد الحظر"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BlockedManager({ adminCode }: { adminCode: string }) {
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("ip");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_blocked" as any, { _code: adminCode });
    if (!error) setRows(((data as any[]) || []) as BlockedRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminCode]);

  const add = async () => {
    if (!value.trim()) return toast.error("أدخل القيمة");
    setBusy(true);
    const { error } = await supabase.rpc("admin_block_entity" as any, {
      _code: adminCode, _type: type, _value: value.trim(), _reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error("فشل الحظر: " + error.message);
    toast.success("تم إضافة الحظر");
    setValue(""); setReason("");
    load();
  };

  const unblock = async (id: string) => {
    const { error } = await supabase.rpc("admin_unblock_entity" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل إلغاء الحظر: " + error.message);
    toast.success("تم إلغاء الحظر");
    load();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mt-8">
      <h2 className="font-black text-lg mb-4">🚫 قائمة المحظورين</h2>

      <div className="grid sm:grid-cols-4 gap-2 mb-5">
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
          <option value="ip">عنوان IP</option>
          <option value="phone">رقم هاتف</option>
          <option value="email">بريد إلكتروني</option>
        </select>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="القيمة" dir="ltr"
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب (اختياري)"
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none" />
        <button onClick={add} disabled={busy}
          className="py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-60">
          {busy ? "…" : "إضافة للحظر"}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">جاري التحميل…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">لا يوجد محظورون حالياً.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2 border border-border">
              <div className="min-w-0">
                <div className="font-bold text-sm" dir="ltr">{r.value}</div>
                <div className="text-[11px] text-muted-foreground">
                  {BLOCK_TYPE_AR[r.type] || r.type}
                  {r.reason ? ` · ${r.reason}` : ""} · {new Date(r.created_at).toLocaleString("ar-IQ")}
                </div>
              </div>
              <button onClick={() => unblock(r.id)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 font-bold text-xs">
                إلغاء الحظر
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
