import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { record } = await req.json();

    // قراءة بيانات الطلب الجديد
    const customerEmail = record.customer_email || record.email;
    const subscriptionDetails = record.subscription_details || record.code || record.details;
    const productName = record.product_name || "اشتراك جديد";

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "No email provided" }), { status: 400 });
    }

    // إرسال البريد عبر Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "FPI STOR <onboarding@resend.dev>",
        to: [customerEmail],
        subject: `تفاصيل اشتراكك - FPI STOR`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; border-radius: 10px;">
            <h2 style="color: #38bdf8;">شكراً لشرائك من FPI STOR! 🎉</h2>
            <p>تم تسجيل طلبك بنجاح. تجد أدناه تفاصيل اشتراكك:</p>
            
            <div style="background-color: #1e293b; border: 1px solid #334155; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #f1f5f9;">المنتج: ${productName}</h3>
              <p style="font-size: 16px; font-weight: bold; color: #4ade80; word-break: break-all;">
                ${subscriptionDetails}
              </p>
            </div>

            <p style="font-size: 14px; color: #94a3b8;">
              💡 يمكنك أيضاً الوصول إلى بيانات اشتراكك في أي وقت من خلال زيارة قسم <b>طلباتي</b> في الموقع.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
