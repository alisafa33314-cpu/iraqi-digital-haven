import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { reviews as staticReviews } from "@/lib/data";
import { useCatalog } from "@/lib/catalog";
import { ArrowLeft, Star, Zap, Shield, Clock, Search } from "lucide-react";
import heroImg from "@/assets/hero-gaming.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const products = useCatalog((s) => s.products);
  const categories = useCatalog((s) => s.categories);
  const storeImages = useCatalog((s) => s.storeImages);
  const dbReviews = useCatalog((s) => s.reviews);
  const bestsellers = products.slice(0, 8);
  const newArrivals = products.slice(0, 8);
  const allReviews = [
    ...dbReviews.map((r) => ({ name: r.customer_name, text: r.comment || "", rating: r.rating })),
    ...(dbReviews.length === 0 ? staticReviews : []),
  ].slice(0, 8);


  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <Container className="relative py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-xs text-primary font-bold mb-5">
              <Zap className="w-3.5 h-3.5" /> تسليم فوري • خدمة 24/7
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
              متجرك الرقمي
              <br />
              <span className="text-primary text-glow">في العراق</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              اشتراكات، حسابات، ألعاب، كفت كارد وخدمات ذكاء اصطناعي — بالدينار العراقي وبأفضل الأسعار.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/categories"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold btn-glow inline-flex items-center gap-2"
              >
                تصفح المتجر <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                to="/search"
                className="px-6 py-3 rounded-xl bg-surface border border-border font-bold inline-flex items-center gap-2 hover:border-primary/50 transition"
              >
                <Search className="w-4 h-4" /> بحث سريع
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
              {[
                { icon: Clock, label: "تسليم فوري" },
                { icon: Shield, label: "دفع آمن" },
                { icon: Star, label: "خدمة موثوقة" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="card-neon rounded-xl p-3 text-center">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-12">
        <Container>
          <SectionHeader title="أقسام المتجر" subtitle="اختر ما يناسبك من فئات متنوعة" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="card-neon rounded-2xl p-5 text-center flex flex-col items-center gap-2"
              >
                <div className="text-4xl">{c.icon}</div>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.count} منتج</div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Promo banner */}
      <section className="py-6">
        <Container>
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-l from-primary via-red-700 to-red-900">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-white/80 text-sm mb-2">عروض حصرية</div>
                <div className="text-3xl md:text-4xl font-black text-white">
                  خصم يصل إلى 25% على الكيم باس
                </div>
              </div>
              <Link
                to="/category/$slug"
                params={{ slug: "kim-pass" }}
                className="px-6 py-3 rounded-xl bg-white text-primary font-black shrink-0"
              >
                اطلب الآن
              </Link>
            </div>
          </div>
        </Container>

      {/* Store gallery */}
      {storeImages.length > 0 && (
        <section className="py-8 border-t border-border">
          <Container>
            <SectionHeader title="من متجرنا" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {storeImages.map((img) => (
                <a key={img.id} href={img.image_url} target="_blank" rel="noreferrer"
                  className="block rounded-2xl overflow-hidden card-neon aspect-square">
                  <img src={img.image_url} alt="" className="w-full h-full object-cover hover:scale-105 transition" />
                </a>
              ))}
            </div>
          </Container>
        </section>
      )}


      {/* Bestsellers */}
      <section className="py-10">
        <Container>
          <SectionHeader title="الأكثر مبيعاً" subtitle="المنتجات المفضلة لدى عملائنا" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Container>
      </section>

      {/* New arrivals */}
      <section className="py-10">
        <Container>
          <SectionHeader title="وصل حديثاً" subtitle="أحدث المنتجات في المتجر" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Container>
      </section>

      {/* Reviews */}
      <section className="py-14 border-t border-border bg-surface/40">
        <Container>
          <SectionHeader title="آراء عملائنا" subtitle="ثقتك شرفنا" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {allReviews.map((r, i) => (
              <div key={i} className="card-neon rounded-2xl p-5">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  "{r.text}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
                    {r.name.charAt(0)}
                  </div>
                  <div className="text-sm font-bold">{r.name}</div>
                </div>
              </div>
            ))}
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
        <div className="h-1 flex-1 max-w-40 bg-gradient-to-l from-primary to-transparent rounded-full hidden md:block" />
      </div>
    </div>
  );
}
