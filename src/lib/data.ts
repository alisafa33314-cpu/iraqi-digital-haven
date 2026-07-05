export type Category = {
  slug: string;
  name: string;
  icon: string;
  count: number;
};

export type Product = {
  id: string;
  name: string;
  categorySlug: string;
  price: number; // IQD
  oldPrice?: number;
  image: string;
  description: string;
  inStock: boolean;
  bestseller?: boolean;
  isNew?: boolean;
  rating: number;
  reviews: number;
};

export const categories: Category[] = [
  { slug: "kim-pass", name: "كيم باس", icon: "🎮", count: 24 },
  { slug: "xbox", name: "ألعاب اكس بوكس", icon: "🕹️", count: 42 },
  { slug: "streaming", name: "خدمات البث", icon: "📺", count: 18 },
  { slug: "gift-cards", name: "الكفت كارد", icon: "🎁", count: 36 },
  { slug: "steam", name: "حسابات ستيم اوفلاين", icon: "🎯", count: 21 },
  { slug: "ai", name: "اشتراكات الذكاء الاصطناعي", icon: "🤖", count: 12 },
];

const img = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=80`;

export const products: Product[] = [
  {
    id: "p1",
    name: "PUBG Mobile — 660 UC",
    categorySlug: "kim-pass",
    price: 12000,
    oldPrice: 15000,
    image: img("1542751371-adc38448a05e"),
    description: "شحن مباشر 660 UC لحساب PUBG Mobile. يتم التسليم خلال دقائق بعد التأكيد.",
    inStock: true,
    bestseller: true,
    isNew: false,
    rating: 4.9,
    reviews: 328,
  },
  {
    id: "p2",
    name: "Xbox Game Pass Ultimate — 3 أشهر",
    categorySlug: "xbox",
    price: 45000,
    oldPrice: 60000,
    image: img("1621259182978-fbf93132d53d"),
    description: "اشتراك 3 أشهر Ultimate يشمل مئات الألعاب على اكس بوكس والحاسوب.",
    inStock: true,
    bestseller: true,
    rating: 4.8,
    reviews: 214,
  },
  {
    id: "p3",
    name: "Netflix Premium — شهر كامل",
    categorySlug: "streaming",
    price: 18000,
    image: img("1611162617213-7d7a39e9b1d7"),
    description: "اشتراك نتفلكس 4K UHD لجهاز واحد. تسليم سريع بعد الدفع.",
    inStock: true,
    isNew: true,
    rating: 4.7,
    reviews: 512,
  },
  {
    id: "p4",
    name: "iTunes Gift Card — 25$",
    categorySlug: "gift-cards",
    price: 42000,
    image: img("1580910051074-3eb694886505"),
    description: "بطاقة آيتونز أمريكية بقيمة 25 دولار، مباشرة بالكود.",
    inStock: true,
    rating: 4.9,
    reviews: 189,
  },
  {
    id: "p5",
    name: "حساب ستيم — GTA V + RDR2",
    categorySlug: "steam",
    price: 35000,
    image: img("1592155931584-901ac15763e3"),
    description: "حساب ستيم اوفلاين يحتوي على GTA V + Red Dead Redemption 2.",
    inStock: true,
    bestseller: true,
    rating: 4.6,
    reviews: 96,
  },
  {
    id: "p6",
    name: "ChatGPT Plus — شهر",
    categorySlug: "ai",
    price: 32000,
    image: img("1677442136019-21780ecad995"),
    description: "اشتراك ChatGPT Plus لمدة شهر مع GPT-4 و DALL·E.",
    inStock: false,
    isNew: true,
    rating: 4.9,
    reviews: 402,
  },
  {
    id: "p7",
    name: "PUBG Mobile — 1800 UC",
    categorySlug: "kim-pass",
    price: 32000,
    oldPrice: 38000,
    image: img("1616588589676-c5b1c1c1c1c1"),
    description: "شحن 1800 UC مباشر بأفضل سعر.",
    inStock: true,
    rating: 4.9,
    reviews: 271,
  },
  {
    id: "p8",
    name: "Shahid VIP — 3 أشهر",
    categorySlug: "streaming",
    price: 22000,
    image: img("1522869635100-9f4c5e86aa37"),
    description: "اشتراك شاهد VIP لمدة 3 أشهر.",
    inStock: true,
    isNew: true,
    rating: 4.5,
    reviews: 78,
  },
];

export const reviews = [
  { name: "أحمد الموسوي", text: "تسليم أسرع من الخيال! خلال دقيقتين وصلني الكود.", rating: 5 },
  { name: "علي حسن", text: "أسعار ممتازة والدعم متعاون جداً. أنصح فيهم بقوة.", rating: 5 },
  { name: "فاطمة كريم", text: "أول مرة أطلب من متجر عراقي ويطلع بهاي الاحترافية.", rating: 5 },
  { name: "مصطفى الجبوري", text: "طلبت اشتراك نتفلكس وشغال 100%. شكراً FPI.", rating: 4 },
];

export const paymentMethods = [
  { name: "آسيا سيل", number: "07770586502", note: "تُضاف ضريبة 20% تلقائياً", tax: 0.2 },
  { name: "ماستر رافدين", number: "5239499592" },
  { name: "زين كاش", number: "07750795444" },
  { name: "Binance USDT", number: "1032524496" },
];

export const formatIQD = (n: number) =>
  new Intl.NumberFormat("ar-IQ").format(Math.round(n)) + " د.ع";

export const getProduct = (id: string) => products.find((p) => p.id === id);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const productsByCategory = (slug: string) =>
  products.filter((p) => p.categorySlug === slug);
