import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://iraqi-digital-haven.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        type Entry = { path: string; changefreq?: string; priority?: string; lastmod?: string };
        const entries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/categories", changefreq: "weekly", priority: "0.9" },
          { path: "/search", changefreq: "monthly", priority: "0.5" },
        ];

        try {
          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const sb = createClient(url, key, { auth: { persistSession: false } });
            const [cats, prods] = await Promise.all([
              sb.from("categories").select("slug").eq("is_active", true),
              sb.from("products").select("id, updated_at").eq("is_active", true),
            ]);
            for (const c of cats.data ?? []) {
              entries.push({ path: `/category/${c.slug}`, changefreq: "weekly", priority: "0.8" });
            }
            for (const p of prods.data ?? []) {
              entries.push({
                path: `/product/${p.id}`,
                changefreq: "weekly",
                priority: "0.7",
                lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
              });
            }
          }
        } catch {
          // fallback to static entries
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
