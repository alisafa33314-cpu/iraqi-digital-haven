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
        { to: "/orders", label: "طلباتي" },
        { to: "/admin", label: "الإدارة" },
    ];
    return (<div className="min-h-screen flex flex-col">
      <LanguageSwitch />
      {/* Announcement bar */}
      <MarqueeBar />


      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
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
            
          </nav>

          <div className="flex items-center gap-2">
            <AuthMenu />
            <Link to="/search" className="w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition" aria-label={t("بحث")}>
              <Search className="w-4 h-4"/>
            </Link>
            <Link to="/cart" className="relative w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center transition" aria-label={t("السلة")}>
              <ShoppingCart className="w-4 h-4"/>
              
            </Link>
            <button onClick= className="lg:hidden w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center" aria-label={t("القائمة")}>
              <Menu className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      

      <main className="flex-1"></main>

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
          © {t(" FPI STOR \u2014 \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629 ")}</div>
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
        return (<Link to="/auth" className="hidden sm:inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:btn-glow transition" aria-label={t("تسجيل الدخول")}>
        <GoogleIcon className="w-4 h-4"/>{t(" \u062F\u062E\u0648\u0644 ")}</Link>);
    }
    const logout = async () => {
        setOpen(false);
        await signOutCustomer();
        toast.success(t("تم تسجيل الخروج"));
        navigate({ to: "/" });
    };
    return (<div className="relative">
      <button type="button" onClick= className="w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 flex items-center justify-center overflow-hidden border border-border transition" aria-label={t("حسابي")}>
        
      </button>
      
    </div>);
}
function DrawerAuthRow({ onNavigate }: {
    onNavigate: () => void;
}) {
    useLanguage();
    const user = useSession((s) => s.user);
    if (user) {
        return (<Link to="/orders" onClick= className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface font-medium">
        
        <span className="truncate"></span>
      </Link>);
    }
    return (<Link to="/auth" onClick= className="mt-3 inline-flex items-center gap-2 w-full px-3 py-3 rounded-lg bg-primary text-primary-foreground font-bold justify-center">
      <GoogleIcon className="w-4 h-4"/>{t(" \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 \u062C\u0648\u062C\u0644 ")}</Link>);
}
export function Container({ children, className = "" }: {
    children: ReactNode;
    className?: string;
}) {
    useLanguage();
    return <div className=></div>;
}
