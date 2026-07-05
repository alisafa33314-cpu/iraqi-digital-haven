import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Search, Menu, X, MessageCircle, Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog";

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.items.reduce((a, i) => a + i.qty, 0));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/", label: "الرئيسية" },
    { to: "/categories", label: "الأقسام" },
    { to: "/orders", label: "طلباتي" },
    { to: "/admin", label: "الإدارة" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Announcement bar */}
      <div className="bg-primary/10 border-b border-primary/20 text-xs overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee py-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-8 px-4 shrink-0">
              <span>⚡ تسليم فوري خلال دقائق</span>
              <span>🔥 عروض على كيم باس</span>
              <span>🎮 حسابات ستيم بأسعار منافسة</span>
              <span>💳 4 طرق دفع مختلفة</span>
              <span>🇮🇶 خدمة داخل العراق</span>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-lg shadow-glow btn-glow">
              F
            </div>
            <div className="leading-tight">
              <div className="font-black text-lg text-glow">FPI STOR</div>
              <div className="text-[10px] text-muted-foreground">متجر رقمي عراقي</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  pathname === n.to
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/search"
              className="w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition"
              aria-label="بحث"
            >
              <Search className="w-4 h-4" />
            </Link>
            <Link
              to="/cart"
              className="relative w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition"
              aria-label="السلة"
            >
              <ShoppingCart className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center"
              aria-label="القائمة"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85%] bg-background border-l border-border p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="font-black text-lg text-glow">FPI STOR</div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg bg-surface"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>
            <div className="space-y-1">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 rounded-lg hover:bg-surface font-medium"
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-xs text-muted-foreground mb-3">الأقسام</div>
              <div className="space-y-1">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface text-sm"
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-surface/50">
        <div className="container mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-black">
                F
              </div>
              <div className="font-black">FPI STOR</div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              متجرك العراقي الأول للاشتراكات الرقمية والألعاب وبطاقات الهدايا. تسليم فوري وأسعار منافسة.
            </p>
          </div>
          <div>
            <div className="font-bold mb-3">روابط سريعة</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/" className="block hover:text-primary">الرئيسية</Link>
              <Link to="/categories" className="block hover:text-primary">الأقسام</Link>
              <Link to="/orders" className="block hover:text-primary">طلباتي</Link>
              <Link to="/cart" className="block hover:text-primary">السلة</Link>
            </div>
          </div>
          <div>
            <div className="font-bold mb-3">التواصل</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>واتساب: 07770586502</div>
              <div>تليجرام: @FPI101</div>
            </div>
          </div>
          <div>
            <div className="font-bold mb-3">طرق الدفع</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["آسيا سيل", "ماستر رافدين", "زين كاش", "USDT"].map((p) => (
                <span key={p} className="px-2.5 py-1 rounded-md bg-surface border border-border">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FPI STOR — جميع الحقوق محفوظة
        </div>
      </footer>

      {/* Floating action buttons */}
      <div className="fixed bottom-5 left-5 z-30 flex flex-col gap-3">
        <a
          href="https://wa.me/9647770586502"
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center animate-pulse-red"
          aria-label="واتساب"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
        <a
          href="https://t.me/FPI101"
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-[#229ED9] shadow-lg flex items-center justify-center"
          aria-label="تليجرام"
        >
          <Send className="w-6 h-6 text-white" />
        </a>
      </div>
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`container mx-auto px-4 ${className}`}>{children}</div>;
}
