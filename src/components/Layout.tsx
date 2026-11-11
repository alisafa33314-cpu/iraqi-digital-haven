import { LanguageSwitch } from "@/components/LanguageSwitch";
import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Search, Menu, X, MessageCircle, Send, LogOut, Package } from "lucide-react";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { useCatalog } from "@/lib/catalog";
import { useSession, signOutCustomer } from "@/lib/auth";
import { GoogleIcon } from "@/components/GoogleIcon";
export function Layout({ children }: {
    children: ReactNode;
}) {
    useLanguage();
    const [open, setOpen] = useState(false);
    const count = useCart((s) => s.items.reduce((a, i) => a + i.qty, 0));
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const categories = useCatalog((s) => s.categories);
    const nav = [
        { to: "/", label: "الرئيسية" },
        { to: "/categories", label: "الأقسام" },
        { to: "/how-to-buy", label: "دليل الشراء" },
        { to: "/orders", label: "طلباتي" },
        { to: "/admin", label: "الإدارة" },
    ];
    return (<div className="min-h-screen flex flex-col">
      <LanguageSwitch />
      {/* Announcement bar */}
      <MarqueeBar />


      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/90 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-lg shadow-glow btn-glow">
              F
            </div>
            <div className="leading-tight">
              <div className="font-black text-lg text-glow">FPI STOR</div>
              <div className="text-[10px] text-muted-foreground">{t("\u0645\u062A\u062C\u0631 \u0631\u0642\u0645\u064A \u0639\u0631\u0627\u0642\u064A")}</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => (<Link key={n.to} to={n.to} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${pathname === n.to
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}>
                {t(n.label ?? "")}
              </Link>))}
          </nav>

          <div className="flex items-center gap-2">
            <AuthMenu />
            <Link to="/search" className="w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition" aria-label={t("بحث")}>
              <Search className="w-4 h-4"/>
            </Link>
            <Link to="/cart" className="relative w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition" aria-label={t("السلة")}>
              <ShoppingCart className="w-4 h-4"/>
              {count > 0 && (<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>)}
            </Link>
            <button onClick={() => setOpen(true)} className="lg:hidden w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center" aria-label={t("القائمة")}>
              <Menu className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (<div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85%] bg-background border-l border-border p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="font-black text-lg text-glow">FPI STOR</div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg bg-surface">
                <X className="w-4 h-4 mx-auto"/>
              </button>
            </div>
            <div className="space-y-1">
              {nav.map((n) => (<Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block px-3 py-3 rounded-lg hover:bg-surface font-medium">
                  {t(n.label ?? "")}
                </Link>))}
            </div>
            <DrawerAuthRow onNavigate={() => setOpen(false)}/>
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-xs text-muted-foreground mb-3">{t("\u0627\u0644\u0623\u0642\u0633\u0627\u0645")}</div>
              <div className="space-y-1">
                {categories.map((c) => (<Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface text-sm">
                    <span className="text-lg">{c.icon}</span>
                    <span>{t(c.name ?? "")}</span>
                  </Link>))}
              </div>
            </div>
          </div>
        </div>)}

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
            <p className="text-sm text-muted-foreground leading-relaxed">{t(" \u0645\u062A\u062C\u0631\u0643 \u0627\u0644\u0639\u0631\u0627\u0642\u064A \u0627\u0644\u0623\u0648\u0644 \u0644\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0648\u0627\u0644\u0623\u0644\u0639\u0627\u0628 \u0648\u0628\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u0647\u062F\u0627\u064A\u0627. \u062A\u0633\u0644\u064A\u0645 \u0641\u0648\u0631\u064A \u0648\u0623\u0633\u0639\u0627\u0631 \u0645\u0646\u0627\u0641\u0633\u0629. ")}</p>
          </div>
          <div>
            <div className="font-bold mb-3">{t("\u0631\u0648\u0627\u0628\u0637 \u0633\u0631\u064A\u0639\u0629")}</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/" className="block hover:text-primary">{t("\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629")}</Link>
              <Link to="/categories" className="block hover:text-primary">{t("\u0627\u0644\u0623\u0642\u0633\u0627\u0645")}</Link>
              <Link to="/orders" className="block hover:text-primary">{t("\u0637\u0644\u0628\u0627\u062A\u064A")}</Link>
              <Link to="/how-to-buy" className="block hover:text-primary">{t("دليل الشراء")}</Link>
              <Link to="/cart" className="block hover:text-primary">{t("\u0627\u0644\u0633\u0644\u0629")}</Link>
            </div>
          </div>
          <div>
            <div className="font-bold mb-3">{t("\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A")}</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <a href="https://wa.me/9647770586502" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:btn-glow transition">
                <MessageCircle className="w-4 h-4"/>{t(" \u062A\u0648\u0627\u0635\u0644 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 ")}</a>
              <div className="text-xs">{t("\u0648\u0627\u062A\u0633\u0627\u0628: 07770586502")}</div>
            </div>
          </div>
          <div>
            <div className="font-bold mb-3">{t("\u062A\u0627\u0628\u0639\u0646\u0627")}</div>
            <SocialsFooter />
          </div>

        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}{t(" FPI STOR \u2014 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629 ")}</div>
      </footer>

      {/* Floating action buttons: dynamic socials */}
      <SocialsFloating />

    </div>);
}
function MarqueeBar() {
    useLanguage();
    const settings = useCatalog((s) => s.settings);
    const enabled = settings["marquee_enabled"] !== "false";
    let items: string[] = [];
    try {
        items = JSON.parse(settings["marquee_items"] || "[]");
        if (!Array.isArray(items))
            items = [];
    }
    catch {
        items = [];
    }
    if (!enabled || items.length === 0)
        return null;
    return (<div className="bg-primary/10 border-b border-primary/20 text-xs overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee py-2">
        {Array.from({ length: 2 }).map((_, i) => (<div key={i} className="flex gap-8 px-4 shrink-0">
            {items.map((item, j) => <span key={j}>{t(item)}</span>)}
          </div>))}
      </div>
    </div>);
}
function SocialsFooter() {
    useLanguage();
    const socials = useCatalog((s) => s.socials);
    if (socials.length === 0) {
        return (<div className="text-sm text-muted-foreground space-y-2">
        <div>{t("\u0648\u0627\u062A\u0633\u0627\u0628: 07770586502")}</div>
        <div>{t("\u062A\u0644\u064A\u062C\u0631\u0627\u0645: @FPI101")}</div>
      </div>);
    }
    return (<div className="flex flex-wrap gap-2">
      {socials.map((s) => (<a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border hover:border-primary/50 text-xs">
          {s.image_url ? (<img loading="lazy" decoding="async" src={s.image_url} alt="" className="w-5 h-5 rounded object-cover"/>) : (<MessageCircle className="w-4 h-4"/>)}
          {t(s.name ?? "")}
        </a>))}
    </div>);
}
function SocialsFloating() {
    useLanguage();
    const socials = useCatalog((s) => s.socials);
    const list = socials.length > 0 ? socials : [
        { id: "wa", name: "واتساب", url: "https://wa.me/9647770586502", image_url: null as string | null },
        { id: "tg", name: "تليجرام", url: "https://t.me/FPI101", image_url: null as string | null },
    ];
    return (<div className="fixed bottom-5 left-5 z-30 flex flex-col gap-3">
      {list.map((s) => (<a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={t(s.name ?? "")} className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center overflow-hidden border-2 border-white/20">
          {s.image_url ? (<img loading="lazy" decoding="async" src={s.image_url} alt={t(s.name ?? "")} className="w-full h-full object-cover"/>) : s.name.includes(t("تليجرام")) || /telegram/i.test(s.url) ? (<Send className="w-6 h-6 text-white"/>) : (<MessageCircle className="w-6 h-6 text-white"/>)}
        </a>))}
    </div>);
}
// Session-aware auth control: sign-in with Google when signed out,
// avatar + account menu when signed in.
function AuthMenu() {
    useLanguage();
    const user = useSession((s) => s.user);
    const ready = useSession((s) => s.ready);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    if (!ready) {
        return <div className="w-10 h-10 rounded-lg bg-surface skeleton" aria-hidden="true"/>;
    }
    if (!user) {
        return (<Link to="/auth" className="inline-flex items-center justify-center sm:justify-start gap-2 h-10 w-10 sm:w-auto px-0 sm:px-3 shrink-0 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:btn-glow transition" aria-label={t("تسجيل الدخول")}>
        <GoogleIcon className="w-4 h-4 shrink-0"/><span className="hidden sm:inline">{t(" \u062F\u062E\u0648\u0644 ")}</span></Link>);
    }
    const logout = async () => {
        setOpen(false);
        await signOutCustomer();
        toast.success(t("تم تسجيل الخروج"));
        navigate({ to: "/" });
    };
    return (<div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center overflow-hidden border border-border transition" aria-label={t("حسابي")}>
        {user.avatarUrl ? (<img loading="lazy" decoding="async" src={user.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer"/>) : (<span className="font-bold text-sm">{(user.name || user.email || t("؟")).charAt(0)}</span>)}
      </button>
      {open && (<>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute left-0 top-12 z-50 w-56 card-neon rounded-xl p-3 space-y-1 shadow-lg">
            <div className="px-2 pb-2 border-b border-border mb-1">
              <div className="font-bold text-sm truncate">{user.name || t("مستخدم")}</div>
              <div className="text-[11px] text-muted-foreground truncate" dir="ltr">{user.email}</div>
            </div>
            <Link to="/orders" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-2 font-medium">
              <Package className="w-4 h-4"/>{t(" \u0637\u0644\u0628\u0627\u062A\u064A ")}</Link>
            <button type="button" onClick={logout} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-2 text-destructive font-medium">
              <LogOut className="w-4 h-4"/>{t(" \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C ")}</button>
          </div>
        </>)}
    </div>);
}
function DrawerAuthRow({ onNavigate }: {
    onNavigate: () => void;
}) {
    useLanguage();
    const user = useSession((s) => s.user);
    if (user) {
        return (<Link to="/orders" onClick={onNavigate} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface font-medium">
        {user.avatarUrl ? (<img loading="lazy" decoding="async" src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer"/>) : (<span className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold">
            {(user.name || user.email || t("؟")).charAt(0)}
          </span>)}
        <span className="truncate">{user.name || user.email}</span>
      </Link>);
    }
    return (<Link to="/auth" onClick={onNavigate} className="mt-3 inline-flex items-center gap-2 w-full px-3 py-3 rounded-lg bg-primary text-primary-foreground font-bold justify-center">
      <GoogleIcon className="w-4 h-4"/>{t(" \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 \u062C\u0648\u062C\u0644 ")}</Link>);
}
export function Container({ children, className = "" }: {
    children: ReactNode;
    className?: string;
}) {
    useLanguage();
    return <div className={`container mx-auto px-4 ${className}`}>{children}</div>;
}
