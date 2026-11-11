import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD, type Product, type PaymentMethod, type Category } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useEffect, useState, useCallback, memo } from "react";
import { toast } from "sonner";
import { ShieldCheck, Package, ShoppingBag, DollarSign, Users, LogOut, KeyRound, Plus, Edit, Trash2, CreditCard, Upload, Eye, X, Star, Image as ImageIcon, Share2, ChevronDown, ChevronUp, Search, XCircle } from "lucide-react";
import { cloud as supabase } from "@/lib/cloud-client";
import { STATUS_AR, STATUS_STYLES } from "@/lib/cart";
import { filterOrdersByNumber } from "@/lib/order-search";
import { uploadImage, resolveAssetUrl } from "@/lib/upload";
import { HowToBuyManager } from "@/components/admin/HowToBuyManager";
import type { SocialLink, StoreImage, ReviewRow } from "@/lib/catalog";
import { readTheme, applyTheme, THEME_KEYS, THEME_LABELS, THEME_DEFAULTS, themeSettingKey } from "@/lib/theme";
import { telegramTestSend } from "@/lib/telegram-test.functions";
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
    rejection_reason: string | null;
    created_at: string;
    items: {
        product_name: string;
        quantity: number;
        unit_price: number;
    }[];
};
function ImagePicker({ value, onChange, folder }: {
    value: string;
    onChange: (url: string) => void;
    folder: string;
}) {
    useLanguage();
    const [busy, setBusy] = useState(false);
    const handle = async (f: File) => {
        setBusy(true);
        try {
            const url = await uploadImage(f, folder);
            onChange(url);
            toast.success(t("تم رفع الصورة"));
        }
        catch (e: any) {
            toast.error(t("فشل الرفع: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="space-y-2">
      <input value= onChange= className= dir="ltr" placeholder={t("https://... أو ارفع صورة")}/>
      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border cursor-pointer text-xs hover:border-primary/50">
        <Upload className="w-3.5 h-3.5"/>
        
        <input type="file" accept="image/*" className="hidden" onChange=/>
      </label>
      
    </div>);
}
function AdminPage() {
    useLanguage();
    const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = جاري التحقق
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);
    const checkRole = async (uid: string | null) => {
        if (!uid) {
            setIsAdmin(false);
            setChecking(false);
            return false;
        }
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
            if (!alive)
                return;
            const uid = data.session?.user?.id ?? null;
            setUserId(uid);
            await checkRole(uid);
        });
        const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")
                return;
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
        return (<Layout>
        <Container className="py-20 text-center text-muted-foreground">{t("\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0642\u0642\u2026")}</Container>
      </Layout>);
    }
    if (!userId)
        return <AdminLogin />;
    if (!isAdmin)
        return <AdminClaim onDone= onSignOut=/>;
    return <AdminDashboard adminCode="" onLogout=/>;
}
function AdminShell({ title, hint, children }: {
    title: string;
    hint: string;
    children: React.ReactNode;
}) {
    useLanguage();
    return (<Layout>
      <Container className="py-20 max-w-md">
        <div className="card-neon rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary"/>
          </div>
          <h1 className="text-2xl font-black mb-2 text-center"></h1>
          <p className="text-sm text-muted-foreground mb-6 text-center"></p>
          
        </div>
      </Container>
    </Layout>);
}
function AdminLogin() {
    useLanguage();
    const [mode, setMode] = useState<"in" | "up">("in");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || password.length < 6)
            return toast.error(t("أدخل بريداً صالحاً وكلمة مرور 6 خانات فأكثر"));
        setBusy(true);
        try {
            if (mode === "in") {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error)
                    throw error;
                toast.success(t("تم تسجيل الدخول"));
            }
            else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: { emailRedirectTo: window.location.origin + "/admin" },
                });
                if (error)
                    throw error;
                if (!data.session)
                    toast.success(t("تم إنشاء الحساب — افتح بريدك لتأكيد الحساب ثم سجّل الدخول"));
                else
                    toast.success(t("تم إنشاء الحساب"));
            }
        }
        catch (err: any) {
            toast.error(t("فشل: " + (err?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    return (<AdminShell title={t("لوحة الإدارة")} hint={t("الدخول متاح لحسابات الإدارة فقط")}>
      <form onSubmit= className="space-y-3">
        <input type="email" value= onChange= placeholder={t("البريد الإلكتروني")} dir="ltr" autoComplete="email" className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none"/>
        <input type="password" value= onChange= placeholder={t("كلمة المرور")} dir="ltr" autoComplete= className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none"/>
        <button type="submit" disabled= className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          
        </button>
        <button type="button" onClick= className="w-full text-xs text-muted-foreground hover:text-primary">
          
        </button>
      </form>
    </AdminShell>);
}
function AdminClaim({ onDone, onSignOut }: {
    onDone: () => void;
    onSignOut: () => void;
}) {
    useLanguage();
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const claim = async () => {
        setBusy(true);
        const { error } = await supabase.rpc("claim_first_admin" as any, { _code: code });
        setBusy(false);
        if (error) {
            const m = error.message || "";
            if (m.includes("admin_exists"))
                return toast.error(t("توجد حساب إدارة بالفعل — سجّل الدخول به"));
            if (m.includes("bootstrap_closed"))
                return toast.error(t("تم إغلاق منح الصلاحية — استخدم حساب الإدارة الحالي"));
            return toast.error(t("رمز غير صحيح"));
        }
        toast.success(t("تم منح صلاحية الإدارة لحسابك"));
        onDone();
    };
    return (<AdminShell title={t("لا تملك صلاحية الإدارة")} hint={t("لأول مرة فقط: أدخل رمز الإدارة القديم لتحويل حسابك إلى أدمن")}>
      <div className="space-y-3">
        <input type="password" value= onChange= placeholder={t("رمز الإدارة")} dir="ltr" className="w-full text-center bg-surface-2 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none tracking-widest"/>
        <button onClick= disabled= className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          
        </button>
        <button onClick= className="w-full text-xs text-muted-foreground hover:text-primary">{t("\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C")}</button>
      </div>
    </AdminShell>);
}
function AdminDashboard({ adminCode, onLogout }: {
    adminCode: string;
    onLogout: () => void;
}) {
    useLanguage();
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
        await supabase.rpc("auto_advance_pending_orders" as any).then(() => { }, () => { });
        const { data, error } = await supabase.rpc("admin_list_orders" as any, { _code: adminCode });
        if (error) {
            toast.error(t("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً"));
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
    return (<Layout>
      <Container className="py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary"/>
            </div>
            <div>
              <h1 className="text-2xl font-black">{t("\u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629")}</h1>
              <div className="text-xs text-muted-foreground">{t("\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062A\u062C\u0631 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062A")}</div>
            </div>
          </div>
          <button onClick= className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50">
            <LogOut className="w-3 h-3"/>{t(" \u062E\u0631\u0648\u062C ")}</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          
        </div>

        {/* Analytics */}
        <AnalyticsPanel adminCode=/>

        {/* Orders */}
        <OrdersPanel orders= loading= adminCode= onChange=/>

        {/* Registered customers */}
        <AdminSection title={t("👥 الزبائن المسجلون")}>
          <CustomersManager adminCode=/>
        </AdminSection>



        {/* Collapsible management sections */}
        <AdminSection title={t("🗂️ أقسام المتجر")}>
          <CategoriesManager adminCode= categories= onChange=/>
        </AdminSection>

        <AdminSection title={t("📦 المنتجات")}>
          <ProductsManager adminCode= products= categories= onChange=/>
        </AdminSection>

        <AdminSection title={t("💳 طرق الدفع / منصات الدفع")}>
          <PaymentMethodsManager adminCode= methods= onChange=/>
        </AdminSection>

        <AdminSection title={t("🔗 روابط التواصل")}>
          <SocialsManager adminCode= socials= onChange=/>
        </AdminSection>

        <AdminSection title={t("🖼️ صور المتجر")}>
          <StoreImagesManager adminCode= images= onChange=/>
        </AdminSection>

        {/* Reviews management (has its own collapse) */}
        <ReviewsManager adminCode= reviews= onChange=/>

        <AdminSection title={t("🎨 ألوان وتصميم الموقع")}>
          <ThemeManager adminCode= onChange=/>
        </AdminSection>

        <AdminSection title={t("📢 الشريط المتحرك")}>
          <MarqueeManager adminCode= onChange=/>
        </AdminSection>

        <AdminSection title={t("🛒 كيفية الشراء (الصفحة الرئيسية)")}>
          <HowToBuyManager adminCode= onChange=/>
        </AdminSection>

        <AdminSection title={t("🏷️ بانر العرض")}>
          <PromoManager adminCode= categories= onChange=/>
        </AdminSection>

        <AdminSection title={t("🔔 إعدادات الإشعارات والتنبيهات")}>
          <NotificationsManager adminCode= onChange=/>
        </AdminSection>

        <AdminSection title={t("💬 إشعارات الواتساب للمشرف")}>
          <WhatsAppManager adminCode=/>
        </AdminSection>

        <AdminSection title={t("✈️ إشعارات التليجرام للمشرف")}>
          <TelegramManager adminCode=/>
        </AdminSection>


        <AdminSection title={t("🚫 قائمة المحظورين")}>
          <BlockedManager adminCode=/>
        </AdminSection>





      </Container>
    </Layout>);
}
function AdminSection({ title, defaultOpen = false, children }: {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    useLanguage();
    const [open, setOpen] = useState(defaultOpen);
    return (<div className="mt-8">
      <button type="button" onClick= aria-expanded= className=>
        <span className="font-black text-lg"></span>
        <span className="text-primary text-sm"></span>
      </button>
      
    </div>);
}
type CustomerRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
    role: string | null;
    joined_at: string;
    orders_count: number;
};
function CustomersManager({ adminCode }: {
    adminCode: string;
}) {
    useLanguage();
    const [rows, setRows] = useState<CustomerRow[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const perPage = 20;
    const fetchRows = useCallback(async () => {
        setLoading(true);
        const [{ data, error }, { data: cnt }] = await Promise.all([
            supabase.rpc("admin_list_customers" as any, {
                _code: adminCode,
                _search: search.trim(),
                _limit: perPage,
                _offset: (page - 1) * perPage,
            }),
            supabase.rpc("admin_count_customers" as any, { _code: adminCode, _search: search.trim() }),
        ]);
        if (error) {
            toast.error(t("فشل جلب الزبائن"));
        }
        else {
            setRows(((data as any[]) || []) as CustomerRow[]);
            const c = Array.isArray(cnt) ? Number((cnt as any)[0]?.admin_count_customers ?? 0) : Number(cnt ?? 0);
            setTotal(Number.isFinite(c) ? c : 0);
        }
        setLoading(false);
    }, [adminCode, search, page]);
    useEffect(() => {
        const t = setTimeout(fetchRows, 250);
        return () => clearTimeout(t);
    }, [fetchRows]);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return (<div className="card-neon rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-black">{t("\uD83D\uDC65 \u0627\u0644\u0632\u0628\u0627\u0626\u0646 \u0627\u0644\u0645\u0633\u062C\u0644\u0648\u0646 (")})</h2>
        <input value= onChange= placeholder={t("بحث بالاسم أو البريد…")} className="w-full sm:w-64 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"/>
      </div>

      

      <div className="flex items-center justify-between gap-2 mt-4">
        <button type="button" disabled= onClick= className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border disabled:opacity-40">{t(" \u0627\u0644\u0633\u0627\u0628\u0642 ")}</button>
        <span className="text-xs text-muted-foreground">{t("\u0635\u0641\u062D\u0629 ")}{t(" \u0645\u0646 ")}</span>
        <button type="button" disabled= onClick= className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border disabled:opacity-40">{t(" \u0627\u0644\u062A\u0627\u0644\u064A ")}</button>
      </div>
    </div>);
}
function OrdersPanel({ orders, loading, adminCode, onChange }: {
    orders: AdminOrder[];
    loading: boolean;
    adminCode: string;
    onChange: () => void;
}) {
    useLanguage();
    const [perPage, setPerPage] = useState(5);
    const [page, setPage] = useState(1);
    const [collapsed, setCollapsed] = useState(false);
    const [q, setQ] = useState("");
    // بحث فوري برقم الطلب: يقبل مع # أو بدونه، وبسطور كبيرة أو صغيرة،
    // وحتى لو كتب الزبون الرقم بدون شرطَات.
    const filtered = filterOrdersByNumber(orders, q);
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const current = Math.min(page, totalPages);
    const slice = filtered.slice((current - 1) * perPage, current * perPage);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-black text-lg">{t("\u0627\u0644\u0637\u0644\u0628\u0627\u062A ")}<span className="text-xs text-muted-foreground font-bold">()</span></h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            <input value= onChange= placeholder={t("ابحث برقم الطلب…")} dir="ltr" className="w-full bg-surface-2 border border-border rounded-lg pr-9 pl-8 py-2 text-sm focus:border-primary outline-none"/>
            
          </div>
          <select value= onChange= className="bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs font-bold">
            <option value=>{t("5 \u0644\u0643\u0644 \u0635\u0641\u062D\u0629")}</option>
            <option value=>{t("10 \u0644\u0643\u0644 \u0635\u0641\u062D\u0629")}</option>
            <option value=>{t("20 \u0644\u0643\u0644 \u0635\u0641\u062D\u0629")}</option>
          </select>
          <button onClick= className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 border border-border font-bold">
            
          </button>
        </div>
      </div>

      
    </div>);
}
function OrderRow({ order, adminCode, onChange }: {
    order: AdminOrder;
    adminCode: string;
    onChange: () => void;
}) {
    useLanguage();
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
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const handleUpload = async (files: FileList) => {
        setUploading(true);
        try {
            const arr = Array.from(files);
            const urls: string[] = [];
            for (const f of arr)
                urls.push(await uploadImage(f, "subscriptions"));
            setImgs((prev) => [...prev, ...urls]);
            toast.success(t(`تم رفع ${urls.length} صورة`));
        }
        catch (e: any) {
            toast.error(t("فشل الرفع: " + (e?.message || "")));
        }
        finally {
            setUploading(false);
        }
    };
    const removeImg = (i: number) => setImgs((prev) => prev.filter((_, idx) => idx !== i));
    const complete = async () => {
        if (!info.trim() && imgs.length === 0)
            return toast.error(t("أدخل معلومات الاشتراك أو أرفق صورة"));
        setBusy(true);
        const { error } = await supabase.rpc("admin_complete_order_v2" as any, {
            _code: adminCode, _order_id: order.id, _info: info.trim(), _image_urls: imgs,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل إكمال الطلب: " + error.message));
        toast.success(t("تم إكمال الطلب"));
        // إرسال تفاصيل الاشتراك للزبون بالبريد (لا يوقف نجاح العملية)
        if (order.customer_email) {
            fetch("/api/public/order-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: adminCode, orderId: order.id }),
            })
                .then((r) => r.json())
                .then((d) => {
                if (d?.success)
                    toast.success(t("تم إرسال الإيميل للزبون"));
            })
                .catch(() => { });
        }
        onChange();
    };
    const cancel = async () => {
        setBusy(true);
        const { error } = await supabase.rpc("admin_update_status" as any, {
            _code: adminCode, _order_id: order.id, _status: "cancelled",
            _reason: rejectReason.trim() || null,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل التحديث"));
        toast.success(t("تم رفض الطلب"));
        setRejectOpen(false);
        setRejectReason("");
        onChange();
    };
    const remove = async () => {
        if (!confirm(t("هل أنت متأكد من حذف هذا الطلب نهائياً؟")))
            return;
        setBusy(true);
        const { error } = await supabase.rpc("admin_delete_order" as any, {
            _code: adminCode, _order_id: order.id,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل الحذف: " + error.message));
        toast.success(t("تم حذف الطلب"));
        onChange();
    };
    const quickBlock = async (type: "ip" | "phone") => {
        const value = type === "ip" ? order.customer_ip : order.customer_phone;
        if (!value)
            return;
        if (!confirm(t(`حظر ${type === "ip" ? "عنوان IP" : "رقم الهاتف"}: ${value} ؟`)))
            return;
        setBusy(true);
        const { error } = await supabase.rpc("admin_block_entity" as any, {
            _code: adminCode, _type: type, _value: value,
            _reason: `حظر سريع من الطلب ${order.id.slice(0, 8).toUpperCase()}`,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل الحظر: " + error.message));
        toast.success(t("تم الحظر بنجاح"));
        onChange();
    };
    const done = order.status === "completed";
    return (<div className="border border-border rounded-xl overflow-hidden">
      <button onClick= className="w-full p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-surface-2/50 text-right">
        <div>
          <div className="font-black" dir="ltr">#</div>
          <div className="text-xs text-muted-foreground">
             ·  · 
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-black text-primary"></div>
          <span className=>
            
          </span>
        </div>
      </button>

      



      
    </div>);
}
/* -------------------- Payment proof viewer -------------------- */
function ProofModal({ raw, onClose }: {
    raw: string;
    onClose: () => void;
}) {
    useLanguage();
    const [url, setUrl] = useState<string>("");
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let alive = true;
        resolveAssetUrl(raw).then((u) => {
            if (!alive)
                return;
            if (u)
                setUrl(u);
            else
                setFailed(true);
        });
        return () => { alive = false; };
    }, [raw]);
    return (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="max-w-3xl w-full" onClick=>
        <div className="flex justify-between mb-2">
          <div className="text-white font-bold">{t("\u0625\u062B\u0628\u0627\u062A \u0627\u0644\u062A\u062D\u0648\u064A\u0644")}</div>
          <button onClick= className="w-8 h-8 rounded-lg bg-white/10 text-white">
            <X className="w-4 h-4 mx-auto"/>
          </button>
        </div>
        
      </div>
    </div>);
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
    value: string[];
    onChange: (urls: string[]) => void;
    folder: string;
}) {
    useLanguage();
    const [busy, setBusy] = useState(false);
    const handle = async (files: FileList) => {
        setBusy(true);
        try {
            const urls: string[] = [];
            for (const f of Array.from(files))
                urls.push(await uploadImage(f, folder));
            onChange([...value, ...urls]);
            toast.success(t(`تم رفع ${urls.length} صورة`));
        }
        catch (e: any) {
            toast.error(t("فشل الرفع: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="space-y-2">
      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border cursor-pointer text-xs hover:border-primary/50">
        <Upload className="w-3.5 h-3.5"/>
        
        <input type="file" accept="image/*" multiple className="hidden" onChange=/>
      </label>
      
    </div>);
}
function StockQuickEdit({ product, adminCode, onSaved }: {
    product: Product;
    adminCode: string;
    onSaved: () => void;
}) {
    useLanguage();
    const [val, setVal] = useState<string>(String(product.stock ?? 0));
    const [busy, setBusy] = useState(false);
    useEffect(() => { setVal(String(product.stock ?? 0)); }, [product.stock]);
    const save = async (next: number) => {
        if (next < 0)
            next = 0;
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
        if (error)
            return toast.error(t("فشل تحديث الكمية"));
        toast.success(t("تم تحديث الكمية"));
        onSaved();
    };
    const current = Number(product.stock ?? 0);
    return (<div className="flex items-center gap-1 mt-1.5">
      <span className="text-[11px] text-muted-foreground">{t("\u0627\u0644\u0643\u0645\u064A\u0629:")}</span>
      <button disabled= onClick= className="w-6 h-6 rounded-md bg-surface-2 border border-border text-sm font-bold disabled:opacity-50">−</button>
      <input type="number" inputMode="numeric" value= disabled= onChange= onBlur= onKeyDown= className="w-14 h-6 text-center rounded-md bg-surface-2 border border-border text-xs font-bold" dir="ltr"/>
      <button disabled= onClick= className="w-6 h-6 rounded-md bg-surface-2 border border-border text-sm font-bold disabled:opacity-50">+</button>
    </div>);
}
function AutoStockModal({ product, adminCode, onClose, onChanged }: {
    product: Product;
    adminCode: string;
    onClose: () => void;
    onChanged: () => void;
}) {
    useLanguage();
    const [rows, setRows] = useState<Array<{
        id: string;
        account_details: string;
        is_used: boolean;
    }>>([]);
    const [bulk, setBulk] = useState("");
    const [busy, setBusy] = useState(false);
    const load = async () => {
        const { data, error } = await supabase.rpc("admin_list_stock" as any, {
            _code: adminCode, _product_id: product.id,
        });
        if (error)
            return toast.error(t("فشل تحميل المخزون"));
        setRows((data as any[]) || []);
    };
    useEffect(() => { load(); }, [product.id]);
    const add = async () => {
        const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0)
            return toast.error(t("أدخل حساباً واحداً على الأقل"));
        setBusy(true);
        const { data, error } = await supabase.rpc("admin_add_stock" as any, {
            _code: adminCode, _product_id: product.id, _lines: lines,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل الإضافة: " + error.message));
        toast.success(t(`تمت إضافة ${data} حساب`));
        setBulk("");
        await load();
        onChanged();
    };
    const del = async (id: string) => {
        const { error } = await supabase.rpc("admin_delete_stock" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل الحذف"));
        await load();
        onChanged();
    };
    const available = rows.filter((r) => !r.is_used).length;
    return (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick=>
        <h3 className="font-black text-lg mb-1">{t("\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t(" \u2014 \u0627\u0644\u0645\u062A\u0648\u0641\u0631: ")}<span className="text-primary font-bold"></span>{t(" \u062D\u0633\u0627\u0628 ")}</p>

        <Field label={t("أضف حسابات / أكواد (كل سطر = حساب واحد)")}>
          <textarea value= onChange= rows= className= dir="ltr" placeholder=/>
        </Field>
        <button onClick= disabled= className="mt-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          
        </button>

        <div className="mt-5 space-y-1.5">
          
        </div>

        <button onClick= className="mt-5 w-full py-2.5 rounded-lg bg-surface-2 border border-border font-bold">{t(" \u0625\u063A\u0644\u0627\u0642 ")}</button>
      </div>
    </div>);
}
function ProductsManager({ adminCode, products, categories, onChange }: {
    adminCode: string;
    products: Product[];
    categories: Category[];
    onChange: () => void;
}) {
    useLanguage();
    const [editing, setEditing] = useState<ProductForm | null>(null);
    const [stockFor, setStockFor] = useState<Product | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const loadCounts = async () => {
        const { data } = await supabase.rpc("admin_stock_counts" as any, { _code: adminCode });
        const map: Record<string, number> = {};
        for (const r of (data as any[]) || [])
            map[r.product_id] = r.available;
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
        if (!confirm(t(`حذف "${name}"؟`)))
            return;
        const { error } = await supabase.rpc("admin_delete_product" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل الحذف"));
        toast.success(t("تم الحذف"));
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><Package className="w-5 h-5"/>{t(" \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")}</h2>
        <button onClick= className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4"/>{t(" \u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C ")}</button>
      </div>

      

      

      
    </div>);
}
function ProductEditor({ form, categories, adminCode, onClose, onSaved }: {
    form: ProductForm;
    categories: Category[];
    adminCode: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    useLanguage();
    const [f, setF] = useState<ProductForm>(form);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (!f.name.trim() || !f.price)
            return toast.error(t("أدخل الاسم والسعر"));
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
        if (error)
            return toast.error(t("فشل الحفظ: " + error.message));
        toast.success(t(f.id ? "تم التعديل" : "تمت الإضافة"));
        onSaved();
    };
    return (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick=>
        <h3 className="font-black text-lg mb-4"></h3>
        <div className="space-y-3">
          <Field label={t("الاسم")}>
            <input value= onChange= className=/>
          </Field>
          <Field label={t("الوصف")}>
            <textarea value= onChange= rows= className=/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("السعر (د.ع)")}>
              <input type="number" value= onChange= className= dir="ltr"/>
            </Field>
            <Field label={t("السعر قبل الخصم (اختياري)")}>
              <input type="number" value= onChange= className= dir="ltr" placeholder={t("لعرض خصم")}/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("الكمية المتوفرة")}>
              <input type="number" value= onChange= className= dir="ltr"/>
            </Field>
            <Field label={t("القسم")}>
              <select value= onChange= className=>
                <option value="">{t("\u2014 \u0628\u062F\u0648\u0646 \u0642\u0633\u0645 \u2014")}</option>
                
              </select>
            </Field>
          </div>
          <Field label={t("صورة المنتج")}>
            <ImagePicker value= onChange= folder="products"/>
          </Field>
          <Field label={t("خطوات التفعيل (تُرسل للزبون بعد الشراء)")}>
            <textarea value= onChange= rows= className= placeholder=/>
          </Field>
          <Field label={t("صور شرح التفعيل")}>
            <MultiImagePicker value= onChange= folder="activation"/>
          </Field>
          <Field label={t("ترتيب الظهور (الأصغر يظهر أولاً)")}>
            <input type="number" value= onChange= className= dir="ltr"/>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked= onChange= className="accent-primary"/>{t(" \u0639\u0631\u0636 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 ")}</label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked= onChange= className="accent-primary"/>{t(" \u0645\u062A\u0648\u0641\u0631 (\u064A\u0638\u0647\u0631 \u0644\u0644\u0632\u0628\u0627\u0626\u0646) ")}</label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick= disabled= className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            
          </button>
          <button onClick= className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">{t(" \u0625\u0644\u063A\u0627\u0621 ")}</button>
        </div>
      </div>
    </div>);
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
    adminCode: string;
    methods: PaymentMethod[];
    onChange: () => void;
}) {
    useLanguage();
    const [editing, setEditing] = useState<PMForm | null>(null);
    const startEdit = (m: PaymentMethod) => setEditing({
        id: m.id, name: m.name, account_number: m.number, note: m.note || "",
        image_url: m.image_url || "", tax: String(Math.round((m.tax || 0) * 100)),
        sort_order: "0", is_active: true,
    });
    const remove = async (id: string, name: string) => {
        if (!confirm(t(`حذف طريقة الدفع "${name}"؟`)))
            return;
        const { error } = await supabase.rpc("admin_delete_payment_method" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل الحذف"));
        toast.success(t("تم الحذف"));
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><CreditCard className="w-5 h-5"/>{t(" \u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639")}</h2>
        <button onClick= className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4"/>{t(" \u0625\u0636\u0627\u0641\u0629 ")}</button>
      </div>

      

      
    </div>);
}
function PMEditor({ form, adminCode, onClose, onSaved }: {
    form: PMForm;
    adminCode: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    useLanguage();
    const [f, setF] = useState<PMForm>(form);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (!f.name.trim() || !f.account_number.trim())
            return toast.error(t("أدخل الاسم ورقم الحساب"));
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
        if (error)
            return toast.error(t("فشل الحفظ: " + error.message));
        toast.success(t(f.id ? "تم التعديل" : "تمت الإضافة"));
        onSaved();
    };
    return (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick=>
        <h3 className="font-black text-lg mb-4"></h3>
        <div className="space-y-3">
          <Field label={t("الاسم")}>
            <input value= onChange= className=/>
          </Field>
          <Field label={t("رقم الحساب / المحفظة")}>
            <input value= onChange= className= dir="ltr"/>
          </Field>
          <Field label={t("ملاحظة للزبون (اختياري)")}>
            <input value= onChange= className=/>
          </Field>
          <Field label={t("صورة الشعار")}>
            <ImagePicker value= onChange= folder="payments"/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("ضريبة % (0 = بدون)")}>
              <input type="number" value= onChange= className= dir="ltr"/>
            </Field>
            <Field label={t("الترتيب")}>
              <input type="number" value= onChange= className= dir="ltr"/>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked= onChange= className="accent-primary"/>{t(" \u0645\u0641\u0639\u0651\u0644\u0629 (\u062A\u0638\u0647\u0631 \u0644\u0644\u0632\u0628\u0627\u0626\u0646) ")}</label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick= disabled= className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            
          </button>
          <button onClick= className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">{t(" \u0625\u0644\u063A\u0627\u0621 ")}</button>
        </div>
      </div>
    </div>);
}
const inputCls = "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none";
function Field({ label, children }: {
    label: string;
    children: React.ReactNode;
}) {
    useLanguage();
    return (<div>
      <label className="text-xs text-muted-foreground mb-1 block"></label>
      
    </div>);
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
    adminCode: string;
    categories: Category[];
    onChange: () => void;
}) {
    useLanguage();
    const [editing, setEditing] = useState<CatForm | null>(null);
    const [busySlug, setBusySlug] = useState<string | null>(null);
    const remove = async (slug: string, name: string) => {
        if (!confirm(t(`حذف القسم "${name}"؟ سيتم فصل المنتجات التابعة له.`)))
            return;
        const { error } = await supabase.rpc("admin_delete_category" as any, { _code: adminCode, _slug: slug });
        if (error)
            return toast.error(t("فشل الحذف: " + error.message));
        toast.success(t("تم الحذف"));
        onChange();
    };
    const move = async (slug: string, delta: number) => {
        const sorted = [...categories].sort((a, b) => (a as any).sort_order - (b as any).sort_order);
        const idx = sorted.findIndex((c) => c.slug === slug);
        const target = idx + delta;
        if (target < 0 || target >= sorted.length)
            return;
        setBusySlug(slug);
        // swap sort_order using index positions
        const a = sorted[idx];
        const b = sorted[target];
        await supabase.rpc("admin_reorder_category" as any, { _code: adminCode, _slug: a.slug, _sort_order: target });
        await supabase.rpc("admin_reorder_category" as any, { _code: adminCode, _slug: b.slug, _sort_order: idx });
        setBusySlug(null);
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><Users className="w-5 h-5"/>{t(" \u0627\u0644\u0623\u0642\u0633\u0627\u0645")}</h2>
        <button onClick= className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4"/>{t(" \u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645 ")}</button>
      </div>

      

      
    </div>);
}
function CategoryEditor({ form, adminCode, onClose, onSaved }: {
    form: CatForm;
    adminCode: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    useLanguage();
    const [f, setF] = useState<CatForm>(form);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (!f.name.trim() || !f.slug.trim())
            return toast.error(t("أدخل الاسم والمعرف (slug)"));
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
        if (error)
            return toast.error(t("فشل الحفظ: " + error.message));
        toast.success(t(f.original_slug ? "تم التعديل" : "تمت الإضافة"));
        onSaved();
    };
    return (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md" onClick=>
        <h3 className="font-black text-lg mb-4"></h3>
        <div className="space-y-3">
          <Field label={t("الاسم بالعربية")}>
            <input value= onChange= className=/>
          </Field>
          <Field label={t("المعرف (slug) — إنكليزي بدون مسافات")}>
            <input value= onChange= className= dir="ltr" placeholder="games"/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("الأيقونة (إيموجي)")}>
              <input value= onChange= className=/>
            </Field>
            <Field label={t("الترتيب")}>
              <input type="number" value= onChange= className= dir="ltr"/>
            </Field>
          </div>
          <Field label={t("صورة القسم (اختياري — تُستخدم بدل الأيقونة)")}>
            <ImagePicker value= onChange= folder="categories"/>
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick= disabled= className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            
          </button>
          <button onClick= className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">{t(" \u0625\u0644\u063A\u0627\u0621 ")}</button>
        </div>
      </div>
    </div>);
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
    adminCode: string;
    socials: SocialLink[];
    onChange: () => void;
}) {
    useLanguage();
    const [editing, setEditing] = useState<SocialForm | null>(null);
    const remove = async (id: string, name: string) => {
        if (!confirm(t(`حذف "${name}"؟`)))
            return;
        const { error } = await supabase.rpc("admin_delete_social" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل الحذف"));
        toast.success(t("تم الحذف"));
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><Share2 className="w-5 h-5"/>{t(" \u0645\u0646\u0635\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644")}</h2>
        <button onClick= className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow">
          <Plus className="w-4 h-4"/>{t(" \u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u0635\u0629 ")}</button>
      </div>
      
      
    </div>);
}
function SocialEditor({ form, adminCode, onClose, onSaved }: {
    form: SocialForm;
    adminCode: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    useLanguage();
    const [f, setF] = useState<SocialForm>(form);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (!f.name.trim() || !f.url.trim())
            return toast.error(t("أدخل الاسم والرابط"));
        setBusy(true);
        const { error } = await supabase.rpc("admin_upsert_social" as any, {
            _code: adminCode, _id: f.id, _name: f.name.trim(), _image_url: f.image_url.trim() || null,
            _url: f.url.trim(), _sort_order: Number(f.sort_order) || 0, _is_active: f.is_active,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل الحفظ: " + error.message));
        toast.success(t(f.id ? "تم التعديل" : "تمت الإضافة"));
        onSaved();
    };
    return (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="bg-background border border-border rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick=>
        <h3 className="font-black text-lg mb-4"></h3>
        <div className="space-y-3">
          <Field label={t("الاسم (مثال: واتساب / تليجرام / إنستغرام)")}>
            <input value= onChange= className=/>
          </Field>
          <Field label={t("الرابط")}>
            <input value= onChange= className= dir="ltr" placeholder="https://..."/>
          </Field>
          <Field label={t("صورة المنصة (شعار)")}>
            <ImagePicker value= onChange= folder="socials"/>
          </Field>
          <Field label={t("الترتيب")}>
            <input type="number" value= onChange= className= dir="ltr"/>
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick= disabled= className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            
          </button>
          <button onClick= className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border font-bold">{t("\u0625\u0644\u063A\u0627\u0621")}</button>
        </div>
      </div>
    </div>);
}
/* -------------------- Store Images Manager -------------------- */
function StoreImagesManager({ adminCode, images, onChange }: {
    adminCode: string;
    images: StoreImage[];
    onChange: () => void;
}) {
    useLanguage();
    const [uploading, setUploading] = useState(false);
    const upload = async (files: FileList) => {
        setUploading(true);
        try {
            for (const f of Array.from(files)) {
                const url = await uploadImage(f, "store");
                const { error } = await supabase.rpc("admin_add_store_image" as any, {
                    _code: adminCode, _image_url: url, _sort_order: images.length,
                });
                if (error)
                    throw error;
            }
            toast.success(t("تمت الإضافة"));
            onChange();
        }
        catch (e: any) {
            toast.error(t("فشل: " + (e?.message || "")));
        }
        finally {
            setUploading(false);
        }
    };
    const remove = async (id: string) => {
        if (!confirm(t("حذف الصورة؟")))
            return;
        const { error } = await supabase.rpc("admin_delete_store_image" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل الحذف"));
        toast.success(t("تم الحذف"));
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5"/>{t(" \u0635\u0648\u0631 \u0627\u0644\u0645\u062A\u062C\u0631")}</h2>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold btn-glow cursor-pointer">
          <Upload className="w-4 h-4"/> 
          <input type="file" accept="image/*" multiple className="hidden" onChange=/>
        </label>
      </div>
      
    </div>);
}
/* -------------------- Reviews Manager -------------------- */
function ReviewsManager({ adminCode, reviews, onChange }: {
    adminCode: string;
    reviews: ReviewRow[];
    onChange: () => void;
}) {
    useLanguage();
    const products = useCatalog((s) => s.products);
    const [open, setOpen] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const remove = async (id: string) => {
        if (!confirm(t("حذف التقييم؟")))
            return;
        const { error } = await supabase.rpc("admin_delete_review" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل الحذف"));
        toast.success(t("تم الحذف"));
        onChange();
    };
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <button onClick= className="w-full flex items-center justify-between gap-2 text-right">
        <h2 className="font-black text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500"/>{t(" \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0627\u0644\u0632\u0628\u0627\u0626\u0646 ")}<span className="text-xs font-bold text-muted-foreground">()</span>
        </h2>
        
      </button>

      
    </div>);
}
/* -------------------- Marquee Manager -------------------- */
function ThemeManager({ adminCode, onChange }: {
    adminCode: string;
    onChange: () => void;
}) {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const [colors, setColors] = useState(() => readTheme(settings));
    const [busy, setBusy] = useState(false);
    useEffect(() => { setColors(readTheme(settings)); }, [settings]);
    useEffect(() => { applyTheme(colors); }, [colors]);
    const save = async () => {
        setBusy(true);
        const results = await Promise.all(THEME_KEYS.map((k) => supabase.rpc("admin_set_setting" as any, {
            _code: adminCode, _key: themeSettingKey(k), _value: colors[k],
        })));
        setBusy(false);
        if (results.some((r) => r.error))
            return toast.error(t("فشل حفظ الألوان"));
        toast.success(t("تم تحديث ألوان الموقع"));
        onChange();
    };
    const reset = () => setColors({ ...THEME_DEFAULTS });
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">{t("\uD83C\uDFA8 \u0623\u0644\u0648\u0627\u0646 \u0648\u062A\u0635\u0645\u064A\u0645 \u0627\u0644\u0645\u0648\u0642\u0639")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick= disabled= className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          
        </button>
        <button onClick= type="button" className="py-2.5 px-4 rounded-lg bg-surface-2 border border-border font-bold">{t(" \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A ")}</button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{t(" \u062A\u064F\u0637\u0628\u064E\u0651\u0642 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0645\u0628\u0627\u0634\u0631\u0629 \u0639\u0644\u0649 \u0643\u0644 \u0635\u0641\u062D\u0627\u062A \u0627\u0644\u0645\u062A\u062C\u0631 \u0628\u0639\u062F \u0627\u0644\u062D\u0641\u0638 \u062F\u0648\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u062D\u0645\u064A\u0644. ")}</p>
    </div>);
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
function NotificationsManager({ adminCode, onChange }: {
    adminCode: string;
    onChange: () => void;
}) {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const read = (src: Record<string, string>) => {
        const out: Record<string, boolean> = {};
        for (const g of NOTIFY_KEYS)
            for (const it of g.items)
                out[it.key] = src[it.key] !== "false";
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
            if (error)
                failed = true;
        }
        setBusy(false);
        if (failed)
            return toast.error(t("فشل حفظ بعض الإعدادات"));
        toast.success(t("تم حفظ إعدادات الإشعارات"));
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4">{t("\uD83D\uDD14 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A")}</h2>
      <div className="space-y-5">
        
      </div>
      <button onClick= disabled= className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
        
      </button>
      <p className="mt-3 text-[11px] text-muted-foreground">{t(" \u064A\u0641\u062D\u0635 \u0627\u0644\u062E\u0627\u062F\u0645 \u0647\u0630\u0647 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0623\u064A \u0625\u0634\u0639\u0627\u0631\u060C \u0641\u0644\u0627 \u062A\u064F\u0633\u062A\u062E\u062F\u0645 \u0625\u0644\u0627 \u0627\u0644\u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0645\u0641\u0639\u0651\u0644\u0629. ")}</p>
    </div>);
}
function MarqueeManager({ adminCode, onChange }: {
    adminCode: string;
    onChange: () => void;
}) {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const initialItems: string[] = (() => {
        try {
            const v = JSON.parse(settings["marquee_items"] || "[]");
            return Array.isArray(v) ? v : [];
        }
        catch {
            return [];
        }
    })();
    const [items, setItems] = useState<string[]>(initialItems);
    const [enabled, setEnabled] = useState<boolean>(settings["marquee_enabled"] !== "false");
    const [newItem, setNewItem] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        try {
            const v = JSON.parse(settings["marquee_items"] || "[]");
            setItems(Array.isArray(v) ? v : []);
        }
        catch { }
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
        if (r1.error || r2.error)
            return toast.error(t("فشل الحفظ"));
        toast.success(t("تم الحفظ"));
        onChange();
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">{t("\uD83D\uDCE3 \u0627\u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u0645\u062A\u062D\u0631\u0643")}</h2>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked= onChange= className="accent-primary"/>{t(" \u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0634\u0631\u064A\u0637 \u0644\u0644\u0632\u0628\u0627\u0626\u0646 ")}</label>
      <div className="space-y-2 mb-3">
        
        
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input value= onChange= placeholder={t("نص جديد للشريط…")} className=/>
        <button onClick= className="p-2 rounded-lg bg-primary text-primary-foreground shrink-0">
          <Plus className="w-4 h-4"/>
        </button>
      </div>
      <button onClick= disabled= className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
        
      </button>
    </div>);
}
/* -------------------- Promo Banner Manager -------------------- */
function PromoManager({ adminCode, categories, onChange }: {
    adminCode: string;
    categories: Category[];
    onChange: () => void;
}) {
    useLanguage();
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
        if (error)
            throw error;
    };
    const save = async () => {
        setBusy(true);
        try {
            await setOne("promo_enabled", enabled ? "true" : "false");
            await setOne("promo_subtitle", subtitle);
            await setOne("promo_title", title);
            await setOne("promo_cta_label", ctaLabel);
            await setOne("promo_cta_slug", ctaSlug);
            toast.success(t("تم الحفظ"));
            onChange();
        }
        catch (e: any) {
            toast.error(t("فشل: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!confirm(t("حذف/إخفاء بانر العروض؟")))
            return;
        setBusy(true);
        try {
            await setOne("promo_enabled", "false");
            await setOne("promo_title", "");
            await setOne("promo_subtitle", "");
            toast.success(t("تم الحذف"));
            onChange();
        }
        catch (e: any) {
            toast.error(t("فشل: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">{t("\uD83C\uDF81 \u0628\u0627\u0646\u0631 \u0627\u0644\u0639\u0631\u0648\u0636 (\u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629)")}</h2>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked= onChange= className="accent-primary"/>{t(" \u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0628\u0627\u0646\u0631 ")}</label>
        <Field label={t("النص العلوي الصغير (مثال: عروض حصرية)")}>
          <input value= onChange= className=/>
        </Field>
        <Field label={t("العنوان الرئيسي")}>
          <input value= onChange= className=/>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("نص الزر")}>
            <input value= onChange= className=/>
          </Field>
          <Field label={t("القسم عند الضغط")}>
            <select value= onChange= className=>
              <option value="">{t("\u2014 \u0628\u062F\u0648\u0646 \u2014")}</option>
              
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick= disabled= className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
            
          </button>
          <button onClick= disabled= className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border hover:border-destructive/50 text-destructive font-bold">{t(" \u062D\u0630\u0641 ")}</button>
        </div>
      </div>
    </div>);
}
/* -------------------- WhatsApp (Green API) Manager -------------------- */
function WhatsAppManager({ adminCode }: {
    adminCode: string;
}) {
    useLanguage();
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
                    if (row.key === "greenapi_id_instance")
                        setIdInstance(row.value || "");
                    if (row.key === "greenapi_api_token")
                        setApiToken(row.value || "");
                    if (row.key === "greenapi_admin_phone")
                        setPhone(row.value || "");
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
                if (error)
                    throw error;
            };
            await setOne("greenapi_id_instance", idInstance.trim());
            await setOne("greenapi_api_token", apiToken.trim());
            await setOne("greenapi_admin_phone", phone.replace(/[^\d]/g, ""));
            toast.success(t("تم حفظ إعدادات واتساب"));
        }
        catch (e: any) {
            toast.error(t("فشل: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
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
                toast.success(t("تم إرسال رسالة الاختبار للواتساب ✅"));
            }
            else {
                // مسار احتياطي: الإرسال من قاعدة البيانات مباشرة (يعمل من أي نطاق)
                const { data: dbRes, error: dbErr } = await supabase.rpc("whatsapp_test_send" as any, { _code: adminCode } as any);
                if (!dbErr && (dbRes as any)?.success) {
                    toast.success(t("تم إرسال رسالة الاختبار من قاعدة البيانات ✅"));
                }
                else {
                    toast.error(t("فشل الاختبار: " +
                        ((dbRes as any)?.reason || dbErr?.message || data?.hint || data?.reason || data?.error || res.status)));
                }
            }
        }
        catch (e: any) {
            toast.error(t("فشل الاختبار: " + (e?.message || "")));
        }
        finally {
            setTesting(false);
        }
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-1 flex items-center gap-2">{t("\uD83D\uDFE2 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0648\u0627\u062A\u0633\u0627\u0628 \u0644\u0644\u0645\u0634\u0631\u0641 (Green API)")}</h2>
      <p className="text-xs text-muted-foreground mb-4">{t(" \u0639\u0646\u062F \u0648\u0635\u0648\u0644 \u0623\u064A \u0637\u0644\u0628 \u062C\u062F\u064A\u062F\u060C \u062A\u064F\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629 \u0648\u0627\u062A\u0633\u0627\u0628 \u062A\u062D\u062A\u0648\u064A \u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0648\u0627\u0633\u0645 \u0627\u0644\u0632\u0628\u0648\u0646 \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0648\u0627\u0644\u0645\u0628\u0644\u063A \u0648\u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639. ")}</p>
      <div className="space-y-3">
        <Field label="Green API — idInstance">
          <input value= onChange= className= dir="ltr" placeholder="1101234567" disabled=/>
        </Field>
        <Field label="Green API — apiTokenInstance">
          <input value= onChange= className= dir="ltr" placeholder="a1b2c3..." disabled=/>
        </Field>
        <Field label={t("رقم واتساب المشرف (مع رمز الدولة بدون +)")}>
          <input value= onChange= className= dir="ltr" placeholder="9647770586502" disabled=/>
        </Field>
        <button onClick= disabled= className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          
        </button>
        <button type="button" onClick= disabled= className="w-full py-2.5 rounded-lg bg-surface-2 border border-primary/40 text-primary font-bold disabled:opacity-60">
          
        </button>
      </div>
    </div>);
}
/* -------------------- Telegram Manager -------------------- */
function TelegramManager({ adminCode }: {
    adminCode: string;
}) {
    useLanguage();
    const [botToken, setBotToken] = useState("");
    const [chatId, setChatId] = useState("");
    const [busy, setBusy] = useState(false);
    const [testing, setTesting] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase.rpc("admin_get_private_settings" as any, { _code: adminCode });
            if (!error && Array.isArray(data)) {
                for (const row of data as any[]) {
                    if (row.key === "telegram_bot_token")
                        setBotToken(row.value || "");
                    if (row.key === "telegram_chat_id")
                        setChatId(row.value || "");
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
                if (error)
                    throw error;
            };
            await setOne("telegram_bot_token", botToken.trim());
            await setOne("telegram_chat_id", chatId.trim());
            toast.success(t("تم حفظ إعدادات التليجرام"));
        }
        catch (e: any) {
            toast.error(t("فشل: " + (e?.message || "")));
        }
        finally {
            setBusy(false);
        }
    };
    const testSend = async () => {
        setTesting(true);
        try {
            const token = botToken.trim();
            const chat = chatId.trim();
            // 1) اتصال مباشر بـ Telegram API من المتصفح (لا يحتاج أي متغيرات خادم)
            if (token && chat) {
                try {
                    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: chat,
                            parse_mode: "HTML",
                            text: "🧪 <b>رسالة اختبار — FPI STOR</b>\nإعدادات إشعارات التليجرام تعمل بنجاح ✅",
                        }),
                    });
                    const json: any = await res.json().catch(() => null);
                    if (json?.ok) {
                        toast.success(t("تم إرسال رسالة الاختبار للتليجرام ✅"));
                        return;
                    }
                    console.error("[telegram-test:client]", json);
                    toast.error(t("فشل الاختبار: " + (json?.description || `HTTP ${res.status}`)));
                    return;
                }
                catch (err) {
                    console.error("[telegram-test:client] network error, falling back to server", err);
                }
            }
            // 2) احتياطي: الإرسال من الخادم بالمفاتيح المحفوظة في الإعدادات
            const data: any = await telegramTestSend({ data: { botToken: token, chatId: chat } });
            if (data?.ok) {
                toast.success(t("تم إرسال رسالة الاختبار للتليجرام ✅"));
            }
            else {
                toast.error(t("فشل الاختبار: " +
                    (data?.description || data?.error || (data?.missing || []).join(", ") || "غير معروف")));
            }
        }
        catch (e: any) {
            toast.error(t("فشل الاختبار: " + (e?.message || "")));
        }
        finally {
            setTesting(false);
        }
    };
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-1 flex items-center gap-2">{t("\u2708\uFE0F \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u0644\u064A\u062C\u0631\u0627\u0645 \u0644\u0644\u0645\u0634\u0631\u0641")}</h2>
      <p className="text-xs text-muted-foreground mb-4">{t(" \u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0627\u0644\u062A\u0648\u0643\u0646 \u0645\u0646 @BotFather \u0648\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0645\u0646 @userinfobot. \u062D\u0641\u0638\u0647\u0627 \u0647\u0646\u0627 \u064A\u062C\u0639\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0645\u0644 \u0639\u0644\u0649 \u0623\u064A \u0627\u0633\u062A\u0636\u0627\u0641\u0629 (Vercel \u0623\u064A\u0636\u0627\u064B) \u062F\u0648\u0646 \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0628\u064A\u0626\u0629. ")}</p>
      <div className="space-y-3">
        <Field label="Telegram — Bot Token">
          <input value= onChange= className= dir="ltr" placeholder="123456789:AA..." disabled=/>
        </Field>
        <Field label="Telegram — Chat ID">
          <input value= onChange= className= dir="ltr" placeholder="7126623171" disabled=/>
        </Field>
        <button onClick= disabled= className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          
        </button>
        <button type="button" onClick= disabled= className="w-full py-2.5 rounded-lg bg-surface-2 border border-primary/40 text-primary font-bold disabled:opacity-60">
          
        </button>
      </div>
    </div>);
}
type AnalyticsData = {
    visitors24h: number;
    views24h: number;
    visitors7d: number;
    views7d: number;
    liveUsers: number;
    livePages: {
        path: string;
        n: number;
    }[];
    topPages: {
        path: string;
        views: number;
        avgMs: number;
    }[];
    countries: {
        k: string;
        n: number;
    }[];
    cities: {
        k: string;
        n: number;
    }[];
    devices: {
        k: string;
        n: number;
    }[];
    recentEvents: any[];
};
/* -------------------- Persistent collapsible state -------------------- */
function useStoredOpen(key: string, defaultOpen = true) {
    const [open, setOpen] = useState(() => {
        if (typeof window === "undefined")
            return defaultOpen;
        try {
            const saved = window.localStorage.getItem(key);
            return saved === null ? defaultOpen : saved === "1";
        }
        catch {
            return defaultOpen;
        }
    });
    useEffect(() => {
        try {
            window.localStorage.setItem(key, open ? "1" : "0");
        }
        catch { /* تجاهل */ }
    }, [key, open]);
    const toggle = useCallback(() => setOpen((v) => !v), []);
    return [open, toggle] as const;
}
function AnalyticsPanel({ adminCode }: {
    adminCode: string;
}) {
    useLanguage();
    const [d, setD] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [open, toggleOpen] = useStoredOpen("fpi_admin_analytics_open");
    const load = async () => {
        try {
            const { data: rpcData, error: rpcErr } = await supabase.rpc("admin_analytics" as any, { _code: adminCode } as any);
            if (rpcErr)
                throw rpcErr;
            const res = rpcData as unknown as AnalyticsData;
            setD(res);
            setErr("");
        }
        catch (e: any) {
            setErr(e?.message || "فشل التحميل");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!open)
            return;
        load();
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminCode, open]);
    const fmtMs = (ms: number) => {
        if (!ms)
            return "0ث";
        const s = Math.round(ms / 1000);
        if (s < 60)
            return `${s}ث`;
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}د ${r}ث`;
    };
    const deviceLabel = (k: string) => k === "mobile" ? "📱 موبايل" : k === "desktop" ? "💻 كمبيوتر" : k === "tablet" ? "📱 تابلت" : k === "bot" ? "🤖 بوت" : "❓ غير معروف";
    return (<div className="card-neon rounded-2xl p-5 mb-6">
      <button type="button" onClick= aria-expanded= aria-controls="analytics-body" className="w-full flex items-center justify-between gap-2 text-right">
        <h2 className="font-black text-lg">{t("\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0632\u0648\u0627\u0631")}</h2>
        <span className="flex items-center gap-2 shrink-0">
          
          
        </span>
      </button>

      <div id="analytics-body" inert= className=>
        <div className="overflow-hidden min-h-0">
          <div className="mt-4">

      
          </div>
        </div>
      </div>
    </div>);
}
function StatCard({ label, value, sub, accent, pulse }: {
    label: string;
    value: number | string;
    sub?: string;
    accent?: string;
    pulse?: boolean;
}) {
    useLanguage();
    return (<div className="rounded-xl bg-surface-2/70 border border-border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        
        
      </div>
      <div className=></div>
      
    </div>);
}
function Section({ title, children }: {
    title: string;
    children: React.ReactNode;
}) {
    useLanguage();
    return (<div>
      <div className="text-sm font-bold mb-2"></div>
      
    </div>);
}
function Empty() { useLanguage(); return <div className="text-xs text-muted-foreground py-4 text-center">{t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A")}</div>; }
/* -------------------- Blocked entities (حظر الطلبات الوهمية) -------------------- */
type BlockedRow = {
    id: string;
    type: string;
    value: string;
    reason: string | null;
    created_at: string;
};
const BLOCK_TYPE_AR: Record<string, string> = { ip: "عنوان IP", phone: "رقم هاتف", email: "بريد إلكتروني" };
function BlockCustomerModal({ order, adminCode, onClose }: {
    order: AdminOrder;
    adminCode: string;
    onClose: () => void;
}) {
    useLanguage();
    const options = [
        { type: "ip", value: order.customer_ip || "" },
        { type: "phone", value: order.customer_phone || "" },
        { type: "email", value: order.customer_email || "" },
    ].filter((o) => o.value.trim().length > 0);
    const [picked, setPicked] = useState<string[]>(options.map((o) => o.type));
    const [reason, setReason] = useState("طلب وهمي");
    const [busy, setBusy] = useState(false);
    const toggle = (t: string) => setPicked((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    const save = async () => {
        const chosen = options.filter((o) => picked.includes(o.type));
        if (chosen.length === 0)
            return toast.error(t("اختر عنصراً واحداً على الأقل للحظر"));
        setBusy(true);
        for (const c of chosen) {
            const { error } = await supabase.rpc("admin_block_entity" as any, {
                _code: adminCode, _type: c.type, _value: c.value.trim(), _reason: reason.trim() || null,
            });
            if (error) {
                setBusy(false);
                return toast.error(t("فشل الحظر: " + error.message));
            }
        }
        setBusy(false);
        toast.success(t(`تم حظر ${chosen.length} عنصر`));
        onClose();
    };
    return (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick=>
      <div className="card-neon rounded-2xl p-5 w-full max-w-md space-y-4" onClick=>
        <div className="flex items-center justify-between">
          <h3 className="font-black">{t("\u062D\u0638\u0631 \u0627\u0644\u0632\u0628\u0648\u0646")}</h3>
          <button onClick= className="w-8 h-8 rounded-lg bg-surface-2 border border-border">
            <X className="w-4 h-4 mx-auto"/>
          </button>
        </div>
        
      </div>
    </div>);
}
function BlockedManager({ adminCode }: {
    adminCode: string;
}) {
    useLanguage();
    const [rows, setRows] = useState<BlockedRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState("ip");
    const [value, setValue] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const load = async () => {
        const { data, error } = await supabase.rpc("admin_list_blocked" as any, { _code: adminCode });
        if (!error)
            setRows(((data as any[]) || []) as BlockedRow[]);
        setLoading(false);
    };
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminCode]);
    const add = async () => {
        if (!value.trim())
            return toast.error(t("أدخل القيمة"));
        setBusy(true);
        const { error } = await supabase.rpc("admin_block_entity" as any, {
            _code: adminCode, _type: type, _value: value.trim(), _reason: reason.trim() || null,
        });
        setBusy(false);
        if (error)
            return toast.error(t("فشل الحظر: " + error.message));
        toast.success(t("تم إضافة الحظر"));
        setValue("");
        setReason("");
        load();
    };
    const unblock = async (id: string) => {
        const { error } = await supabase.rpc("admin_unblock_entity" as any, { _code: adminCode, _id: id });
        if (error)
            return toast.error(t("فشل إلغاء الحظر: " + error.message));
        toast.success(t("تم إلغاء الحظر"));
        load();
    };
    return (<div className="card-neon rounded-2xl p-5 mt-8">
      <h2 className="font-black text-lg mb-4">{t("\uD83D\uDEAB \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062D\u0638\u0648\u0631\u064A\u0646")}</h2>

      <div className="grid sm:grid-cols-4 gap-2 mb-5">
        <select value= onChange= className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none">
          <option value="ip">{t("\u0639\u0646\u0648\u0627\u0646 IP")}</option>
          <option value="phone">{t("\u0631\u0642\u0645 \u0647\u0627\u062A\u0641")}</option>
          <option value="email">{t("\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A")}</option>
        </select>
        <input value= onChange= placeholder={t("القيمة")} dir="ltr" className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"/>
        <input value= onChange= placeholder={t("السبب (اختياري)")} className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"/>
        <button onClick= disabled= className="py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-60">
          
        </button>
      </div>

      
    </div>);
}
