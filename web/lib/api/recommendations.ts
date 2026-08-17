import { z } from "zod";

export type Tier = "اقتصادية" | "متوسطة" | "فاخرة";
export const TIERS: Tier[] = ["اقتصادية", "متوسطة", "فاخرة"];

export const CHAT_CATEGORIES = [
  "دهانات",
  "سباكة",
  "أرضيات",
  "كهربا",
  "أثاث",
  "مطابخ",
] as const;
export type ChatCategory = (typeof CHAT_CATEGORIES)[number];

export interface RecommendationRequest {
  budget: number;
  categories: string[];
  weights: number[];
  tier: Tier;
  notes?: string;
}

export interface RecommendationItem {
  productName: string;
  price: number;
  supplier: string;
  rating: number;
  quantity?: number;
}

export interface RecommendationCategory {
  name: string;
  weight: number;
  subtotal: number;
  items: RecommendationItem[];
  allocatedBudget?: number;
  note?: string;
}

export interface RecommendationResult {
  categories: RecommendationCategory[];
  totalCost: number;
  budget: number;
  remaining: number;
  notes?: string;
  raw?: unknown;
}

export interface RecommendationResponse {
  data?: RecommendationResult;
  errorMsg?: string;
  source: "api" | "none";
}

export const recommendationRequestSchema = z
  .object({
    budget: z.number().positive("الميزانية يجب أن تكون رقماً موجباً."),
    categories: z.array(z.string()).min(1, "يرجى اختيار فئة واحدة على الأقل."),
    weights: z
      .array(
        z
          .number()
          .int()
          .min(1, "الوزن لا يقل عن 1")
          .max(10, "الوزن لا يزيد عن 10"),
      )
      .min(1),
    tier: z.enum(["اقتصادية", "متوسطة", "فاخرة"], {
      message: "يرجى اختيار فئة جودة واحدة.",
    }),
    notes: z.string().optional(),
  })
  .refine((val) => val.categories.length === val.weights.length, {
    message: "عدد الأوزان يجب أن يساوي عدد الفئات.",
    path: ["weights"],
  })
  .transform((val) => ({
    ...val,
    weights: val.weights.map((w) => Math.round(Number(w) || 0)),
  }));

const BASE_URL = (process.env.NEXT_PUBLIC_RECOMMENDER_URL ?? "").replace(
  /\/+$/,
  "",
);

function extractFirstNumber(text: string, fallback = 0): number {
  const m = text.match(/\d+(?:[.,]\d+)?/);
  if (!m) return fallback;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

const CATEGORY_NAME_PATTERN =
  /(?:فئة\s*[:：]?\s*)?(أرضيات|دهانات|سباكة|كهربا|كهرباء|أثاث|اثاث|مطابخ|مطبخ)/;

const CATEGORY_NAME_NORMALIZE: Record<string, string> = {
  دهانات: "دهانات",
  الدهانات: "دهانات",
  سباكة: "سباكة",
  السباكة: "سباكة",
  أرضيات: "أرضيات",
  الأرضيات: "أرضيات",
  كهربا: "كهربا",
  كهرباء: "كهربا",
  الكهرباء: "كهربا",
  الكهربا: "كهربا",
  أثاث: "أثاث",
  اثاث: "أثاث",
  الأثاث: "أثاث",
  مطابخ: "مطابخ",
  مطبخ: "مطابخ",
  المطابخ: "مطابخ",
};

function normalizeCategoryName(raw: string): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const direct = CATEGORY_NAME_NORMALIZE[t];
  if (direct) return direct;
  const m = t.match(CATEGORY_NAME_PATTERN);
  if (!m) return null;
  const key = m[1]!;
  return CATEGORY_NAME_NORMALIZE[key] ?? null;
}

function splitSections(
  text: string,
  headerRe: RegExp,
): { header?: string; body: string; start: number; end: number }[] {
  const out: { header?: string; body: string; start: number; end: number }[] =
    [];
  const it = text.matchAll(headerRe);
  const starts: { index: number; header: string }[] = [];
  for (const m of it) {
    if (typeof m.index !== "number") continue;
    starts.push({
      index: m.index,
      header: (m[1] ?? m[2] ?? "").trim(),
    });
  }
  if (starts.length === 0) {
    return [{ body: text, start: 0, end: text.length }];
  }
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i]!;
    const nxt = starts[i + 1];
    const end = nxt ? nxt.index : text.length;
    out.push({
      header: cur.header,
      body: text.slice(cur.index, end),
      start: cur.index,
      end,
    });
  }
  return out;
}

function parseCategoryBudget(text: string): {
  allocatedBudget: number;
  subtotal: number;
  recommendationBlurb: string;
  unavailableTone: boolean;
} {
  const allocMatch = text.match(
    /الميزانية\s*(?:المخصصة)?\s*[:：]\s*([0-9.,]+)/,
  );
  const subtotalMatch = text.match(
    /(?:إجمالي\s+)?(?:التكلفة(?:\s*للفئة)?)\s*[:：]\s*([0-9.,]+)/,
  );
  const recMatch = text.match(/\*\*?\s*التوصية\s*\*\*?\s*[:：]\s*([^\n\r]*)/);
  const recRaw = recMatch ? recMatch[1]!.trim() : "";
  const unavailable =
    /لا\s*(?:توجد|يوجد)\s*منتجات|غير\s*متوفرة?\s*حاليا?|غير\s*متوفرة?\s*بالنظام/i.test(
      recRaw,
    );
  const alloc = extractFirstNumber(allocMatch ? allocMatch[1]! : "", 0);
  const subtotal = extractFirstNumber(
    subtotalMatch ? subtotalMatch[1]! : "",
    0,
  );
  return {
    allocatedBudget: alloc,
    subtotal,
    recommendationBlurb: recRaw,
    unavailableTone: unavailable,
  };
}

function extractSupplier(line: string): string {
  const m = line.match(
    /(?:المورد|البائع|الشركة|المصنع|المحل|المتجر|مشروع|مؤسسة)\s*[:：]\s*([^\n\r،,؛;]+)/,
  );
  if (m) return m[1]!.trim();
  return "مورد محلي";
}

function extractProductName(line: string): string {
  const patterns = [
    /(?:المنتج|اسم\s+المنتج|العنصر|العنصر\s+الموصى)\s*[:：]\s*([^\n\r،,؛;]+)/,
    /[*_]+\s*([^*\n][^\n]*?)\s*[*_]+/,
  ];
  for (const p of patterns) {
    const m = line.match(p);
    if (m) return m[1]!.trim();
  }
  const stripped = line
    .replace(/^[\s*\-•\.]+/, "")
    .replace(/\*\*/g, "")
    .trim();
  const firstChunk = stripped.split(/[،,؛;]/)[0] ?? "";
  return firstChunk.length > 2 ? firstChunk : stripped || "منتج مقترح";
}

function extractRating(line: string, fallback = 4): number {
  const m = line.match(
    /(?:التقييم|تقييم|النجوم|نجم|نجمات?)\s*[:：]\s*([0-9.]+)/,
  );
  const n = m
    ? Number(m[1])
    : /\b([0-4](?:\.[0-9])?|5(?:\.0)?)\s*\/?\s*5\b/.test(line)
      ? (() => {
          const mx = line.match(/\b([0-4](?:\.[0-9])?|5(?:\.0)?)\s*\/?\s*5\b/);
          return mx ? Number(mx[1]) : NaN;
        })()
      : NaN;
  const r = Number.isFinite(n) ? n! : fallback;
  return Math.max(0, Math.min(5, r));
}

function parseProductLines(body: string): RecommendationItem[] {
  const rawLines = body.split(/\r?\n/);
  const bulletRe = /^\s*(?:\d+[\.)\s]+|[\-*•·]\s*|\*\s*)/;
  const items: RecommendationItem[] = [];
  for (const raw of rawLines) {
    if (!bulletRe.test(raw)) continue;
    const line = raw.replace(bulletRe, "").trim();
    if (!line) continue;
    if (
      /الميزانية\s*(?:المخصصة)?\s*[:：]|إجمالي\s+التكلفة|التوصية\s*[:：]/.test(
        line,
      )
    )
      continue;
    const price = (() => {
      const m =
        line.match(
          /(?:السعر|التكلفة|السعر\s+الوحدة?|السعر\s+الإجمالي)\s*[:：]\s*([0-9.,]+)/,
        ) ?? line.match(/([0-9.,]+)\s*(?:ج\.م\.?|جنيه|EGP|LE\b)/i);
      if (m) return extractFirstNumber(m[1]!, 0);
      return extractFirstNumber(line, 0);
    })();
    const name = extractProductName(line);
    if (!name && !price) continue;
    if (!price && !/السعر|جنيه|ج\.م|EGP/i.test(line)) continue;
    items.push({
      productName: name || `منتج ${items.length + 1}`,
      price,
      supplier: extractSupplier(line),
      rating: extractRating(line),
      quantity: (() => {
        const m = line.match(/(?:الكمية|عدد|مقدار)\s*[:：]\s*(\d+)/);
        const n = m ? Number(m[1]) : NaN;
        return Number.isFinite(n) && n > 0 ? n : 1;
      })(),
    });
  }
  return items;
}

function parseTotals(text: string): { budget: number; totalCost: number } {
  const sections = splitSections(
    text,
    /^###[^\S\n]*[0-9]*\.?[^\S\n]*(الملخص الإجمالي|الملخص|ملخص التوصيات|Summary)[:：]?/gim,
  ).filter((s) => s.header && /ملخص|Summary/i.test(s.header));
  const block = sections[0]?.body ?? text;
  const budgetMatch =
    block.match(/الميزانية\s*(?:الإجمالية\s+المتاحة)?\s*[:：]\s*([0-9.,]+)/) ??
    text.match(/الميزانية\s*(?:الإجمالية\s+المتاحة)?\s*[:：]\s*([0-9.,]+)/) ??
    text.match(/\((\d[\d.,]*)\s*جنيه\s*مصري\)/);
  const totalMatch =
    block.match(
      /إجمالي\s+التكلفة\s+(?:الفعلية\s+للمنتجات\s*)?[:：]\s*([0-9.,]+)/,
    ) ?? text.match(/إجمالي\s+التكلفة\s*[:：]\s*([0-9.,]+)/);
  return {
    budget: extractFirstNumber(budgetMatch ? budgetMatch[1]! : "", 0),
    totalCost: extractFirstNumber(totalMatch ? totalMatch[1]! : "", 0),
  };
}

function parseNotes(text: string): string | undefined {
  const sections = splitSections(
    text,
    /^[\s*]*💡?[^\S\n]*\*\*?\s*(ملاحظات?(?:\s+هامة)?|Notes)\s*\*\*?\s*[:：]?/gim,
  ).filter((s) => s.header);
  if (sections.length === 0) return undefined;
  return sections
    .map((s) =>
      s.body
        .split(/\r?\n/)
        .filter((l) => /^\s*\*+\s*|^\s*[-\s•]+\s*|\s/.test(l) || l.length > 0)
        .map((l) => l.replace(/^\s*(?:[-\s•]+|\*+\s*)/, "").trim())
        .filter(Boolean)
        .join(" · "),
    )
    .filter(Boolean)
    .join(" | ");
}

function parseRawApiResponse(raw: unknown): RecommendationResult | null {
  const root = (() => {
    if (!raw || typeof raw !== "object")
      return typeof raw === "string" ? { response: raw } : null;
    const r = raw as Record<string, unknown>;
    if (typeof r.response === "string") return { response: r.response };
    return r;
  })();
  if (!root) return null;
  const text = String((root as { response: string }).response ?? "");
  if (!text) return null;
  const { budget: totalsBudget, totalCost: totalsCost } = parseTotals(text);
  const categorySections = splitSections(
    text,
    /^###[^\S\n]*\d+\.?[^\S\n]+(.+?)[^\S\n]*$/gim,
  ).filter(
    (s) =>
      s.header &&
      (CATEGORY_NAME_PATTERN.test(s.header) || /فئة/i.test(s.header)),
  );
  const categories: RecommendationCategory[] = [];
  for (const sec of categorySections) {
    const name = normalizeCategoryName(sec.header ?? sec.body);
    if (!name) continue;
    const parsed = parseCategoryBudget(sec.body);
    const items = parseProductLines(sec.body);
    categories.push({
      name,
      weight: 0,
      subtotal:
        parsed.subtotal > 0
          ? parsed.subtotal
          : items.reduce((a: number, b: RecommendationItem) => a + b.price, 0),
      items,
      allocatedBudget: parsed.allocatedBudget || undefined,
      note: parsed.recommendationBlurb || undefined,
    });
  }
  if (categories.length === 0) return null;
  const totalCost =
    totalsCost > 0
      ? totalsCost
      : categories.reduce((a, b) => a + b.subtotal, 0);
  const budget = totalsBudget > 0 ? totalsBudget : 0;
  return {
    categories,
    budget,
    totalCost,
    remaining: budget > 0 ? budget - totalCost : 0,
    notes: parseNotes(text),
    raw: root,
  };
}

function wrapApiError(err: unknown): string {
  const tooLow =
    "الميزانية التي أدخلتها غير كافية لإصدار اقتراح. يرجى رفع الميزانية.";
  if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
    return "تعذر الاتصال بخدمة التوصيات حالياً. يرجى المحاولة مرة أخرى بعد قليل.";
  }
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = Number((err as { status?: number }).status) || 0;
    const body = (err as { body?: unknown }).body;
    if (status === 422 || status === 400) {
      const b = (body ?? {}) as Record<string, unknown> | string;
      if (typeof b === "object" && Array.isArray(b.detail)) {
        const first = (b.detail as unknown[])[0] as
          { msg?: string; loc?: (string | number)[] } | undefined;
        if (first?.loc) {
          const last = String(first.loc[first.loc.length - 1] ?? "");
          if (last === "categories" || last.includes("categor"))
            return "يرجى اختيار فئة واحدة على الأقل.";
          if (last === "budget") return tooLow;
          if (last === "weights" || last.includes("weight"))
            return "مجموع الأوزان يجب أن يساوي 10 بالضبط.";
        }
        if (first?.msg) return first.msg;
      }
      if (typeof b === "object" && typeof (b as any).message === "string")
        return (b as any).message;
      if (status === 422)
        return "بيانات الطلب غير مكتملة. يرجى المراجعة وإعادة الإرسال.";
      return "طلب غير صالح. يرجى التحقق من المدخلات.";
    }
    if (status === 500 || status >= 500)
      return "تعذر على الخادم إصدار التوصيات حالياً (خطأ داخلي).";
  }
  return "تعذر الحصول على التوصيات. يرجى المحاولة مرة أخرى.";
}

export async function submitBudgetRecommendation(
  req: RecommendationRequest,
): Promise<RecommendationResponse> {
  try {
    const body = recommendationRequestSchema.parse({
      ...req,
      categories: req.categories,
      weights: req.weights.map((n) => Math.round(Number(n))),
    });
    const sum = body.weights.reduce((a: number, b: number) => a + b, 0);
    if (sum !== 10) {
      return {
        source: "none",
        errorMsg: "مجموع الأوزان يجب أن يساوي 10 بالضبط قبل الإرسال.",
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify({
          budget: body.budget,
          categories: body.categories,
          weights: body.weights,
          tier: body.tier,
          notes: body.notes ?? "",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    const ct = response.headers.get("content-type") ?? "";
    const rawText = await response.text();
    let raw: unknown = rawText;
    if (ct.includes("application/json") && rawText.length > 0) {
      try {
        raw = JSON.parse(rawText);
      } catch {
        raw = rawText;
      }
    }
    if (!response.ok) {
      const structured = parseRawApiResponse(raw);
      if (structured) {
        return {
          data: structured,
          source: "api",
          errorMsg: wrapApiError({
            status: response.status,
            body: raw,
          }),
        } as RecommendationResponse;
      }
      return {
        source: "none",
        errorMsg: wrapApiError({
          status: response.status,
          body: raw,
        }),
      };
    }
    const parsed = parseRawApiResponse(raw);
    if (!parsed) {
      return {
        source: "none",
        errorMsg:
          "تعذر قراءة استجابة خدمة التوصيات بالشكل المتوقع. يرجى المحاولة مرة أخرى.",
      };
    }
    return { data: parsed, source: "api" };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return {
        source: "none",
        errorMsg: first?.message ?? "بيانات غير صالحة.",
      };
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        source: "none",
        errorMsg:
          "استغرق الحصول على التوصيات وقتاً طويلاً. يرجى المحاولة مرة أخرى.",
      };
    }
    return { source: "none", errorMsg: wrapApiError(err) };
  }
}
