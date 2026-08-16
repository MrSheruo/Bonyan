"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  useForm,
  type SubmitHandler,
  type FieldValues,
  type FieldErrors,
  type UseFormSetError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser, ME_QUERY_KEY } from "@/lib/hooks/use-auth";
import { fetchClient, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const MARITAL_STATUSES = ["single", "married"] as const;

type MaritalStatusValue = (typeof MARITAL_STATUSES)[number] | "";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  maritalStatus: z
    .enum(["", ...MARITAL_STATUSES] as [string, ...string[]])
    .transform((v) => (v === "" ? "" : v)) as z.ZodType<MaritalStatusValue>,
  budget: z.string().optional(),
  image: z.instanceof(File).optional(),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

function applyFieldErrors(
  issues: unknown,
  setError: UseFormSetError<FieldValues>,
  messageToText: (v: unknown) => string = (v) =>
    Array.isArray(v) ? String(v[0]) : String(v)
): boolean {
  if (!issues || typeof issues !== "object") return false;
  let applied = 0;
  for (const [field, messages] of Object.entries(issues as Record<string, unknown>)) {
    if (!messages) continue;
    setError(field as any, {
      type: "server",
      message: messageToText(messages),
    });
    applied++;
  }
  return applied > 0;
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm transition-[color,box-shadow] outline-none",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface UpdateProfileResponse {
  id?: string;
  name?: string;
  email?: string;
  image?: string | null;
  phone?: string | null;
  maritalStatus?: string | null;
  budget?: number | null;
  [k: string]: unknown;
}

async function updateProfile(formData: FormData): Promise<UpdateProfileResponse> {
  return fetchClient<UpdateProfileResponse>("/users/me", {
    method: "PATCH",
    body: formData,
  });
}

const parseBudgetFormValue = (v: string | undefined): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function AccountSettingsForm() {
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useUser();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [serverAlert, setServerAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      maritalStatus: "",
      budget: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset(
        {
          name: user.name ?? "",
          phone: user.phone ?? "",
          maritalStatus:
            (user.maritalStatus as MaritalStatusValue) ?? "",
          budget:
            user.budget !== undefined && user.budget !== null
              ? String(Number(user.budget))
              : "",
        },
        { keepDirty: false }
      );
      if (user.image) setImagePreview(user.image);
      clearErrors();
      setServerAlert(null);
    }
  }, [user, reset, clearErrors]);

  const watchBudget = watch("budget");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setValue("image", file, { shouldDirty: true });
    clearErrors("image");
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const onSubmit: SubmitHandler<UpdateProfileInput> = async (form) => {
    clearErrors();
    setServerAlert(null);
    try {
      if (!user) return;

      const payload = new FormData();
      let changed = false;

      if (form.name !== (user.name ?? "")) {
        payload.set("name", form.name);
        changed = true;
      }

      const phoneVal = form.phone ?? "";
      if (phoneVal !== (user.phone ?? "")) {
        if (phoneVal) payload.set("phone", phoneVal);
        changed = true;
      }

      const msVal = form.maritalStatus ?? "";
      if (msVal !== (user.maritalStatus ?? "")) {
        if (msVal) payload.set("maritalStatus", msVal);
        changed = true;
      }

      const budgetForm = parseBudgetFormValue(form.budget);
      const budgetUser =
        user.budget === undefined || user.budget === null
          ? undefined
          : Number(user.budget);
      if (budgetForm !== budgetUser) {
        if (budgetForm !== undefined) {
          payload.set("budget", String(budgetForm));
        }
        changed = true;
      }

      if (pendingFile) {
        payload.set("image", pendingFile);
        changed = true;
      }

      if (!changed) {
        toast.info("No changes to save.");
        return;
      }

      const updated = await updateProfile(payload);

      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });

      reset(
        {
          name: updated.name ?? form.name,
          phone: (updated.phone as string | undefined) ?? form.phone ?? "",
          maritalStatus:
            (updated.maritalStatus as MaritalStatusValue) ??
            form.maritalStatus ??
            "",
          budget:
            updated.budget !== undefined && updated.budget !== null
              ? String(Number(updated.budget))
              : form.budget,
        },
        { keepDirty: false }
      );
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success("Profile updated", {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body: any = (err as any).body ?? null;
        const issues: unknown =
          body && typeof body === "object" && "issues" in body ? body.issues : null;
        const mapped = issues
          ? applyFieldErrors(issues, setError as UseFormSetError<FieldValues>, (v) =>
              Array.isArray(v) ? String(v[0] ?? "Invalid value") : String(v ?? "Invalid value")
            )
          : false;
        if (!mapped) {
          setServerAlert(err.message);
          toast.error(err.message);
        }
        return;
      }
      const message =
        err instanceof ApiError ? err.message : "Failed to update profile.";
      setServerAlert(message);
      toast.error(message);
    }
  };

  const errorsCount = useMemo(
    () => Object.keys(errors).length,
    [errors]
  );

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Account Settings</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Update your personal information, contact details, and profile
          picture.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative size-24 shrink-0 rounded-full overflow-hidden border-2 border-border bg-muted">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-muted-foreground">
                  <Upload className="h-8 w-8 opacity-60" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload profile image"
                className="absolute inset-0 bg-foreground/0 hover:bg-foreground/30 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Upload className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-base">Profile Picture</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  JPG, PNG, or WebP. Max 5MB.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                {pendingFile ? (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {pendingFile.name}
                  </span>
                ) : null}
                {imagePreview && !isUserLoading ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => {
                      setImagePreview(user?.image ?? null);
                      setPendingFile(null);
                      setValue("image", undefined, {
                        shouldDirty: pendingFile !== null,
                      });
                      clearErrors("image");
                      if (fileInputRef.current)
                        fileInputRef.current.value = "";
                    }}
                  >
                    Revert
                  </Button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {errors.image ? (
                <p className="text-xs text-destructive">
                  {String(
                    (errors.image as { message?: string } | undefined)
                      ?.message ?? ""
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                autoComplete="name"
                disabled={isSubmitting || isUserLoading}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">
                  {String(errors.name.message)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="h-9 w-full rounded-md border border-border/80 bg-muted/40 px-2.5 flex items-center text-sm text-muted-foreground">
                {isUserLoading ? "Loading…" : user?.email || "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support to update your email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+20 100 000 0000"
                disabled={isSubmitting || isUserLoading}
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">
                  {String(errors.phone.message)}
                </p>
              ) : null}
            </div>

            <SelectField
              id="maritalStatus"
              label="Marital Status"
              placeholder="Select status"
              value={String(watch("maritalStatus") ?? "")}
              onChange={(val) => {
                setValue("maritalStatus", val as MaritalStatusValue, {
                  shouldDirty: true,
                });
                clearErrors("maritalStatus");
              }}
              disabled={isSubmitting || isUserLoading}
              error={
                errors.maritalStatus?.message
                  ? String(errors.maritalStatus.message)
                  : undefined
              }
              options={[
                { label: "Single", value: "single" },
                { label: "Married", value: "married" },
              ]}
            />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="budget">Monthly Budget (EGP)</Label>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={isSubmitting || isUserLoading}
                aria-invalid={!!errors.budget}
                value={watchBudget ?? ""}
                onChange={(e) => {
                  setValue("budget", e.target.value, { shouldDirty: true });
                  clearErrors("budget");
                }}
              />
              {errors.budget ? (
                <p className="text-xs text-destructive">
                  {String(
                    (errors.budget as { message?: string } | undefined)
                      ?.message ?? ""
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {errorsCount > 0 ? (
          <Alert className="bg-destructive/10 border-destructive/30">
            <AlertTitle className="text-sm text-destructive">
              Please fix the errors marked below
            </AlertTitle>
            <AlertDescription className="text-sm text-destructive/90">
              {errorsCount} field{errorsCount === 1 ? "" : "s"} with server or
              client validation errors.
            </AlertDescription>
          </Alert>
        ) : serverAlert ? (
          <Alert className="bg-destructive/10 border-destructive/30">
            <AlertTitle className="text-sm text-destructive">
              Unable to save
            </AlertTitle>
            <AlertDescription className="text-sm text-destructive/90">
              {serverAlert}
            </AlertDescription>
          </Alert>
        ) : isDirty ? (
          <Alert className="bg-accent/10 border-accent/30">
            <AlertTitle className="text-sm">You have unsaved changes</AlertTitle>
            <AlertDescription className="text-sm">
              Press Save Changes to persist your updates.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
