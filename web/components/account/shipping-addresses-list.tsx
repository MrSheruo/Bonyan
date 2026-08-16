"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  useForm,
  type SubmitHandler,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus as PlusIcon,
  MapPin as MapPinIcon,
  Home as HomeIcon,
  Building as BuildingIcon,
  Briefcase as BriefcaseIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  Loader2 as Loader2Icon,
  X as XIcon,
  Star as StarIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useAddAddress,
  useAddresses,
  useDeleteAddress,
  useUpdateAddress,
} from "@/lib/hooks/use-addresses";
import type {
  Address,
  AddressLabel,
  CreateAddressInput,
  UpdateAddressInput,
} from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const LABEL_OPTIONS: { value: AddressLabel; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "home", label: "Home", Icon: HomeIcon },
  { value: "work", label: "Work", Icon: BriefcaseIcon },
  { value: "other", label: "Other", Icon: BuildingIcon },
];

const dialogSchema = z.object({
  label: z.enum(["home", "work", "other"]).default("home"),
  line1: z.string().trim().min(1, "Street address is required"),
  line2: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  city: z.string().trim().min(1, "City is required"),
  governorate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  postalCode: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  isDefault: z.boolean().default(false),
});

type DialogFormValues = z.infer<typeof dialogSchema>;

function applyFieldErrors(
  issues: unknown,
  setError: UseFormSetError<FieldValues>,
  messageToText: (v: unknown) => string = (v) =>
    Array.isArray(v) ? String(v[0] ?? "Invalid value") : String(v ?? "Invalid value")
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

function inlineErr(msg: unknown): string | undefined {
  if (!msg) return undefined;
  return String(
    (msg as { message?: string } | undefined)?.message ?? msg
  );
}

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Address | null;
}

function AddressDialog({ open, onOpenChange, editing }: AddressDialogProps) {
  const addMutation = useAddAddress();
  const updateMutation = useUpdateAddress();
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const isUpdate = editing !== null;
  const isPending = addMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<DialogFormValues>({
    resolver: zodResolver(dialogSchema) as any,
    defaultValues: {
      label: "home",
      line1: "",
      line2: "",
      city: "",
      governorate: "",
      postalCode: "",
      isDefault: false,
    },
  });

  useEffect(() => {
    if (open) {
      clearErrors();
      setFormAlert(null);
      if (editing) {
        reset({
          label: (editing.label as AddressLabel) ?? "home",
          line1: editing.line1 ?? "",
          line2: (editing.line2 as string | undefined) ?? "",
          city: editing.city ?? "",
          governorate: (editing.governorate as string | undefined) ?? "",
          postalCode: (editing.postalCode as string | undefined) ?? "",
          isDefault: !!editing.isDefault,
        });
      } else {
        reset({
          label: "home",
          line1: "",
          line2: "",
          city: "",
          governorate: "",
          postalCode: "",
          isDefault: false,
        });
      }
    }
  }, [editing, open, reset, clearErrors]);

  const watchLabel = watch("label");
  const watchIsDefault = watch("isDefault");

  const onSubmit: SubmitHandler<DialogFormValues> = async (values) => {
    clearErrors();
    setFormAlert(null);
    try {
      const payload: CreateAddressInput = {
        label: values.label,
        line1: values.line1,
        line2: values.line2,
        city: values.city,
        governorate: values.governorate,
        postalCode: values.postalCode,
        isDefault: !!values.isDefault,
      };

      if (isUpdate && editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: payload as UpdateAddressInput,
        });
        toast.success("Address updated");
      } else {
        await addMutation.mutateAsync(payload);
        toast.success("Address added");
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body: any = (err as any).body ?? null;
        const issues: unknown =
          body && typeof body === "object" && "issues" in body ? body.issues : null;
        const mapped = issues
          ? applyFieldErrors(
              issues,
              setError as UseFormSetError<FieldValues>
            )
          : false;
        if (!mapped) {
          setFormAlert(err.message);
          toast.error(err.message);
        }
        return;
      }
      const msg =
        err instanceof ApiError ? err.message : "Something went wrong.";
      setFormAlert(msg);
      toast.error(msg);
    }
  };

  const errorsCount = useMemo(
    () => Object.keys(errors).length,
    [errors]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isUpdate ? "Edit Address" : "Add New Address"}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Update delivery details for this address."
              : "Save a new address to check out faster next time."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit as any)}
          className="flex flex-col gap-5"
        >
          <div className="space-y-2">
            <Label>Label</Label>
            <div className="grid grid-cols-3 gap-2">
              {LABEL_OPTIONS.map(({ value, label: lbl, Icon }) => {
                const active = watchLabel === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setValue("label", value, { shouldDirty: true });
                      clearErrors("label");
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all cursor-pointer",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {lbl}
                  </button>
                );
              })}
            </div>
            {errors.label ? (
              <p className="text-xs text-destructive">
                {inlineErr(errors.label)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="line1">Street address</Label>
              <Input
                id="line1"
                autoComplete="address-line1"
                disabled={isPending}
                {...register("line1")}
              />
              {errors.line1 ? (
                <p className="text-xs text-destructive">
                  {inlineErr(errors.line1)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="line2">Apartment, suite, etc. (optional)</Label>
              <Input
                id="line2"
                autoComplete="address-line2"
                disabled={isPending}
                {...register("line2")}
              />
              {errors.line2 ? (
                <p className="text-xs text-destructive">
                  {inlineErr(errors.line2)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                autoComplete="address-level2"
                disabled={isPending}
                {...register("city")}
              />
              {errors.city ? (
                <p className="text-xs text-destructive">
                  {inlineErr(errors.city)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="governorate">Governorate (optional)</Label>
              <Input
                id="governorate"
                autoComplete="address-level1"
                disabled={isPending}
                {...register("governorate")}
              />
              {errors.governorate ? (
                <p className="text-xs text-destructive">
                  {inlineErr(errors.governorate)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="postalCode">Postal code (optional)</Label>
              <Input
                id="postalCode"
                autoComplete="postal-code"
                disabled={isPending}
                {...register("postalCode")}
              />
              {errors.postalCode ? (
                <p className="text-xs text-destructive">
                  {inlineErr(errors.postalCode)}
                </p>
              ) : null}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={!!watchIsDefault}
              onChange={(e) => {
                setValue("isDefault", e.target.checked, { shouldDirty: true });
                clearErrors("isDefault");
              }}
              className="mt-0.5 size-4 rounded border-input text-primary focus:ring-3 focus:ring-ring/50 cursor-pointer"
            />
            <span className="flex flex-col text-sm">
              <span className="font-medium flex items-center gap-1.5">
                <StarIcon className="h-3.5 w-3.5 text-accent" />
                Use as my default address
              </span>
              <span className="text-xs text-muted-foreground">
                This address will be pre-selected at checkout.
              </span>
            </span>
          </label>
          {errors.isDefault ? (
            <p className="text-xs text-destructive -mt-3">
              {inlineErr(errors.isDefault)}
            </p>
          ) : null}

          {errorsCount > 0 ? (
            <Alert className="bg-destructive/10 border-destructive/30">
              <AlertTitle className="text-sm text-destructive">
                Please fix the errors marked below
              </AlertTitle>
              <AlertDescription className="text-sm text-destructive/90">
                {errorsCount} field{errorsCount === 1 ? "" : "s"} with errors.
              </AlertDescription>
            </Alert>
          ) : formAlert ? (
            <Alert className="bg-destructive/10 border-destructive/30">
              <AlertTitle className="text-sm text-destructive">
                Unable to save address
              </AlertTitle>
              <AlertDescription className="text-sm text-destructive/90">
                {formAlert}
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || (isUpdate && !isDirty)}>
              {isPending ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : isUpdate ? (
                "Save Changes"
              ) : (
                "Add Address"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  deletePending,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const labelCfg = LABEL_OPTIONS.find((l) => l.value === address.label) ?? LABEL_OPTIONS[2];
  const LabelIcon = labelCfg.Icon;

  return (
    <li className="group relative rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md">
      <header className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center justify-center size-9 rounded-lg bg-accent/15 text-accent-foreground">
            <LabelIcon className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground flex items-center gap-2">
              {labelCfg.label}
              {address.isDefault ? (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-transparent">
                  Default
                </Badge>
              ) : null}
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={`Edit ${labelCfg.label} address`}
            onClick={onEdit}
          >
            <PencilIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={`Delete ${labelCfg.label} address`}
            onClick={onDelete}
            disabled={deletePending}
          >
            {deletePending ? (
              <Loader2Icon className="h-4 w-4 animate-spin text-destructive" />
            ) : (
              <Trash2Icon className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </header>

      <address className="not-italic text-sm text-foreground/90 leading-relaxed flex flex-col gap-0.5">
        <span>{address.line1}</span>
        {address.line2 ? <span>{address.line2}</span> : null}
        <span>
          {address.city}
          {address.governorate ? `, ${address.governorate}` : ""}
          {address.postalCode ? `  ${address.postalCode}` : ""}
        </span>
      </address>

      <div className="h-px bg-border/60" />

      <footer className="flex items-center justify-between">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs font-medium text-destructive/80 hover:text-destructive hover:underline inline-flex items-center gap-1 cursor-pointer"
          disabled={deletePending}
        >
          Delete
        </button>
      </footer>
    </li>
  );
}

export function ShippingAddressesList() {
  const { data, isLoading, error } = useAddresses();
  const deleteMutation = useDeleteAddress();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditing(address);
    setDialogOpen(true);
  };

  const handleDelete = async (address: Address) => {
    try {
      await deleteMutation.mutateAsync(address.id);
      toast.success("Address removed");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete address.";
      toast.error(msg);
    }
  };

  const sortedAddresses = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      if (!!b.isDefault !== !!a.isDefault) return (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0);
      return String(a.id).localeCompare(String(b.id));
    });
  }, [data]);

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Shipping Addresses
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage the addresses we use to deliver your handmade pieces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleAdd}
            disabled={isLoading}
            className="md:self-start inline-flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Address
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <li key={i} className="rounded-2xl border border-border/60 p-5 space-y-4">
              <Skeleton className="h-9 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <Alert className="bg-destructive/10 border-destructive/30">
          <AlertTitle className="text-sm text-destructive">
            Could not load addresses
          </AlertTitle>
          <AlertDescription className="text-sm text-destructive/90">
            {error instanceof ApiError ? error.message : "Refresh and try again."}
          </AlertDescription>
        </Alert>
      ) : sortedAddresses.length === 0 ? (
        <div className="min-h-[360px] rounded-2xl border border-dashed border-border/80 bg-card/60 flex flex-col items-center justify-center gap-5 text-center p-8">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-accent/15 text-accent-foreground">
            <MapPinIcon className="h-7 w-7" />
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="font-semibold text-xl tracking-tight">
              No shipping addresses yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Add your first delivery address — it&apos;ll speed up checkout
              and let us track the fastest artisan courier routes.
            </p>
          </div>
          <Button type="button" onClick={handleAdd}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Your First Address
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedAddresses.map((addr) => (
            <AddressCard
              key={String(addr.id)}
              address={addr}
              onEdit={() => handleEdit(addr)}
              onDelete={() => handleDelete(addr)}
              deletePending={
                deleteMutation.isPending &&
                String(deleteMutation.variables) === String(addr.id)
              }
            />
          ))}
        </ul>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </section>
  );
}
