import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid, SkeletonCards } from "@/components/Skeleton";
import { reviews as staticReviews, listableProducts } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { ArrowLeft, Star, Zap, Shield, Clock, Search, ChevronDown, ChevronUp } from "lucide-react";
import heroImg from "@/assets/store-editorial.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FPI STOR | متجر اف بي اي - متجر رقمي عراقي" },
      { name: "description", content: "متجر FPI STOR (متجر اف بي اي) لبيع الاشتراكات الرقمية والحسابات والألعاب بأفضل الأسعار في العراق." },
      { name: "keywords", content: "fpistor, fpistor.com, FPI STOR, متجر اف بي اي, اف بي اي ستور, اشتراكات رقمية" },
      { property: "og:title", content: "FPI STOR | متجر اف بي اي - متجر رقمي عراقي" },
      { property: "og:description", content: "متجر FPI STOR (متجر اف بي اي) لبيع الاشتراكات الرقمية والحسابات والألعاب بأفضل الأسعار في العراق." },
      { property: "og:url", content: "https://fpistor.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://fpistor.com/" }],
  }),
  component: Home,
});


function Home() {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const ready = useCatalog((s) => s.ready);
  const catalogError = useCatalog((s) => s.error);
  const refreshCatalog = useCatalog((s) => s.refresh);
  const products = useCatalog((s) => s.products);
  const categories = useCatalog((s) => s.categories);
  
  const dbReviews = useCatalog((s) => s.reviews);
  const settings = useCatalog((s) => s.settings);
  const featured = useMemo(() => listableProducts(products), [products]);
  const bestsellers = useMemo(() => featured.filter((p) => p.bestseller || p.isFeatured).slice(0, 8), [featured]);
  const newArrivals = useMemo(() => featured.filter((p) => p.isNew).slice(0, 8), [featured]);
  const allReviews = useMemo(() => [
    ...dbReviews.map((r) => ({ name: r.customer_name, text: r.comment || "", rating: r.rating, product: r.product_name })),
    ...(dbReviews.length === 0 ? staticReviews.map((r) => ({ ...r, product: null as string | null })) : []),
  ].slice(0, 8), [dbReviews]);
  const displayedReviews = useMemo(
    () => (showAllReviews ? allReviews : allReviews.slice(0, 3)),
    [allReviews, showAllReviews],
  );


  return (
    <Layout>
      <section className="store-hero relative overflow-hidden">
        <img src={heroImg} alt="ترفيه رقمي وألعاب وبطاقات هدايا" width={1536} height={768} fetchPriority="high" />
        <Container className="relative">
          <div className="store-hero-copy">
            <div className="text-sm font-medium mb-4">اشتراكات · ألعاب · بطاقات هدايا</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-5" dir="ltr">FPI STOR</h1>
            <p className="text-base md:text-lg leading-relaxed mb-7">كل ما تحبّه من العالم الرقمي، في مكان واحد. اختر اشتراكك وادفع بالدينار العراقي.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-12 px-6"><Link to="/categories">تسوّق الآن <ArrowLeft className="w-4 h-4" /></Link></Button>
              <Button asChild variant="outline" className="hero-secondary h-12 px-5"><Link to="/search"><Search className="w-4 h-4" /> ابحث عن منتج</Link></Button>
            </div>
          </div>
        </Container>
      </section>
      <div className="border-b border-border bg-surface">
        <Container className="grid grid-cols-3 gap-2 py-4 md:py-5">
          {[{icon: Clock, label: "تسليم رقمي"}, {icon: Shield, label: "دفع بالدينار العراقي"}, {icon: Zap, label: "دعم مباشر"}].map(({icon: Icon, label}) => (
            <div key={label} className="flex flex-col md:flex-row justify-center items-center gap-2 text-xs md:text-sm font-medium"><Icon className="w-4 h-4 text-muted-foreground" />{label}</div>
          ))}
        </Container>
      </div>

      {/* Categories */}
      <section className="py-12">
        <Container>
          {catalogError && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <span>{catalogError}</span>
              <Button type="button" onClick={() => refreshCatalog()} className="font-bold text-primary hover:underline">
                إعادة المحاولة
              </Button>
            </div>
          )}
          <SectionHeader title="أقسام المتجر"  />
          {!ready ? (
            <SkeletonCards />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-lg border border-border bg-surface p-4 text-center flex flex-col items-center gap-3 hover:border-muted-foreground transition-colors"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="text-4xl">{c.icon}</div>
                  )}
                  <div className="font-bold text-sm">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.count} منتج</div>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Promo banner */}
      {settings["promo_enabled"] !== "false" && (settings["promo_title"] || settings["promo_subtitle"]) && (
        <section className="py-6">
          <Container>
            <div className="relative overflow-hidden border-y border-border py-8 md:py-10">
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  {settings["promo_subtitle"] && (
                    <div className="text-muted-foreground text-sm mb-2">{settings["promo_subtitle"]}</div>
                  )}
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {settings["promo_title"] || ""}
                  </div>
                </div>
                {settings["promo_cta_slug"] && (
                  <Link
                    to="/category/$slug"
                    params={{ slug: settings["promo_cta_slug"] }}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-black shrink-0"
                  >
                    {settings["promo_cta_label"] || "اطلب الآن"}
                  </Link>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}





      {/* Bestsellers */}
      <section className="py-10">
        <Container>
          <SectionHeader title="الأكثر مبيعاً"  />
          {!ready ? (
            <SkeletonGrid count={8} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {bestsellers.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* New arrivals */}
      {newArrivals.length > 0 && <section className="py-10">
        <Container>
          <SectionHeader title="وصل حديثاً"  />
          {!ready ? (
            <SkeletonGrid count={8} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </Container>
      </section>

      }
      {/* Reviews */}
      <section className="py-14 border-t border-border bg-surface/40">
        <Container>
          <SectionHeader title="آراء عملائنا"  />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {displayedReviews.map((r, i) => (
              <div key={i} className="card-neon rounded-2xl p-5">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  "{r.text}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
                    {r.name.charAt(0)}
                  </div>
                  <div className="text-sm font-bold">
                    {r.name}
                    {r.product && (
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        قام بشراء: <span className="text-primary">{r.product}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Button
              type="button"
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="px-6 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl font-medium transition-all duration-200"
            >
              {showAllReviews ? "عرض أقل" : "المزيد من التقييمات"}
              {showAllReviews ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </Container>
      </section>
    </Layout>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 shrink-0">عرض الكل <ArrowLeft className="w-4 h-4" /></Link>
      </div>
    </div>
  );
}
