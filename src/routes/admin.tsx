import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useOrders } from "@/lib/cart";
import { formatIQD, products, categories } from "@/lib/data";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Package, ShoppingBag, DollarSign, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — FPI STOR" }] }),
  component: AdminPage,
});

const ADMIN_CODE = "123123990";

function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");

  if (!unlocked) {
    return (
      <Layout>
        <Container className="py-20 max-w-md">
          <div className="card-neon rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black mb-2">لوحة الإدارة</h1>
            <p className="text-sm text-muted-foreground mb-6">أدخل رمز الدخول للمتابعة</p>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              className="w-full text-center bg-surface-2 border border-border rounded-xl px-4 py-3.5 mb-3 focus:border-primary outline-none text-lg tracking-widest"
              dir="ltr"
            />
            <button
              onClick={() => {
                if (code === ADMIN_CODE) { setUnlocked(true); toast.success("مرحباً بك في لوحة الإدارة"); }
                else toast.error("رمز غير صحيح");
              }}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow"
            >
              دخول
            </button>
            <div className="text-[11px] text-muted-foreground mt-4">
              * هذا نموذج توضيحي — في الإنتاج نستخدم مصادقة آمنة بأدوار قاعدة البيانات.
            </div>
          </div>
        </Container>
      </Layout>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const orders = useOrders((s) => s.orders);
  const revenue = orders.reduce((a, o) => a + o.total, 0);

  const stats = [
    { label: "الإيرادات", value: formatIQD(revenue), icon: DollarSign, color: "text-green-400" },
    { label: "الطلبات", value: orders.length, icon: ShoppingBag, color: "text-blue-400" },
    { label: "المنتجات", value: products.length, icon: Package, color: "text-primary" },
    { label: "الأقسام", value: categories.length, icon: Users, color: "text-yellow-400" },
  ];

  return (
    <Layout>
      <Container className="py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">لوحة الإدارة</h1>
            <div className="text-xs text-muted-foreground">إدارة المتجر والطلبات</div>
          </div>
        </div>

        {/* Stats */}
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
          {orders.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              لا توجد طلبات بعد. عند وصول طلبات ستظهر هنا مع تفاصيلها.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-black" dir="ltr">{o.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("ar-IQ")} · {o.method}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-black text-primary">{formatIQD(o.total)}</div>
                    <select
                      defaultValue={o.status}
                      className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm"
                      onChange={() => toast.success("تم تحديث حالة الطلب")}
                    >
                      <option>قيد التنفيذ</option>
                      <option>جاري التجهيز</option>
                      <option>مكتمل</option>
                      <option>مرفوض</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="card-neon rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-lg">المنتجات</h2>
            <button
              onClick={() => toast.info("سيتم تفعيل الإضافة عند ربط قاعدة البيانات")}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold"
            >
              + إضافة منتج
            </button>
          </div>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm line-clamp-1">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {categories.find((c) => c.slug === p.categorySlug)?.name}
                  </div>
                </div>
                <div className="text-primary font-bold text-sm">{formatIQD(p.price)}</div>
                <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                  p.inStock ? "bg-green-500/15 text-green-400" : "bg-destructive/15 text-destructive"
                }`}>
                  {p.inStock ? "متوفر" : "مخفي"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Layout>
  );
}
