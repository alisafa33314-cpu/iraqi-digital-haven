import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useCart, useMyOrderIds } from "@/lib/cart";
import { formatIQD, paymentMethods } from "@/lib/data";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "إتمام الطلب — FPI STOR" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const nav = useNavigate();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const addId = useMyOrderIds((s) => s.addId);

  const [method, setMethod] = useState(paymentMethods[0].name);
  const [proof, setProof] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((a, i) => a + i.qty * i.product.price, 0);
  const selected = paymentMethods.find((m) => m.name === method)!;
  const tax = selected.tax ? subtotal * selected.tax : 0;
  const total = subtotal + tax;

  if (items.length === 0)
    return (
      <Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black mb-2">لا توجد منتجات للدفع</h1>
        </Container>
      </Layout>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return toast.error("الرجاء إدخال الاسم ورقم الهاتف");
    if (!proof) return toast.error("الرجاء رفع صورة إثبات الدفع لإكمال الطلب");
    setSubmitting(true);
    try {
      const orderId = crypto.randomUUID();

      // Insert order without requesting the row back, because guests can create orders but cannot read all order details directly.
      const { error } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || null,
          delivery_info: `طريقة الدفع: ${method} — إثبات: ${proof.name}`,
          total,
          status: "pending",
        });
      if (error) throw error;

      // Insert items
      const rows = items.map((i) => ({
        order_id: orderId,
        product_name: i.product.name,
        quantity: i.qty,
        unit_price: i.product.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(rows);
      if (itemsError) throw itemsError;

      addId(orderId);
      clear();

      // Notify admin via WhatsApp
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_whatsapp")
        .maybeSingle();
      const adminNum = (setting?.value || "").replace(/\D/g, "");
      if (adminNum) {
        const summary = [
          `🛒 طلب جديد — FPI STOR`,
          `الاسم: ${name.trim()}`,
          `الهاتف: ${phone.trim()}`,
          email ? `الإيميل: ${email.trim()}` : "",
          `طريقة الدفع: ${method}`,
          `الإجمالي: ${formatIQD(total)}`,
          ``,
          `المنتجات:`,
          ...items.map((i) => `• ${i.product.name} × ${i.qty}`),
          ``,
          `رقم الطلب: ${orderId}`,
        ]
          .filter(Boolean)
          .join("\n");
        const url = `https://wa.me/${adminNum}?text=${encodeURIComponent(summary)}`;
        window.open(url, "_blank");
      }

      toast.success("تم إرسال طلبك بنجاح — الحالة: قيد التنفيذ");
      nav({ to: "/orders" });
    } catch (err: any) {
      toast.error("فشل إرسال الطلب: " + (err?.message || "خطأ"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">إتمام الطلب</h1>
        <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Customer info */}
            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-4">معلومات الزبون</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم الكامل</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none"
                    placeholder="اسمك الكامل"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">رقم الهاتف</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none"
                    placeholder="07XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    البريد الإلكتروني <span className="opacity-60">(اختياري)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none"
                    placeholder="you@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-4">اختر طريقة الدفع</h2>
              <div className="space-y-2">
                {paymentMethods.map((m) => (
                  <label
                    key={m.name}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer border transition ${
                      method === m.name
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface-2 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="method"
                        checked={method === m.name}
                        onChange={() => setMethod(m.name)}
                        className="accent-primary"
                      />
                      <div>
                        <div className="font-bold text-sm">{m.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{m.number}</div>
                      </div>
                    </div>
                    {m.tax && (
                      <span className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-bold">
                        + ضريبة 20%
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-surface-2 text-xs text-muted-foreground">
                💳 قم بتحويل المبلغ إلى {selected.name} على الرقم:
                <span className="text-primary font-bold mx-1" dir="ltr">{selected.number}</span>
                ثم ارفع صورة الإيصال.
              </div>
            </div>

            {/* Proof upload */}
            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-1">صورة إثبات الدفع</h2>
              <p className="text-xs text-muted-foreground mb-3">
                مطلوبة لإكمال الطلب — من الاستوديو أو الملفات.
              </p>
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                  proof ? "border-green-500/50 bg-green-500/5" : "border-border hover:border-primary/50"
                }`}>
                  {proof ? (
                    <div className="flex flex-col items-center gap-2">
                      <Check className="w-8 h-8 text-green-400" />
                      <div className="font-bold text-sm">{proof.name}</div>
                      <div className="text-xs text-muted-foreground">اضغط للتغيير</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <div className="font-bold text-sm">اضغط لرفع الصورة</div>
                      <div className="text-xs text-muted-foreground">PNG / JPG</div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Summary */}
          <aside className="card-neon rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h2 className="font-black text-lg mb-4">ملخص الطلب</h2>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {items.map((i) => (
                <div key={i.product.id} className="flex justify-between text-xs">
                  <span className="line-clamp-1 flex-1 ml-2">{i.product.name} × {i.qty}</span>
                  <span className="font-bold shrink-0">{formatIQD(i.product.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm pt-3 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع</span>
                <span className="font-bold">{formatIQD(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-yellow-400">
                  <span>ضريبة (20%)</span>
                  <span className="font-bold">{formatIQD(tax)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-lg font-black mt-3 pt-3 border-t border-border">
              <span>الإجمالي</span>
              <span className="text-primary text-glow">{formatIQD(total)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60"
            >
              {submitting ? "جاري الإرسال…" : "إرسال الطلب"}
            </button>
          </aside>
        </form>
      </Container>
    </Layout>
  );
}
