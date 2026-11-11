import { t, useLanguage, locale, pageMeta } from "@/lib/i18n";
import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid, SkeletonCards } from "@/components/Skeleton";
import { reviews as staticReviews, listableProducts } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { ArrowLeft, Star, Zap, Shield, Clock, Search } from "lucide-react";
import { ListChecks } from "lucide-react";
import { HowToBuySection } from "@/components/HowToBuySection";
import heroImg from "@/assets/hero-gaming.jpg";
export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            { title: "FPI STOR | متجر اف بي اي - متجر رقمي عراقي" },
            { name: "description", content: "متجر FPI STOR (متجر اف بي اي) لبيع الاشتراكات الرقمية والحسابات والألعاب بأفضل الأسعار في العراق." },
            { name: "keywords", content: "fpistor, fpistor.com, FPI STOR, متجر اف بي اي, اف بي اي ستور, اشتراكات رقمية" },
            { property: "og:title", content: "FPI STOR | متجر اف بي اي - متجر رقمي عراقي" },
            { property: "og:description", content: "متجر FPI STOR (متجر اف بي اي) لبيع الاشتراكات الرقمية والحسابات والألعاب بأفضل الأسعار في العراق." },
            { property: "og:url", content: "https://fpistor.com/" },
        ],
        links: [{ rel: "canonical", href: "https://fpistor.com/" }],
    }),
    component: Home,
});
function Home() {
    useLanguage();
    const [showAllReviews, setShowAllReviews] = useState(false);
    const ready = useCatalog((s) => s.ready);
    const catalogError = useCatalog((s) => s.error);
    const refreshCatalog = useCatalog((s) => s.refresh);
    const products = useCatalog((s) => s.products);
    const categories = useCatalog((s) => s.categories);
    const storeImages = useCatalog((s) => s.storeImages);
    const dbReviews = useCatalog((s) => s.reviews);
    const settings = useCatalog((s) => s.settings);
    const featured = useMemo(() => listableProducts(products).filter((p) => p.isFeatured), [products]);
    const bestsellers = useMemo(() => featured.slice(0, 8), [featured]);
    const newArrivals = useMemo(() => featured.slice(0, 8), [featured]);
    const allReviews = useMemo(() => [
        ...dbReviews.map((r) => ({ name: r.customer_name, text: r.comment || "", rating: r.rating, product: r.product_name })),
        ...(dbReviews.length === 0 ? staticReviews.map((r) => ({ ...r, product: null as string | null })) : []),
    ].slice(0, 8), [dbReviews]);
    const displayedReviews = useMemo(() => (showAllReviews ? allReviews : allReviews.slice(0, 3)), [allReviews, showAllReviews]);
    return (<Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40"/>
        <div className="absolute inset-0 opacity-30 bg-cover bg-center" style=/>
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background"/>
        <Container className="relative py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-xs text-primary font-bold mb-5">
              <Zap className="w-3.5 h-3.5"/>{t(" \u062A\u0633\u0644\u064A\u0645 \u0641\u0648\u0631\u064A \u2022 \u062E\u062F\u0645\u0629 24/7 ")}</div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">{t(" \u0645\u062A\u062C\u0631\u0643 \u0627\u0644\u0631\u0642\u0645\u064A ")}<br />
              <span className="text-primary text-glow">{t("\u0641\u064A \u0627\u0644\u0639\u0631\u0627\u0642")}</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{t(" \u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A\u060C \u062D\u0633\u0627\u0628\u0627\u062A\u060C \u0623\u0644\u0639\u0627\u0628\u060C \u0643\u0641\u062A \u0643\u0627\u0631\u062F \u0648\u062E\u062F\u0645\u0627\u062A \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u2014 \u0628\u0627\u0644\u062F\u064A\u0646\u0627\u0631 \u0627\u0644\u0639\u0631\u0627\u0642\u064A \u0648\u0628\u0623\u0641\u0636\u0644 \u0627\u0644\u0623\u0633\u0639\u0627\u0631. ")}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/categories" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow inline-flex items-center gap-2">{t(" \u062A\u0635\u0641\u062D \u0627\u0644\u0645\u062A\u062C\u0631 ")}<ArrowLeft className="w-4 h-4"/>
              </Link>
              <Link to="/search" className="px-6 py-3 rounded-xl bg-surface border border-border font-bold inline-flex items-center gap-2 hover:border-primary/50 transition">
                <Search className="w-4 h-4"/>{t(" \u0628\u062D\u062B ")}</Link>
              <a href="#how-to-buy" onClick= className="px-6 py-3 rounded-xl bg-surface border border-border font-bold inline-flex items-center gap-2 hover:border-primary/50 transition">
                <ListChecks className="w-4 h-4"/>{t(" \u062F\u0644\u064A\u0644 \u0627\u0644\u0634\u0631\u0627\u0621 ")}</a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
              
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-12">
        <Container>
          
          <SectionHeader title={t("أقسام المتجر")} subtitle={t("اختر ما يناسبك من فئات متنوعة")}/>
          
        </Container>
      </section>

      {/* Promo banner */}
      





      {/* Bestsellers */}
      <section className="py-10">
        <Container>
          <SectionHeader title={t("الأكثر مبيعاً")} subtitle={t("المنتجات المفضلة لدى عملائنا")}/>
          
        </Container>
      </section>

      {/* New arrivals */}
      <section className="py-10">
        <Container>
          <SectionHeader title={t("وصل حديثاً")} subtitle={t("أحدث المنتجات في المتجر")}/>
          
        </Container>
      </section>


      {/* Reviews */}
      <HowToBuySection />

      <section className="py-14 border-t border-border bg-surface/40">
        <Container>
          <SectionHeader title={t("آراء عملائنا")} subtitle={t("ثقتك شرفنا")}/>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            
          </div>
          <div className="text-center mt-6">
            <button type="button" onClick= className="px-6 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl font-medium transition-all duration-200">
              
            </button>
          </div>
        </Container>
      </section>
    </Layout>);
}
function SectionHeader({ title, subtitle }: {
    title: string;
    subtitle?: string;
}) {
    useLanguage();
    return (<div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black"></h2>
          
        </div>
        <div className="h-1 flex-1 max-w-40 bg-gradient-to-l from-primary to-transparent rounded-full hidden md:block"/>
      </div>
    </div>);
}
