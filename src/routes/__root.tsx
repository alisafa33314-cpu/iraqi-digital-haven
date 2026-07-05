import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-primary text-glow">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها لم يتم العثور عليها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground btn-glow"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">حدث خطأ في تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          حاول تحديث الصفحة أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            حاول مجدداً
          </button>
          <a href="/" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium">
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FPI STOR — متجر الاشتراكات والألعاب في العراق" },
      { name: "description", content: "متجر FPI STOR الرقمي: اشتراكات، حسابات، ألعاب، كفت كارد وخدمات ذكاء اصطناعي بالدينار العراقي. تسليم فوري." },
      { name: "author", content: "FPI STOR" },
      { property: "og:title", content: "FPI STOR — متجر الاشتراكات والألعاب في العراق" },
      { property: "og:description", content: "متجر FPI STOR الرقمي: اشتراكات، حسابات، ألعاب، كفت كارد وخدمات ذكاء اصطناعي بالدينار العراقي. تسليم فوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FPI STOR — متجر الاشتراكات والألعاب في العراق" },
      { name: "twitter:description", content: "متجر FPI STOR الرقمي: اشتراكات، حسابات، ألعاب، كفت كارد وخدمات ذكاء اصطناعي بالدينار العراقي. تسليم فوري." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/9m3Vaanu4KOhsp84RUkn0aFSunm2/social-images/social-1783263600268-1000030354.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/9m3Vaanu4KOhsp84RUkn0aFSunm2/social-images/social-1783263600268-1000030354.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" theme="dark" richColors dir="rtl" />
    </QueryClientProvider>
  );
}
