import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useCart, useMyOrderIds } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import { notifyAdminNewOrder } from "@/lib/notify-order.functions";



export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "إتمام الطلب — FPI STOR" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const nav = useNavigate();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const addId = useMyOrderIds((s) => s.addId);
  const paymentMethods = useCatalog((s) => s.paymentMethods);

  const [methodId, setMethodId] = useState<string>("");
  const [proof, setProof] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!methodId && paymentMethods[0]) setMethodId(paymentMethods[0].id);
  }, [paymentMethods, methodId]);

  const subtotal = items.reduce((a, i) => a + i.qty * i.product.price, 0);
  const selected = paymentMethods.find((m) => m.id === methodId);
  const tax = selected?.tax ? subtotal * selected.tax : 0;
  const total = subtotal + tax;

  if (items.length === 0)
    return (
      <Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black mb-2">لا توجد منتجات للدفع</h1>
        </Container>
      </Layout>
    );

  const copyNumber = async (n: string) => {
    try {
      await navigator.clipboard.writeText(n);
      toast.success("تم نسخ الرقم");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return toast.error("الرجاء إدخال الاسم ورقم الهاتف");
    if (!selected) return toast.error("اختر طريقة الدفع");
    if (!proof) return toast.error("الرجاء رفع صورة إثبات الدفع لإكمال الطلب");
    setSubmitting(true);
    try {
      const orderId = crypto.randomUUID();

      let proofUrl: string | null = null;
      try {
        proofUrl = await uploadImage(proof, "payment-proofs");
      } catch (upErr: any) {
        throw new Error("فشل رفع إثبات الدفع: " + (upErr?.message || ""));
      }

      const { error } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || null,
          delivery_info: `طريقة الدفع: ${selected.name}`,
          payment_method_name: selected.name,
          payment_proof_url: proofUrl,
          total,
          status: "pending",
        } as any);
      if (error) throw error;

      const rows = items.map((i) => ({
        order_id: orderId,
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.qty,
        unit_price: i.product.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(rows);
      if (itemsError) throw itemsError;

      // التسليم التلقائي من مخزون الحسابات (إن توفّر)
      let autoDelivered = false;
      try {
        const { data: delivered } = await supabase.rpc("auto_deliver_order" as any, { _order_id: orderId });
        autoDelivered = delivered === true;
      } catch {
        autoDelivered = false;
      }

      addId(orderId);
      clear();


      // إشعار الأدمن على تلغرام (لا يوقف نجاح الطلب في حال الفشل)
      notifyAdminNewOrder({
        data: {
          orderId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || null,
          paymentMethod: selected.name,
          total,
          items: items.map((i) => ({
            name: i.product.name,
            qty: i.qty,
            price: i.product.price,
          })),
          proofUrl,
        },
      }).catch(() => {});

      // إشعار بالإيميل للإدارة بالطلب الجديد (لا يوقف نجاح الطلب في حال الفشل)
      fetch("/api/public/new-order-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});


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
            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-4">معلومات الزبون</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم الكامل</label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none"
                    placeholder="اسمك الكامل" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">رقم الهاتف</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                    inputMode="numeric" pattern="[0-9]*" type="tel" autoComplete="tel"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none"
                    placeholder="07XXXXXXXXX" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    البريد الإلكتروني <span className="opacity-60">(اختياري)</span>
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none"
                    placeholder="you@example.com" dir="ltr" />
                </div>
              </div>
            </div>

            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-4">اختر طريقة الدفع</h2>
              <div className="space-y-2">
                {paymentMethods.map((m) => (
                  <label key={m.id}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer border transition ${
                      methodId === m.id ? "border-primary bg-primary/10" : "border-border bg-surface-2 hover:border-primary/50"
                    }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="method" checked={methodId === m.id}
                        onChange={() => setMethodId(m.id)} className="accent-primary" />
                      {m.image_url ? (
                        <img src={m.image_url} alt={m.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-lg">💳</div>
                      )}
                      <div>
                        <div className="font-bold text-sm">{m.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{m.number}</div>
                      </div>
                    </div>
                    {m.tax ? (
                      <span className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-bold">
                        + ضريبة {Math.round(m.tax * 100)}%
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>

              {selected && (
                <div className="mt-4 p-4 rounded-xl bg-surface-2 border border-primary/30 space-y-3">
                  <div className="text-xs text-muted-foreground">حوّل المبلغ إلى:</div>
                  <div className="flex items-center gap-3">
                    {selected.image_url && (
                      <img src={selected.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-primary">{selected.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-black tracking-wide" dir="ltr">{selected.number}</span>
                        <button type="button" onClick={() => copyNumber(selected.number)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-primary text-primary-foreground font-bold">
                          <Copy className="w-3 h-3" /> نسخ
                        </button>
                      </div>
                    </div>
                  </div>
                  {selected.note && (
                    <div className="text-xs text-yellow-400">📌 {selected.note}</div>
                  )}
                </div>
              )}
            </div>

            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-1">صورة إثبات الدفع</h2>
              <p className="text-xs text-muted-foreground mb-3">
                مطلوبة لإكمال الطلب — من الاستوديو أو الملفات.
              </p>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setProof(e.target.files?.[0] || null)} />
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
                  <span>ضريبة</span>
                  <span className="font-bold">{formatIQD(tax)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-lg font-black mt-3 pt-3 border-t border-border">
              <span>الإجمالي</span>
              <span className="text-primary text-glow">{formatIQD(total)}</span>
            </div>
            <button type="submit" disabled={submitting}
              className="mt-5 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
              {submitting ? "جاري الإرسال…" : "إرسال الطلب"}
            </button>
          </aside>
        </form>
      </Container>
    </Layout>
  );
}
