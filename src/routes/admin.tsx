import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { formatIQD, products, categories } from "@/lib/data";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Package, ShoppingBag, DollarSign, Users, LogOut, KeyRound } from "lucide-react";
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
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="••••••••"
              className="w-full text-center bg-surface-2 border border-border rounded-xl px-4 py-3.5 mb-3 focus:border-primary outline-none text-lg tracking-widest"
              dir="ltr"
            />
            <button
              onClick={async () => {
                // Try list — server validates the code
                const { error } = await supabase.rpc("admin_list_orders" as any, { _code: input });
                if (error) return toast.error("رمز غير صحيح");
                setCode(input);
                toast.success("مرحباً بك في لوحة الإدارة");
              }}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow"
            >
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
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-surface-2 border border-border hover:border-destructive/50"
          >
            <LogOut className="w-3 h-3" /> خروج
          </button>
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
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">جاري التحميل…</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              لا توجد طلبات بعد.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} adminCode={adminCode} onChange={fetchOrders} />
              ))}
            </div>
          )}
        </div>

        {/* Products (still demo) */}
        <div className="card-neon rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-lg">المنتجات (بيانات تجريبية)</h2>
          </div>
          <div className="space-y-2">
            {products.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm line-clamp-1">{p.name}</div>
                </div>
                <div className="text-primary font-bold text-sm">{formatIQD(p.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Layout>
  );
}

function OrderRow({
  order,
  adminCode,
  onChange,
}: {
  order: AdminOrder;
  adminCode: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(order.subscription_info || "");
  const [busy, setBusy] = useState(false);

  const complete = async () => {
    if (!info.trim()) return toast.error("أدخل معلومات الاشتراك أولاً");
    setBusy(true);
    const { error } = await supabase.rpc("admin_complete_order" as any, {
      _code: adminCode,
      _order_id: order.id,
      _info: info.trim(),
    });
    setBusy(false);
    if (error) return toast.error("فشل إكمال الطلب");
    toast.success("تم إكمال الطلب وإرسال المعلومات للزبون");
    onChange();
  };

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_status" as any, {
      _code: adminCode,
      _order_id: order.id,
      _status: "cancelled",
    });
    setBusy(false);
    if (error) return toast.error("فشل التحديث");
    toast.success("تم رفض الطلب");
    onChange();
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-surface-2/50 text-right"
      >
        <div>
          <div className="font-black" dir="ltr">
            #{order.id.slice(0, 8).toUpperCase()}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("ar-IQ")} · {order.customer_name} · {order.customer_phone}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-black text-primary">{formatIQD(Number(order.total))}</div>
          <span
            className={`text-[10px] px-2 py-1 rounded-md border font-bold ${
              STATUS_STYLES[order.status] || ""
            }`}
          >
            {STATUS_AR[order.status] || order.status}
          </span>
        </div>
      </button>

      {open && (
        <div className="p-4 border-t border-border bg-surface-2/30 space-y-4">
          <div className="text-xs space-y-1">
            <div>
              الهاتف: <span dir="ltr" className="font-bold">{order.customer_phone}</span>
            </div>
            {order.customer_email && (
              <div>
                الإيميل: <span dir="ltr" className="font-bold">{order.customer_email}</span>
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
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={4}
              placeholder="مثال:&#10;Email: user@example.com&#10;Password: ******&#10;الملاحظات: ..."
              disabled={order.status === "completed"}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none disabled:opacity-70"
              dir="ltr"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {order.status !== "completed" && (
              <button
                onClick={complete}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold text-sm disabled:opacity-60"
              >
                ✓ إكمال الطلب وإرسال المعلومات
              </button>
            )}
            {order.status === "pending" && (
              <button
                onClick={cancel}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-destructive text-white font-bold text-sm disabled:opacity-60"
              >
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
