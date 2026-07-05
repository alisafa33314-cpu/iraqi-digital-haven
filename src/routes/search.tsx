import { createFileRoute } from "@tanstack/react-router";
import { Layout, Container } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { categories, products } from "@/lib/data";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "بحث — FPI STOR" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const results = query
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          categories.find((c) => c.slug === p.categorySlug)?.name.includes(query),
      )
    : products;

  return (
    <Layout>
      <Container className="py-10">
        <h1 className="text-3xl font-black mb-5">البحث في المتجر</h1>
        <div className="relative mb-8">
          <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج، لعبة، اشتراك..."
            className="w-full bg-surface border border-border rounded-2xl pr-12 pl-4 py-4 focus:border-primary outline-none text-base"
          />
        </div>
        <div className="text-sm text-muted-foreground mb-4">{results.length} نتيجة</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Container>
    </Layout>
  );
}
