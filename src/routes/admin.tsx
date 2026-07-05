import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD, type Product, type PaymentMethod, type Category } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Package, ShoppingBag, DollarSign, Users, LogOut, KeyRound, Plus, Edit, Trash2, CreditCard, Upload, Eye, X, Star, Image as ImageIcon, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin, STATUS_AR, STATUS_STYLES } from "@/lib/cart";
import { uploadImage } from "@/lib/upload";
import type { SocialLink, StoreImage, ReviewRow } from "@/lib/catalog";


export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — FPI STOR" }] }),
  component: AdminPage,
});

type AdminOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
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
  const code = useAdmin((s) => s.code);
  const setCode = useAdmin((s) => s.setCode);
  const [input, setInput] = useState("");

  if (!code) {
    return (
      <Layout>
        <Container className="py-20 max-w-md">
          <div className="card-neon rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black mb-2">لوحة الإدارة</h1>
            <p className="text-sm text-muted-foreground mb-6">أدخل رمز الدخول للمتابعة</p>
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="••••••••"
              className="w-full text-center bg-surface-2 border border-border rounded-xl px-4 py-3.5 mb-3 focus:border-primary outline-none text-lg tracking-widest"
              dir="ltr" />
            <button
              onClick={async () => {
                const { error } = await supabase.rpc("admin_login" as any, { _code: input });
                if (error) {
                  const msg = error.message || "";
                  const lock = msg.match(/locked:(\d+)/);
                  const invalid = msg.match(/invalid:(\d+)/);
                  if (lock) {
                    const mins = Math.ceil(Number(lock[1]) / 60);
                    return toast.error(`تم حظر الدخول مؤقتاً — حاول بعد ${mins} دقيقة`);
                  }
                  if (invalid) return toast.error(`رمز غير صحيح — تبقى ${invalid[1]} محاولة`);
                  return toast.error("رمز غير صحيح");
                }
                setCode(input);
                toast.success("مرحباً بك في لوحة الإدارة");
              }}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow">
              دخول
            </button>
          </div>
        </Container>
      </Layout>
    );
  }

  return <AdminDashboard adminCode={code} onLogout={() => setCode(null)} />;
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

        {/* Orders */}
        <div className="card-neon rounded-2xl p-5 mb-6">
          <h2 className="font-black text-lg mb-4">الطلبات</h2>
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">جاري التحميل…</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">لا توجد طلبات بعد.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} adminCode={adminCode} onChange={fetchOrders} />
              ))}
            </div>
          )}
        </div>

        {/* Categories management */}
        <CategoriesManager adminCode={adminCode} categories={categories} onChange={refreshCatalog} />

        {/* Products management */}
        <ProductsManager adminCode={adminCode} products={products} categories={categories} onChange={refreshCatalog} />

        {/* Payment methods management */}
        <PaymentMethodsManager adminCode={adminCode} methods={paymentMethods} onChange={refreshCatalog} />

        {/* Social links management */}
        <SocialsManager adminCode={adminCode} socials={socials} onChange={refreshCatalog} />

        {/* Store images management */}
        <StoreImagesManager adminCode={adminCode} images={storeImages} onChange={refreshCatalog} />

        {/* Reviews management */}
        <ReviewsManager adminCode={adminCode} reviews={reviews} onChange={refreshCatalog} />

        {/* Marquee / announcement bar */}
        <MarqueeManager adminCode={adminCode} onChange={refreshCatalog} />

        {/* Promo banner */}
        <PromoManager adminCode={adminCode} categories={categories} onChange={refreshCatalog} />

        {/* Change admin code */}
        <ChangeCodeManager adminCode={adminCode} onChanged={(c) => useAdmin.getState().setCode(c)} />
      </Container>
    </Layout>
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
          </div>
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
};

const emptyProduct: ProductForm = {
  id: null, name: "", description: "", price: "", old_price: "", stock: "0",
  image_url: "", category_slug: "", is_active: true,
};

function ProductsManager({ adminCode, products, categories, onChange }: {
  adminCode: string; products: Product[]; categories: Category[]; onChange: () => void;
}) {
  const [editing, setEditing] = useState<ProductForm | null>(null);

  const startNew = () => setEditing({ ...emptyProduct, category_slug: categories[0]?.slug || "" });
  const startEdit = (p: Product) => setEditing({
    id: p.id, name: p.name, description: p.description, price: String(p.price),
    old_price: p.oldPrice != null ? String(p.oldPrice) : "",
    stock: p.stock != null ? String(p.stock) : "0",
    image_url: p.image, category_slug: p.categorySlug, is_active: p.inStock,
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
    const { error } = await supabase.rpc("admin_upsert_product_v2" as any, {
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
  sort_order: string;
};

const emptyCat: CatForm = { original_slug: null, slug: "", name: "", icon: "📦", sort_order: "0" };

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
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
                {c.icon}
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
                  original_slug: c.slug, slug: c.slug, name: c.name, icon: c.icon, sort_order: String(i),
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

  const remove = async (id: string) => {
    if (!confirm("حذف التقييم؟")) return;
    const { error } = await supabase.rpc("admin_delete_review" as any, { _code: adminCode, _id: id });
    if (error) return toast.error("فشل الحذف");
    toast.success("تم الحذف");
    onChange();
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" /> تقييمات الزبائن
      </h2>
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد تقييمات بعد.</div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => {
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
      )}
    </div>
  );
}

/* -------------------- Marquee Manager -------------------- */

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

/* -------------------- Change Admin Code -------------------- */

function ChangeCodeManager({ adminCode, onChanged }: { adminCode: string; onChanged: (c: string) => void }) {
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 4) return toast.error("الرمز الجديد يجب أن يكون 4 خانات فأكثر");
    if (next !== confirmNext) return toast.error("الرمز غير متطابق");
    setBusy(true);
    const { error } = await supabase.rpc("admin_change_code" as any, { _current: adminCode, _new: next });
    setBusy(false);
    if (error) return toast.error("فشل: " + error.message);
    toast.success("تم تغيير رمز الإدارة");
    onChanged(next);
    setNext(""); setConfirmNext("");
  };

  return (
    <div className="card-neon rounded-2xl p-5 mb-6">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2"><KeyRound className="w-5 h-5" /> تغيير رمز الإدارة</h2>
      <div className="space-y-3">
        <Field label="الرمز الجديد">
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} dir="ltr" />
        </Field>
        <Field label="تأكيد الرمز الجديد">
          <input type="password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} className={inputCls} dir="ltr" />
        </Field>
        <button onClick={submit} disabled={busy}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
          {busy ? "جاري الحفظ…" : "تغيير الرمز"}
        </button>
      </div>
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

