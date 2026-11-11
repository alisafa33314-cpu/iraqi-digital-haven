// بحث الطلبات في لوحة الإدارة: البحث يتم برقم الطلب الظاهر للزبون
// (أول 8 خانات من معرّف الطلب)، ونقبل الكتابة مع # أو بدونها،
// وبأحرف كبيرة أو صغيرة، وحتى بدون الشرطات التي داخل المعرّف.

export function normalizeOrderQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^#+/, "").replace(/[\s-]/g, "");
}

export function orderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

export function matchesOrderNumber(orderId: string, query: string): boolean {
  const needle = normalizeOrderQuery(query);
  if (!needle) return true;
  return orderId.toLowerCase().replace(/[\s-]/g, "").includes(needle);
}

export function filterOrdersByNumber<T extends { id: string }>(orders: T[], query: string): T[] {
  if (!normalizeOrderQuery(query)) return orders;
  return orders.filter((o) => matchesOrderNumber(o.id, query));
}
