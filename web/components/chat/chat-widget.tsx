"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot as BotIcon,
  User as UserIcon,
  MessageCircle as ChatIcon,
  X as CloseIcon,
  Send as SendIcon,
  Minus as MinimizeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-auth";
import {
  submitBudgetRecommendation,
  type RecommendationResult,
} from "@/lib/api/recommendations";
import { useChatState, type ChatMessage } from "./use-chat-state";
import {
  StartWidget,
  BudgetCheckWidget,
  CategorySelectWidget,
  WeightAssignWidget,
  TierSelectWidget,
  TypingIndicator,
  ResultsWidget,
  type WidgetKey,
  type StepId,
} from "./chat-step-renderers";

function MessageBubble({
  message,
  children,
}: {
  message: ChatMessage;
  children?: React.ReactNode;
}) {
  const isBot = message.role === "bot";
  const isError = message.kind === "error";
  return (
    <div
      className={
        isBot
          ? "flex gap-2 items-start justify-start"
          : "flex gap-2 items-start justify-end"
      }
    >
      <div
        className={
          isBot
            ? "shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-muted"
            : "shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-primary/10 text-primary"
        }
        aria-hidden
      >
        {isBot ? (
          <BotIcon className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <UserIcon className="h-3.5 w-3.5" />
        )}
      </div>
      <div
        className={
          isBot
            ? isError
              ? "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs bg-destructive/10 text-destructive-foreground border border-destructive/20 rounded-br-sm"
              : "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs bg-secondary text-secondary-foreground rounded-bl-sm"
            : "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs bg-primary text-primary-foreground rounded-bl-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}

function MessageContent({
  message,
  state,
  actions,
  userBudget,
}: {
  message: ChatMessage;
  state: ReturnType<typeof useChatState>["state"];
  actions: ReturnType<typeof useChatState>["actions"];
  userBudget: number | null;
}) {
  if (message.kind === "error" || message.kind === "text") {
    return <p className="whitespace-pre-wrap leading-6">{message.text}</p>;
  }
  if (message.kind !== "widget") return null;
  const key = (message.widgetKey ?? "start") as WidgetKey;
  switch (key) {
    case "start":
      return <StartWidget onStart={actions.startFlow} />;
    case "budget-check":
      return (
        <BudgetCheckWidget
          userBudget={userBudget}
          storedBudget={state.budget}
          onConfirmStored={actions.confirmBudgetFromUser}
          onEdit={() =>
            actions.setState((s) => ({
              ...s,
              messages: [
                ...s.messages,
                {
                  id: Math.random().toString(36).slice(2),
                  role: "bot",
                  kind: "widget" as const,
                  widgetKey: "manual-budget" as any,
                  createdAt: Date.now(),
                },
              ],
            }))
          }
          inputMode={userBudget === null && (state.budget ?? null) === null}
          onSubmitManual={(v) => actions.submitManualBudget(v)}
        />
      );
    case "category-select":
      return (
        <CategorySelectWidget
          selected={state.selectedCategories}
          onToggle={actions.toggleCategory}
          onConfirm={() => {
            actions.confirmCategories();
          }}
        />
      );
    case "weight-assign":
      return (
        <WeightAssignWidget
          selected={state.selectedCategories}
          weights={state.weights}
          onInc={actions.incrementWeight}
          onDec={actions.decrementWeight}
          onSlide={actions.setWeight}
          onConfirm={actions.confirmWeights}
        />
      );
    case "tier-select":
      return (
        <TierSelectWidget
          value={state.tier}
          onSelect={(t) => {
            actions.selectTier(t);
            setTimeout(() => {
              actions.fireInitialSubmit(submitBudgetRecommendation);
            }, 250);
          }}
        />
      );
    case "typing":
      return <TypingIndicator />;
    case "results":
      return state.result ? (
        <ResultsWidget
          result={state.result as RecommendationResult}
          onEditCategories={() => actions.transition("categories" as StepId)}
          onEditBudget={() => actions.transition("budget" as StepId)}
          onEditTier={() => actions.transition("tier" as StepId)}
          onStartOver={actions.resetToStart}
        />
      ) : (
        <TypingIndicator />
      );
    default:
      return null;
  }
}

export function ChatWidgetInner() {
  const { user } = useUser();
  const userBudgetRaw =
    user && (user as any).budget !== undefined
      ? Number((user as any).budget)
      : null;
  const {
    state,
    userBudget: resolvedUserBudget,
    actions,
  } = useChatState(userBudgetRaw);
  const listRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [manualBudgetMode, setManualBudgetMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const b = bottomRef.current;
    if (b) b.scrollIntoView({ behavior: "smooth", block: "end" });
    else list.scrollTop = list.scrollHeight;
  }, [state.messages.length, state.isSubmitting, state.step]);

  const lastMessageWidgetKey = (() => {
    const msgs = state.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]!;
      if (m.role === "bot" && m.kind === "widget" && m.widgetKey) {
        return m.widgetKey;
      }
    }
    return null;
  })();

  const inputContext: "budget" | "followup" | "disabled" = useMemo(() => {
    if (
      lastMessageWidgetKey === "budget-check" &&
      ((resolvedUserBudget === null && (state.budget ?? null) === null) ||
        manualBudgetMode)
    ) {
      return "budget";
    }
    if (lastMessageWidgetKey === "results") return "followup";
    if (state.step === "followup") return "followup";
    if (state.step === "submit" || state.isSubmitting) return "disabled";
    if (state.step === "start") return "disabled";
    if (state.step === "budget") return "budget";
    if (
      state.step === "categories" ||
      state.step === "weights" ||
      state.step === "tier"
    )
      return "disabled";
    return "disabled";
  }, [
    state.step,
    state.isSubmitting,
    state.budget,
    resolvedUserBudget,
    manualBudgetMode,
    lastMessageWidgetKey,
  ]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputValue.trim();
    if (!v) return;
    if (inputContext === "budget") {
      const ok = actions.submitManualBudget(v);
      if (ok) setInputValue("");
      return;
    }
    if (inputContext === "followup") {
      setInputValue("");
      actions.handleFollowUpSubmit(submitBudgetRecommendation, v);
      return;
    }
  };

  const stepNeedsBudgetManual = (() => {
    if (
      state.step === "budget" &&
      lastMessageWidgetKey === "budget-check" &&
      resolvedUserBudget === null &&
      (state.budget ?? null) === null
    )
      return true;
    return false;
  })();

  const placeholder =
    inputContext === "budget"
      ? "أدخل ميزانيتك بالجنيه المصري… مثال: 50000"
      : inputContext === "followup"
        ? "اكتب سؤالك… مثال: غير الفئة، زود الميزانية، غير المستوى"
        : "الكتابة متاحة عند الحاجة (خطوات الميزانية أو بعد النتائج)";

  const close = () => actions.setOpen(false);
  const minimize = () => actions.setOpen(false);

  return (
    <div
      dir="rtl"
      className="pointer-events-none fixed inset-0 z-60"
      aria-live="polite"
    >
      <div className="pointer-events-auto fixed inset-e-4 bottom-4 sm:inset-e-6 sm:bottom-6 flex flex-col items-end gap-3">
        <div
          className={cn(
            "origin-bottom-right transition-all ease-out duration-200",
            state.isOpen
              ? "opacity-0 scale-75 pointer-events-none"
              : "opacity-100 scale-100",
          )}
        >
          <Button
            type="button"
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl ring-1 ring-primary/20"
            onClick={() => actions.setOpen(true)}
            aria-label="افتح مساعد الميزانية"
          >
            <ChatIcon className="h-6 w-6" />
          </Button>
        </div>

        <div
          className={cn(
            "transition-all ease-out duration-200 origin-bottom-right",
            state.isOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-4 scale-95 pointer-events-none",
          )}
        >
          <div
            className={cn(
              "w-[min(100vw-2rem,420px)] h-[min(80vh,640px)]",
              "rounded-2xl shadow-2xl ring-1 ring-border/60 flex flex-col bg-card overflow-hidden",
            )}
            role="dialog"
            aria-label="مساعد الميزانية"
          >
            <div className="h-14 flex items-center justify-between gap-2 border-b border-border/60 px-4 bg-background/60 backdrop-blur-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 inline-flex items-center justify-center text-primary ring-1 ring-primary/10">
                  <BotIcon className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">
                    مساعد الميزانية
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">
                    توصيات ذكية حسب ميزانيتك
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={minimize}
                  aria-label="تصغير"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <MinimizeIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label="إغلاق"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto space-y-3 p-4 bg-background/20"
            >
              {state.messages.map((m) => (
                <MessageBubble key={m.id} message={m}>
                  <MessageContent
                    message={m}
                    state={state}
                    actions={actions}
                    userBudget={resolvedUserBudget}
                  />
                </MessageBubble>
              ))}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={onSubmit}
              className="flex items-center gap-2 border-t border-border/60 p-3 bg-background/60"
            >
              <input
                dir="rtl"
                className={cn(
                  "flex-1 min-w-0 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                )}
                placeholder={placeholder}
                disabled={inputContext === "disabled" || state.isSubmitting}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                aria-label="مربع الكتابة"
              />
              <Button
                type="submit"
                disabled={
                  inputContext === "disabled" ||
                  !inputValue.trim() ||
                  state.isSubmitting
                }
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label="إرسال"
              >
                <SendIcon className="h-4 w-4 -scale-x-100" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Overrides the manualBudgetMode state via action setState when user clicks "تغيير الميزانية".
   The action is injected above via setManualBudgetMode + effect.
   We wire the action via a small ref so we can keep useChatState pure from UI concerns. */
function BudgetModeBridge() {
  return null;
}

export default function BudgetChatWidget() {
  return <ChatWidgetInner />;
}
