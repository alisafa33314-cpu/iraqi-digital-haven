import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD, type Product, type PaymentMethod, type Category } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Package, ShoppingBag, DollarSign, Users, LogOut, KeyRound, Plus, Edit, Trash2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin, STATUS_AR, STATUS_STYLES } from "@/lib/cart";

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
  payment_proof_url: string | null;
  payment_method_name: string | null;
  created_at: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
};

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
                const { error } = await supabase.rpc("admin_list_orders" as any, { _code: input });
                if (error) return toast.error("رمز غير صحيح");
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
      </Container>
    </Layout>
  );
}

function OrderRow({ order, adminCode, onChange }: { order: AdminOrder; adminCode: string; onChange: () => void; }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(order.subscription_info || "");
  const [busy, setBusy] = useState(false);

  const complete = async () => {
    if (!info.trim()) return toast.error("أدخل معلومات الاشتراك أولاً");
    setBusy(true);
    const { error } = await supabase.rpc("admin_complete_order" as any, {
      _code: adminCode, _order_id: order.id, _info: info.trim(),
    });
    setBusy(false);
    if (error) return toast.error("فشل إكمال الطلب");
    toast.success("تم إكمال الطلب وإرسال المعلومات للزبون");
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
              <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md bg-green-500/15 border border-green-500/30 text-green-400 font-bold">
                ✓ واصل التحويل <span className="opacity-70 font-normal" dir="ltr">({order.payment_proof_url})</span>
              </div>
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
            <label className="text-xs font-bold mb-1 block flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> معلومات الاشتراك (تُرسل للزبون)
            </label>
            <textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={4}
              placeholder="مثال:&#10;Email: user@example.com&#10;Password: ******"
              disabled={order.status === "completed"}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none disabled:opacity-70"
              dir="ltr" />
          </div>
          <div className="flex flex-wrap gap-2">
            {order.status !== "completed" && (
              <button onClick={complete} disabled={busy}
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
            {order.status === "completed" && (
              <div className="text-xs text-green-400 font-bold">✓ تم إكمال الطلب — يستطيع الزبون رؤية المعلومات في «طلباتي»</div>
            )}
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
  image_url: string;
  category_slug: string;
  is_active: boolean;
};

const emptyProduct: ProductForm = {
  id: null, name: "", description: "", price: "", image_url: "", category_slug: "", is_active: true,
};

function ProductsManager({ adminCode, products, categories, onChange }: {
  adminCode: string; products: Product[]; categories: Category[]; onChange: () => void;
}) {
  const [editing, setEditing] = useState<ProductForm | null>(null);

  const startNew = () => setEditing({ ...emptyProduct, category_slug: categories[0]?.slug || "" });
  const startEdit = (p: Product) => setEditing({
    id: p.id, name: p.name, description: p.description, price: String(p.price),
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
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm line-clamp-1">{p.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {categories.find((c) => c.slug === p.categorySlug)?.name || "—"}
                </div>
              </div>
              <div className="text-primary font-bold text-sm shrink-0">{formatIQD(p.price)}</div>
              <div className="flex gap-1 shrink-0">
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
    const { error } = await supabase.rpc("admin_upsert_product" as any, {
      _code: adminCode,
      _id: f.id,
      _name: f.name.trim(),
      _description: f.description.trim(),
      _price: Number(f.price),
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
            <Field label="القسم">
              <select value={f.category_slug} onChange={(e) => setF({ ...f, category_slug: e.target.value })} className={inputCls}>
                <option value="">— بدون قسم —</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="رابط الصورة (URL)">
            <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })}
              className={inputCls} dir="ltr" placeholder="https://..." />
          </Field>
          {f.image_url && (
            <img src={f.image_url} alt="" className="w-24 h-24 rounded-lg object-cover border border-border" />
          )}
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
          <Field label="رابط صورة الشعار">
            <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })}
              className={inputCls} dir="ltr" placeholder="https://..." />
          </Field>
          {f.image_url && (
            <img src={f.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
          )}
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
