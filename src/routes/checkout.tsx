import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { useCart, useMyOrderIds, useCustomerInfo } from "@/lib/cart";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Check, Copy } from "lucide-react";
import { cloud as supabase } from "@/lib/cloud-client";
import { uploadPaymentProof } from "@/lib/upload";
import { checkBlocked } from "@/lib/blocked.functions";
import { useSession, signInWithGoogle } from "@/lib/auth";
import { GoogleIcon } from "@/components/GoogleIcon";
export const Route = createFileRoute("/checkout")({
    head: () => ({ meta: [{ title: "إتمام الطلب — FPI STOR" }] }),
    component: CheckoutPage,
});
function CheckoutPage() {
    useLanguage();
    const nav = useNavigate();
    const items = useCart((s) => s.items);
    const clear = useCart((s) => s.clear);
    const addId = useMyOrderIds((s) => s.addId);
    const paymentMethods = useCatalog((s) => s.paymentMethods);
    const savedInfo = useCustomerInfo((s) => s.info);
    const saveInfo = useCustomerInfo((s) => s.save);
    const clearInfo = useCustomerInfo((s) => s.clearInfo);
    const user = useSession((s) => s.user);
    const [methodId, setMethodId] = useState<string>("");
    const [proof, setProof] = useState<File | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [autofilled, setAutofilled] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const handleGoogle = async () => {
        if (googleBusy)
            return;
        setGoogleBusy(true);
        try {
            const r = await signInWithGoogle();
            if (!r.redirected)
                toast.success(t("تم تسجيل الدخول"));
        }
        catch (err: any) {
            toast.error(t("فشل تسجيل الدخول: " + (err?.message || "")));
        }
        finally {
            setGoogleBusy(false);
        }
    };
    useEffect(() => {
        if (!methodId && paymentMethods[0])
            setMethodId(paymentMethods[0].id);
    }, [paymentMethods, methodId]);
    // تعبئة تلقائية من البيانات المحفوظة في المتصفح
    useEffect(() => {
        if (!savedInfo)
            return;
        if (name || phone || email)
            return;
        setName(savedInfo.name || "");
        setPhone(savedInfo.phone || "");
        setEmail(savedInfo.email || "");
        if (savedInfo.name || savedInfo.phone)
            setAutofilled(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedInfo]);
    // تعبئة تلقائية من حساب الزبون المسجّل (جوجل)
    useEffect(() => {
        if (!user)
            return;
        setName((n) => n || user.name || "");
        setEmail((e) => e || user.email || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);
    const subtotal = items.reduce((a, i) => a + i.qty * i.product.price, 0);
    const selected = paymentMethods.find((m) => m.id === methodId);
    const tax = selected?.tax ? subtotal * selected.tax : 0;
    const total = subtotal + tax;
    if (items.length === 0)
        return (<Layout>
        <Container className="py-20 text-center">
          <h1 className="text-2xl font-black mb-2">{t("\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A \u0644\u0644\u062F\u0641\u0639")}</h1>
        </Container>
      </Layout>);
    const copyNumber = async (n: string) => {
        try {
            await navigator.clipboard.writeText(n);
            toast.success(t("تم نسخ الرقم"));
        }
        catch {
            toast.error(t("تعذر النسخ"));
        }
    };
    // جلب عنوان IP الزبون من خدمة خارجية (احتياطي إن لم يتوفر من السيرفر)
    const fetchPublicIp = async (): Promise<string | null> => {
        const sources = [
            { url: "https://api.ipify.org?format=json", pick: (j: any) => j?.ip },
            { url: "https://ipapi.co/json/", pick: (j: any) => j?.ip },
        ];
        for (const s of sources) {
            try {
                const ctl = new AbortController();
                const t = setTimeout(() => ctl.abort(), 4000);
                const res = await fetch(s.url, { signal: ctl.signal });
                clearTimeout(t);
                if (!res.ok)
                    continue;
                const ip = s.pick(await res.json());
                if (typeof ip === "string" && ip.trim())
                    return ip.trim();
            }
            catch {
                /* try next */
            }
        }
        return null;
    };
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim())
            return toast.error(t("الرجاء إدخال الاسم ورقم الهاتف"));
        if (!selected)
            return toast.error(t("اختر طريقة الدفع"));
        if (!proof)
            return toast.error(t("الرجاء رفع صورة إثبات الدفع لإكمال الطلب"));
        setSubmitting(true);
        try {
            // فحص الحظر (مرن: لا يوقف الطلب إذا فشل جلب الـ IP أو الفحص)
            let clientIp: string | null = null;
            try {
                clientIp = await fetchPublicIp();
            }
            catch {
                clientIp = null;
            }
            try {
                const guard = await checkBlocked({
                    data: { phone: phone.trim(), email: email.trim() || null, ip: clientIp },
                });
                if (guard?.blocked) {
                    toast.error(t("عذراً، لا يمكنك إتمام الطلب"));
                    setSubmitting(false);
                    return;
                }
                clientIp = guard?.ip || clientIp;
            }
            catch {
                /* تجاهل فشل الفحص ومتابعة إنشاء الطلب */
            }
            const orderId = crypto.randomUUID();
            let proofUrl: string | null = null;
            try {
                proofUrl = await uploadPaymentProof(proof);
            }
            catch (upErr: any) {
                throw new Error("فشل رفع إثبات الدفع: " + (upErr?.message || ""));
            }
            const { error } = await supabase
                .from("orders")
                .insert({
                id: orderId,
                user_id: user?.id ?? null,
                customer_name: name.trim(),
                customer_phone: phone.trim(),
                customer_email: email.trim() || null,
                customer_ip: clientIp,
                delivery_info: `طريقة الدفع: ${selected.name}`,
                payment_method_name: selected.name,
                payment_proof_url: proofUrl,
                total,
                status: "pending",
            } as any);
            if (error)
                throw error;
            const rows = items.map((i) => ({
                order_id: orderId,
                product_id: i.product.id,
                product_name: i.product.name,
                quantity: i.qty,
                unit_price: i.product.price,
            }));
            const { error: itemsError } = await supabase.from("order_items").insert(rows);
            if (itemsError)
                throw itemsError;
            // التسليم التلقائي من مخزون الحسابات (إن توفّر)
            let autoDelivered = false;
            try {
                const { data: delivered } = await supabase.rpc("auto_deliver_order" as any, { _order_id: orderId });
                autoDelivered = delivered === true;
            }
            catch {
                autoDelivered = false;
            }
            addId(orderId);
            clear();
            saveInfo({ name: name.trim(), phone: phone.trim(), email: email.trim() });
            console.info(`[notify] order ${orderId} saved — admin notifications dispatched by database trigger`);
            toast.success(t(autoDelivered
                ? "تم إتمام طلبك وتسليم الحساب تلقائياً — تفقّد صفحة طلباتي"
                : "تم إرسال طلبك بنجاح — الحالة: قيد التنفيذ"));
            nav({ to: "/orders" });
        }
        catch (err: any) {
            const msg = String(err?.message || "");
            if (/row-level security|violates row-level|order_rejected/i.test(msg)) {
                toast.error(t("عذراً، لا يمكنك إتمام الطلب"));
            }
            else {
                toast.error(t("فشل إرسال الطلب: " + (msg || "خطأ")));
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-6">{t("\u0625\u062A\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628")}</h1>
        <form onSubmit= className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="card-neon rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-black">{t("\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0632\u0628\u0648\u0646")}</h2>
                
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644")}</label>
                  <input value= onChange= className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none" placeholder={t("اسمك الكامل")}/>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641")}</label>
                  <input value= onChange= inputMode="numeric" pattern="[0-9]*" type="tel" autoComplete="tel" className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none" placeholder="07XXXXXXXXX" dir="ltr"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">{t(" \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A ")}<span className="opacity-60">{t("(\u0627\u062E\u062A\u064A\u0627\u0631\u064A)")}</span>
                  </label>
                  <input type="email" value= onChange= className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 focus:border-primary outline-none" placeholder="you@example.com" dir="ltr"/>
                </div>
              </div>
              
            </div>


            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-4">{t("\u0627\u062E\u062A\u0631 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639")}</h2>
              <div className="space-y-2">
                
              </div>

              
            </div>

            <div className="card-neon rounded-2xl p-5">
              <h2 className="font-black mb-1">{t("\u0635\u0648\u0631\u0629 \u0625\u062B\u0628\u0627\u062A \u0627\u0644\u062F\u0641\u0639")}</h2>
              <p className="text-xs text-muted-foreground mb-3">{t(" \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u2014 \u0645\u0646 \u0627\u0644\u0627\u0633\u062A\u0648\u062F\u064A\u0648 \u0623\u0648 \u0627\u0644\u0645\u0644\u0641\u0627\u062A. ")}</p>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange=/>
                <div className=>
                  
                </div>
              </label>
            </div>
          </div>

          <aside className="card-neon rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h2 className="font-black text-lg mb-4">{t("\u0645\u0644\u062E\u0635 \u0627\u0644\u0637\u0644\u0628")}</h2>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              
            </div>
            <div className="space-y-2 text-sm pt-3 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("\u0627\u0644\u0645\u062C\u0645\u0648\u0639")}</span>
                <span className="font-bold"></span>
              </div>
              
            </div>
            <div className="flex justify-between text-lg font-black mt-3 pt-3 border-t border-border">
              <span>{t("\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A")}</span>
              <span className="text-primary text-glow"></span>
            </div>
            <button type="submit" disabled= className="mt-5 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold btn-glow disabled:opacity-60">
              
            </button>
          </aside>
        </form>
      </Container>
    </Layout>);
}
