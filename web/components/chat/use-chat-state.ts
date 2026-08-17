"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  CHAT_CATEGORIES,
  TIERS,
  type Tier,
  type RecommendationResult,
} from "@/lib/api/recommendations";

export type StepId =
  | "start"
  | "budget"
  | "categories"
  | "weights"
  | "tier"
  | "submit"
  | "results"
  | "followup";

export interface ChatMessage {
  id: string;
  role: "bot" | "user";
  kind: "text" | "widget" | "error";
  text?: string;
  widgetKey?: string;
  createdAt: number;
}

export interface ChatState {
  step: StepId;
  budget: number | null;
  selectedCategories: string[];
  weights: Record<string, number>;
  tier: Tier | null;
  notes: string;
  result: RecommendationResult | null;
  lastApiError: string | null;
  isSubmitting: boolean;
  isOpen: boolean;
  messages: ChatMessage[];
  widgetHydration: { budgetPromptSeen: boolean };
}

const STORAGE_KEY = "bonyan:chat:v1";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULT_STATE: ChatState = {
  step: "start",
  budget: null,
  selectedCategories: [],
  weights: {},
  tier: null,
  notes: "",
  result: null,
  lastApiError: null,
  isSubmitting: false,
  isOpen: false,
  messages: [],
  widgetHydration: { budgetPromptSeen: false },
};

function loadState(): Partial<ChatState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ChatState>;
    if (!parsed || typeof parsed !== "object") return {};
    const omit = { ...parsed };
    delete (omit as Partial<ChatState> & { isOpen?: boolean }).isOpen;
    return omit;
  } catch {
    return {};
  }
}

function saveState(state: ChatState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: state.step,
        budget: state.budget,
        selectedCategories: state.selectedCategories,
        weights: state.weights,
        tier: state.tier,
        notes: state.notes,
        result: state.result,
        lastApiError: state.lastApiError,
        messages: state.messages,
        widgetHydration: state.widgetHydration,
      }),
    );
  } catch {
    /* sessionStorage full/private — noop */
  }
}

export function evenSplit(
  cats: string[],
): Record<string, number> {
  if (cats.length === 0) return {};
  const n = cats.length;
  const base = Math.floor(10 / n);
  const remainder = 10 - base * n;
  const weights: Record<string, number> = {};
  cats.forEach((c, i) => {
    weights[c] = base + (i < remainder ? 1 : 0);
  });
  return weights;
}

export function weightsSum(weights: Record<string, number>): number {
  return Object.values(weights).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function clampWeight(v: number): number {
  const n = Math.round(Number(v) || 0);
  return Math.max(1, Math.min(10, n));
}

export function parseBudgetInput(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const s = String(input ?? "")
    .replace(/[,ـ]/g, "")
    .replace(/(جنيه|ج\.م\.|LE|EGP|\s)/gi, "")
    .trim();
  if (!s) return { ok: false, error: "يرجى إدخال الميزانية بالجنيه المصري." };
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0)
    return { ok: false, error: "الميزانية يجب أن تكون رقماً موجباً بالجنيه المصري." };
  return { ok: true, value: Math.round(n) };
}

export function parseBudgetFreeText(input: string): number | null {
  const p = parseBudgetInput(input);
  return p.ok ? p.value : null;
}

interface FollowUpRoute {
  newStep: StepId | null;
  edits: Partial<Pick<ChatState, "tier" | "budget" | "selectedCategories" | "weights" | "notes">> & { appendNotes?: string };
}

export function routeFollowUp(input: string, state: ChatState): FollowUpRoute {
  const t = String(input ?? "").trim();
  if (!t) return { newStep: null, edits: {} };
  const lower = t.normalize("NFKC");
  const firstNumberMatch = lower.match(/\d[\d.,]*/);
  const maybeBudget = firstNumberMatch ? parseBudgetFreeText(firstNumberMatch[0]) : null;
  if (/غير.*الفئة|عدل.*الفئات|عدل.*الاقسام|غير.*الاقسام|اختر.*فئات|فئات.*آخرى/i.test(lower)) {
    return {
      newStep: "categories",
      edits: {},
    };
  }
  if (/غير.*الجودة|غير.*المستوى|غير.*التدرج|غير.*الفئة.*الجودة|فئة.*الجودة/i.test(lower)) {
    return { newStep: "tier", edits: {} };
  }
  if (/زود.*الميزانية|ارفع.*الميزانية|زيد.*الميزانية|غير.*الميزانية|قلل.*الميزانية|خفض.*الميزانية|تغيير.*المبلغ|المبلغ.*جديد|ميزانية.*جديدة/i.test(lower)) {
    const next = maybeBudget ?? state.budget;
    if (next !== null && next > 0) {
      return {
        newStep: "tier",
        edits: { budget: next },
      };
    }
    return { newStep: "budget", edits: {} };
  }
  if (/ابدأ.*جديد|جلسة.*جديدة|إعادة.*بدأ|احذف.*الكل|مسح/i.test(lower)) {
    return {
      newStep: "start",
      edits: { notes: "", tier: null, budget: null, selectedCategories: [], weights: {}, appendNotes: undefined },
    };
  }
  return {
    newStep: "submit",
    edits: { appendNotes: t },
  };
}

export function useChatState(userBudgetRaw: number | null | undefined) {
  const [state, setState] = useState<ChatState>(() => ({
    ...DEFAULT_STATE,
    isSubmitting: false,
  }));
  const didInit = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const hydratedOnce = useRef(false);

  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    const stored = loadState() as Partial<ChatState>;
    const hasSavedFlow =
      Boolean(stored.step) &&
      Array.isArray(stored.messages) &&
      stored.messages.length > 0;
    if (hasSavedFlow) {
      setState((s) => ({ ...s, ...stored, isSubmitting: false }));
    } else {
      setState((s) => ({
        ...s,
        messages: [
          {
            id: uid(),
            role: "bot",
            kind: "widget",
            widgetKey: "start",
            createdAt: Date.now(),
          },
        ],
      }));
    }
  }, []);

  useEffect(() => {
    if (!hydratedOnce.current) return;
    saveState(state);
  }, [state]);

  const pushMessage = useCallback(
    (m: Omit<ChatMessage, "id" | "createdAt">) => {
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { ...m, id: uid(), createdAt: Date.now() },
        ],
      }));
    },
    [],
  );

  const setOpen = useCallback((v: boolean) => {
    setState((s) => ({ ...s, isOpen: v }));
  }, []);

  const toggleOpen = useCallback(() => {
    setState((s) => ({ ...s, isOpen: !s.isOpen }));
  }, []);

  const transition = useCallback((step: StepId) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const userBudget = useMemo<number | null>(() => {
    if (userBudgetRaw === null || userBudgetRaw === undefined) return null;
    const n = Number(userBudgetRaw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }, [userBudgetRaw]);

  const startFlow = useCallback(() => {
    setState((s) => {
      const base: ChatState = {
        ...s,
        step: "budget",
        lastApiError: null,
        isSubmitting: false,
        result: null,
        notes: "",
        messages: [
          ...s.messages,
          {
            id: uid(),
            role: "bot",
            kind: "widget",
            widgetKey: "budget-check",
            createdAt: Date.now(),
          },
        ],
        widgetHydration: { ...s.widgetHydration, budgetPromptSeen: true },
      };
      return base;
    });
  }, []);

  const confirmBudgetFromUser = useCallback(() => {
    setState((s) => {
      const val = s.budget ?? userBudget ?? null;
      if (val === null) return s;
      return {
        ...s,
        budget: val,
        step: "categories",
        messages: [
          ...s.messages,
          {
            id: uid(),
            role: "user",
            kind: "text",
            text: `الميزانية: ${val.toLocaleString("ar-EG")} جنيه`,
            createdAt: Date.now(),
          },
          {
            id: uid(),
            role: "bot",
            kind: "widget",
            widgetKey: "category-select",
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, [userBudget]);

  const submitManualBudget = useCallback(
    (raw: string) => {
      const p = parseBudgetInput(raw);
      if (!p.ok) {
        setState((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              id: uid(),
              role: "bot",
              kind: "error",
              text: p.error,
              createdAt: Date.now(),
            },
          ],
        }));
        return false;
      }
      setState((s) => ({
        ...s,
        budget: p.value,
        step: "categories",
        messages: [
          ...s.messages,
          {
            id: uid(),
            role: "user",
            kind: "text",
            text: `الميزانية: ${p.value.toLocaleString("ar-EG")} جنيه`,
            createdAt: Date.now(),
          },
          {
            id: uid(),
            role: "bot",
            kind: "widget",
            widgetKey: "category-select",
            createdAt: Date.now(),
          },
        ],
      }));
      return true;
    },
    [],
  );

  const toggleCategory = useCallback((name: string) => {
    setState((s) => {
      const has = s.selectedCategories.includes(name);
      const next = has
        ? s.selectedCategories.filter((x) => x !== name)
        : [...s.selectedCategories, name];
      return {
        ...s,
        selectedCategories: next,
        weights: evenSplit(next),
      };
    });
  }, []);

  const confirmCategories = useCallback(() => {
    setState((s) => {
      if (s.selectedCategories.length === 0) return s;
      const nextWeights =
        Object.keys(s.weights).length > 0 &&
        Object.keys(s.weights).every((k) => s.selectedCategories.includes(k))
          ? s.weights
          : evenSplit(s.selectedCategories);
      return {
        ...s,
        weights: nextWeights,
        step: "weights",
        messages: [
          ...s.messages,
          {
            id: uid(),
            role: "user",
            kind: "text",
            text: `الفئات: ${s.selectedCategories.join("، ")}`,
            createdAt: Date.now(),
          },
          {
            id: uid(),
            role: "bot",
            kind: "widget",
            widgetKey: "weight-assign",
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const setWeight = useCallback((cat: string, raw: number) => {
    setState((s) => ({
      ...s,
      weights: { ...s.weights, [cat]: clampWeight(raw) },
    }));
  }, []);

  const incrementWeight = useCallback((cat: string) => {
    setState((s) => ({
      ...s,
      weights: {
        ...s.weights,
        [cat]: clampWeight((s.weights[cat] ?? 1) + 1),
      },
    }));
  }, []);

  const decrementWeight = useCallback((cat: string) => {
    setState((s) => ({
      ...s,
      weights: {
        ...s.weights,
        [cat]: clampWeight((s.weights[cat] ?? 1) - 1),
      },
    }));
  }, []);

  const confirmWeights = useCallback(() => {
    setState((s) => {
      const sum = weightsSum(s.weights);
      if (sum !== 10) return s;
      return {
        ...s,
        step: "tier",
        messages: [
          ...s.messages,
          {
            id: uid(),
            role: "user",
            kind: "text",
            text: s.selectedCategories
              .map((c) => `${c} (${s.weights[c] ?? 0})`)
              .join("، "),
            createdAt: Date.now(),
          },
          {
            id: uid(),
            role: "bot",
            kind: "widget",
            widgetKey: "tier-select",
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const selectTier = useCallback((t: Tier) => {
    setState((s) => ({
      ...s,
      tier: t,
      step: "submit",
      messages: [
        ...s.messages,
        {
          id: uid(),
          role: "user",
          kind: "text",
          text: `فئة الجودة: ${t}`,
          createdAt: Date.now(),
        },
      ],
    }));
  }, []);

  const resetToStart = useCallback(() => {
    setState(() => ({
      ...DEFAULT_STATE,
      isOpen: true,
      messages: [
        {
          id: uid(),
          role: "bot",
          kind: "widget",
          widgetKey: "start",
          createdAt: Date.now(),
        },
      ],
    }));
  }, []);

  const handleFollowUpSubmit = useCallback(
    async (submitter: (
      args: Parameters<typeof import("@/lib/api/recommendations").submitBudgetRecommendation>[0],
    ) => Promise<any>, input: string) => {
      const route = routeFollowUp(input, stateRef.current);
      const s0 = stateRef.current;
      if (route.newStep === "start") {
        setState(() => ({
          ...DEFAULT_STATE,
          isOpen: true,
          messages: [
            { id: uid(), role: "bot", kind: "widget", widgetKey: "start", createdAt: Date.now() },
          ],
        }));
        return;
      }
      if (route.newStep && route.newStep !== "submit") {
        setState((s) => {
          const patch: Partial<ChatState> = { ...route.edits, notes: route.edits.appendNotes ? `${s.notes ? s.notes + " | " : ""}${route.edits.appendNotes}` : s.notes };
          delete (patch as any).appendNotes;
          return { ...s, ...patch, step: route.newStep! };
        });
        return;
      }
      const s = stateRef.current;
      const nextNotes = route.edits.appendNotes
        ? `${s.notes ? s.notes + " | " : ""}${route.edits.appendNotes}`
        : s.notes;
      const nextBudget = route.edits.budget ?? s.budget;
      if (nextBudget === null || s.selectedCategories.length === 0 || !s.tier) {
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            { id: uid(), role: "bot", kind: "error", text: "يرجى إكمال الخطوات السابقة قبل الإرسال: الميزانية، الفئات، وفئة الجودة.", createdAt: Date.now() },
          ],
        }));
        return;
      }
      const weights = s.selectedCategories.map((c) => s.weights[c] ?? 0);
      setState((prev) => ({
        ...prev,
        notes: nextNotes,
        isSubmitting: true,
        step: "submit",
        messages: [
          ...prev.messages,
          { id: uid(), role: "user", kind: "text", text: input || "إعادة إرسال الطلب", createdAt: Date.now() },
          { id: uid(), role: "bot", kind: "widget", widgetKey: "typing", createdAt: Date.now() },
        ],
      }));
      try {
        const res = await submitter({
          budget: nextBudget,
          categories: s.selectedCategories,
          weights,
          tier: s.tier,
          notes: nextNotes,
        });
        setState((prev) => {
          const withoutLast = [...prev.messages];
          if (withoutLast.length && withoutLast[withoutLast.length - 1]!.widgetKey === "typing") {
            withoutLast.pop();
          }
          const newMessages: ChatMessage[] = [];
          if (res.errorMsg) {
            newMessages.push({
              id: uid(),
              role: "bot",
              kind: "error",
              text: res.errorMsg,
              createdAt: Date.now(),
            });
          }
          if (res.data) {
            newMessages.push({
              id: uid(),
              role: "bot",
              kind: "widget",
              widgetKey: "results",
              createdAt: Date.now(),
            });
            return {
              ...prev,
              messages: [...withoutLast, ...newMessages],
              result: res.data,
              step: "followup",
              isSubmitting: false,
              lastApiError: res.errorMsg ?? null,
            };
          }
          return {
            ...prev,
            messages: [...withoutLast, ...newMessages],
            step: "followup",
            isSubmitting: false,
            lastApiError: res.errorMsg ?? null,
          };
        });
      } catch {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          step: "followup",
          messages: [
            ...prev.messages.filter((m) => m.widgetKey !== "typing"),
            {
              id: uid(),
              role: "bot",
              kind: "error",
              text: "حدث خطأ غير متوقع أثناء الحصول على التوصيات. يرجى المحاولة مرة أخرى.",
              createdAt: Date.now(),
            },
          ],
        }));
      }
    },
    [],
  );

  const fireInitialSubmit = useCallback(
    async (submitter: any) => {
      const s = stateRef.current;
      if (s.budget === null || s.selectedCategories.length === 0 || !s.tier) return;
      const weights = s.selectedCategories.map((c) => s.weights[c] ?? 0);
      setState((prev) => ({
        ...prev,
        step: "submit",
        isSubmitting: true,
        messages: [
          ...prev.messages,
          { id: uid(), role: "bot", kind: "widget", widgetKey: "typing", createdAt: Date.now() },
        ],
      }));
      try {
        const res = await submitter({
          budget: s.budget,
          categories: s.selectedCategories,
          weights,
          tier: s.tier,
          notes: s.notes || "",
        });
        setState((prev) => {
          const withoutLast = [...prev.messages];
          if (withoutLast.length && withoutLast[withoutLast.length - 1]!.widgetKey === "typing") {
            withoutLast.pop();
          }
          const newMessages: ChatMessage[] = [];
          if (res.errorMsg) {
            newMessages.push({
              id: uid(),
              role: "bot",
              kind: "error",
              text: res.errorMsg,
              createdAt: Date.now(),
            });
          }
          if (res.data) {
            newMessages.push({
              id: uid(),
              role: "bot",
              kind: "widget",
              widgetKey: "results",
              createdAt: Date.now(),
            });
            return {
              ...prev,
              messages: [...withoutLast, ...newMessages],
              result: res.data,
              step: "followup",
              isSubmitting: false,
              lastApiError: res.errorMsg ?? null,
            };
          }
          return {
            ...prev,
            messages: [...withoutLast, ...newMessages],
            step: "followup",
            isSubmitting: false,
            lastApiError: res.errorMsg ?? null,
          };
        });
      } catch {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          step: "followup",
          messages: [
            ...prev.messages.filter((m) => m.widgetKey !== "typing"),
            {
              id: uid(),
              role: "bot",
              kind: "error",
              text: "حدث خطأ غير متوقع أثناء الحصول على التوصيات. يرجى المحاولة مرة أخرى.",
              createdAt: Date.now(),
            },
          ],
        }));
      }
    },
    [],
  );

  return {
    state,
    userBudget,
    actions: {
      setState,
      setOpen,
      toggleOpen,
      transition,
      startFlow,
      confirmBudgetFromUser,
      submitManualBudget,
      toggleCategory,
      confirmCategories,
      setWeight,
      incrementWeight,
      decrementWeight,
      confirmWeights,
      selectTier,
      resetToStart,
      pushMessage,
      handleFollowUpSubmit,
      fireInitialSubmit,
    },
  };
}

export { CHAT_CATEGORIES, TIERS };
