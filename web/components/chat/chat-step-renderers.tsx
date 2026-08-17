"use client";

import React from "react";
import { Star as StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  evenSplit,
  weightsSum,
  clampWeight,
  type StepId,
} from "./use-chat-state";
import {
  CHAT_CATEGORIES,
  TIERS,
  type RecommendationResult,
  type Tier,
} from "@/lib/api/recommendations";

function Stars({ rating }: { rating: number }) {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  const whole = Math.floor(n);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`تقييم ${n.toFixed(1)}`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className="h-3 w-3"
          style={{ color: i < whole ? "#f59e0b" : "#cbd5e1" }}
          fill={i < whole ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export function StartWidget({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-semibold text-base leading-tight">
          أهلاً بك في مساعد الميزانية 🏡
        </p>
        <p className="text-sm text-muted-foreground">
          سأساعدك على تخصيص ميزانية أعمال منزلك (دهانات، سباكة، أرضيات، كهرباء،
          أثاث، مطابخ) وتوزيعها حسب الفئات والجودة التي تريدها.
        </p>
      </div>
      <div className="flex justify-start">
        <Button type="button" className="w-full sm:w-auto" onClick={onStart}>
          ابدأ المحادثة
        </Button>
      </div>
    </div>
  );
}

export function BudgetCheckWidget({
  userBudget,
  storedBudget,
  onConfirmStored,
  onEdit,
  inputMode,
  onSubmitManual,
  errorMsg,
}: {
  userBudget: number | null;
  storedBudget: number | null;
  onConfirmStored: () => void;
  onEdit: () => void;
  inputMode: boolean;
  onSubmitManual: (value: string) => boolean;
  errorMsg?: string | null;
}) {
  const confirmedBudget = storedBudget ?? userBudget;
  if (inputMode || confirmedBudget === null) {
    return <BudgetManualWidget onSubmit={onSubmitManual} errorMsg={errorMsg} />;
  }
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle className="text-sm font-semibold">
          وجدنا ميزانية مسجلة لحسابك
        </AlertTitle>
        <AlertDescription className="pt-2 text-foreground">
          <div className="text-lg font-bold">
            ميزانيتك: {confirmedBudget.toLocaleString("ar-EG")} جنيه
          </div>
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onConfirmStored}>
          استخدام هذه الميزانية
        </Button>
        <Button type="button" variant="outline" onClick={onEdit}>
          تغيير الميزانية
        </Button>
      </div>
    </div>
  );
}

export function BudgetManualWidget({
  onSubmit,
  errorMsg,
}: {
  onSubmit: (value: string) => boolean;
  errorMsg?: string | null;
}) {
  const [value, setValue] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6">
        يرجى إدخال ميزانيتك الإجمالية بالجنيه المصري، مثلاً 50000 جنيه.
      </p>
      <form
        ref={formRef}
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const ok = onSubmit(value);
          if (ok) setValue("");
        }}
      >
        <input
          dir="ltr"
          inputMode="decimal"
          className={cn(
            "flex-1 min-w-0 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            errorMsg ? "border-destructive" : undefined,
          )}
          placeholder="مثال: 50000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="الميزانية بالجنيه"
        />
        <Button type="submit" disabled={!value.trim()}>
          تأكيد
        </Button>
      </form>
      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle className="text-sm font-semibold">تنبيه</AlertTitle>
          <AlertDescription className="pt-1 text-sm">
            {errorMsg}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function CategorySelectWidget({
  selected,
  onToggle,
  onConfirm,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  onConfirm: () => void;
}) {
  const count = selected.length;
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">اختر الفئات التي تريد تخصيص ميزانية لها</p>
        <p className="text-xs text-muted-foreground pt-1">
          يمكنك اختيار فئة أو أكثر، ثم اضغط متابعة.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CHAT_CATEGORIES.map((name) => {
          const active = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={cn(
                "rounded-lg border text-sm font-medium h-11 transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background border-input text-foreground hover:bg-muted",
              )}
            >
              {name}
              {active ? (
                <span className="mr-1.5 text-xs opacity-80">✓</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Badge variant="secondary">المختارة: {count} من 6</Badge>
        <Button
          type="button"
          size="sm"
          disabled={count === 0}
          onClick={onConfirm}
        >
          متابعة
        </Button>
      </div>
    </div>
  );
}

export function WeightAssignWidget({
  selected,
  weights,
  onInc,
  onDec,
  onSlide,
  onConfirm,
}: {
  selected: string[];
  weights: Record<string, number>;
  onInc: (name: string) => void;
  onDec: (name: string) => void;
  onSlide: (name: string, value: number) => void;
  onConfirm: () => void;
}) {
  const normalizedWeights = React.useMemo<Record<string, number>>(() => {
    const need =
      selected.length > 0 &&
      (!weights || selected.some((c) => !(c in weights)));
    return need ? evenSplit(selected) : weights;
  }, [selected, weights]);

  const total = selected.reduce(
    (acc, c) => acc + clampWeight(normalizedWeights[c] ?? 0),
    0,
  );

  const banner =
    total === 10
      ? { tone: "ok" as const, text: `المجموع مثالي: ${total} من 10 ✅` }
      : total < 10
        ? {
            tone: "warn" as const,
            text: `المجموع الحالي: ${total} من 10. المتبقي للوصول: ${10 - total} نقطة.`,
          }
        : {
            tone: "bad" as const,
            text: `المجموع الحالي: ${total} من 10. تم تجاوز المجموع بمقدار: ${total - 10} نقطة. انخفض بعض الأوزان.`,
          };
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">وزن كل فئة (المجموع يجب أن يساوي 10)</p>
        <p className="text-xs text-muted-foreground pt-1">
          استخدم الشرائط أو الأزرار لتغيير الأوزان (1 إلى 10).
        </p>
      </div>
      <Alert
        className={cn(
          banner.tone === "ok"
            ? "border-emerald-400/40 bg-emerald-50 dark:bg-emerald-500/10"
            : banner.tone === "warn"
              ? "border-amber-400/40 bg-amber-50 dark:bg-amber-500/10"
              : "border-destructive/40 bg-destructive/5",
        )}
      >
        <AlertDescription
          className={cn(
            "text-sm font-medium",
            banner.tone === "ok"
              ? "text-emerald-800 dark:text-emerald-300"
              : banner.tone === "warn"
                ? "text-amber-800 dark:text-amber-300"
                : "text-destructive",
          )}
        >
          {banner.text}
        </AlertDescription>
      </Alert>
      <div className="space-y-3 max-h-[34vh] overflow-y-auto pr-1">
        {selected.map((name) => {
          const v = clampWeight(normalizedWeights[name] ?? 1);
          return (
            <div
              key={name}
              className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-semibold">
                  {name}
                </Badge>
                <div className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onDec(name)}
                    aria-label={`إنقاص وزن ${name}`}
                  >
                    −
                  </Button>
                  <span
                    dir="ltr"
                    className="w-7 text-center text-sm font-semibold tabular-nums"
                  >
                    {v}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onInc(name)}
                    aria-label={`زيادة وزن ${name}`}
                  >
                    +
                  </Button>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={v}
                onChange={(e) => onSlide(name, Number(e.target.value))}
                className="w-full accent-primary"
                aria-label={`وزن ${name}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-1">
        <Button
          type="button"
          size="sm"
          disabled={total !== 10}
          onClick={onConfirm}
        >
          تأكيد التوزيع
        </Button>
      </div>
    </div>
  );
}

export function TierSelectWidget({
  value,
  onSelect,
}: {
  value: Tier | null;
  onSelect: (t: Tier) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">اختر فئة الجودة المطلوبة</p>
        <p className="text-xs text-muted-foreground pt-1">
          اقتصادية: سعر مناسب · متوسطة: توازن جودة وسعر · فاخرة: أفضل جودة وأعلى
          سعر.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => {
          const active = t === value;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              className={cn(
                "rounded-lg border text-sm font-medium h-11 transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background border-input text-foreground hover:bg-muted",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground">
      <span>جاري إعداد التوصيات…</span>
      <span className="inline-flex items-end gap-0.5" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
      </span>
    </div>
  );
}

function formatEGP(n: number) {
  const v = Math.round(Number(n) || 0);
  return `${v.toLocaleString("ar-EG")} ج.م`;
}

export function ResultsWidget({
  result,
  onEditCategories,
  onEditBudget,
  onEditTier,
  onStartOver,
}: {
  result: RecommendationResult;
  onEditCategories: () => void;
  onEditBudget: () => void;
  onEditTier: () => void;
  onStartOver: () => void;
}) {
  const { totalCost, budget, remaining, categories, notes } = result;
  const over = remaining < 0;
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border p-4 space-y-2",
          over
            ? "border-destructive/40 bg-destructive/5"
            : "border-emerald-400/40 bg-emerald-50 dark:bg-emerald-500/10",
        )}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground/80">الملخص</p>
          <Badge variant="secondary">
            {budget > 0 ? formatEGP(budget) : "غير محددة"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-background/70 p-2.5 border border-border/50">
            <div className="text-xs text-muted-foreground">التكلفة الكلية</div>
            <div className="font-bold tabular-nums">{formatEGP(totalCost)}</div>
          </div>
          <div
            className={cn(
              "rounded-lg p-2.5 border",
              over
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-emerald-500/10 border-emerald-400/30 text-emerald-700 dark:text-emerald-300",
            )}
          >
            <div className="text-xs opacity-80">
              {over ? "التجاوز" : "المتبقي من الميزانية"}
            </div>
            <div className="font-bold tabular-nums">
              {over ? `+ ${formatEGP(-remaining)}` : formatEGP(remaining)}
            </div>
          </div>
        </div>
      </div>

      {notes ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200 leading-6">
          <span className="font-semibold">💡 ملاحظات: </span>
          {notes}
        </div>
      ) : null}

      <div className="space-y-3">
        {categories.map((c) => {
          const allocated = c.allocatedBudget;
          const diff =
            typeof allocated === "number" && allocated > 0
              ? c.subtotal - allocated
              : null;
          return (
            <details
              key={c.name}
              open
              className="group rounded-xl border border-border/60 bg-card overflow-hidden"
            >
              <summary className="list-none cursor-pointer p-3 flex items-center justify-between gap-2 bg-muted/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="font-semibold">
                    {c.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    الوزن: {c.weight ?? 0} من 10
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {c.items.length} منتج/منتجات
                  </span>
                  {typeof allocated === "number" && allocated > 0 ? (
                    <Badge variant="secondary" className="text-[11px]">
                      المخصص: {formatEGP(allocated)}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-left">
                    <div className="text-sm font-bold tabular-nums leading-tight">
                      {formatEGP(c.subtotal)}
                    </div>
                    {diff !== null && diff !== 0 ? (
                      <div
                        className={cn(
                          "text-[10px] leading-none mt-0.5 tabular-nums",
                          diff > 0 ? "text-destructive" : "text-emerald-600",
                        )}
                      >
                        {diff > 0
                          ? `+ ${formatEGP(diff)}`
                          : `${formatEGP(-diff)} محفوظ`}
                      </div>
                    ) : null}
                  </div>
                  <span
                    aria-hidden
                    className="transition-transform group-open:rotate-180 text-muted-foreground"
                  >
                    ▾
                  </span>
                </div>
              </summary>
              <div className="p-3 space-y-2">
                {c.note ? (
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs leading-6",
                      /غير متوفرة?|لا توجد منتجات|لا يوجد/i.test(c.note)
                        ? "border-destructive/30 bg-destructive/5 text-destructive-foreground"
                        : "border-primary/20 bg-primary/5 text-foreground",
                    )}
                  >
                    <span className="font-semibold">التوصية: </span>
                    {c.note}
                  </div>
                ) : null}
                {c.items.length === 0 ? (
                  c.note ? null : (
                    <p className="text-xs text-muted-foreground">
                      لا توجد منتجات مقترحة لهذه الفئة حالياً.
                    </p>
                  )
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {c.items.map((it, i) => (
                      <div
                        key={`${c.name}-${i}`}
                        className="rounded-lg border border-border/50 bg-background p-3 flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-semibold text-sm leading-tight">
                            {it.productName}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <span>{it.supplier}</span>
                            <Stars rating={it.rating} />
                            {it.quantity && it.quantity > 1 ? (
                              <span>الكمية: {it.quantity}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-primary tabular-nums">
                            {formatEGP(it.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <div className="pt-1 space-y-1">
        <p className="text-xs text-muted-foreground">
          يمكنك استخدام حقل الكتابة أدناه لإجراء تعديلات سريعة مثل: &quot;غير
          الفئة&quot; أو &quot;زود الميزانية&quot; أو &quot;غير الفئة
          الجودة&quot;.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEditCategories}
        >
          تعديل الفئات
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEditBudget}
        >
          تعديل الميزانية
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onEditTier}>
          تعديل الجودة
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
          ابدأ من جديد
        </Button>
      </div>
    </div>
  );
}

export type WidgetKey =
  | "start"
  | "budget-check"
  | "category-select"
  | "weight-assign"
  | "tier-select"
  | "typing"
  | "results";

export const WIDGET_KEYS: Record<WidgetKey, true> = {
  start: true,
  "budget-check": true,
  "category-select": true,
  "weight-assign": true,
  "tier-select": true,
  typing: true,
  results: true,
};

export type { StepId };
