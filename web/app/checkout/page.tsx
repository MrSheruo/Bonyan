"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus as PlusIcon,
  MapPin as MapPinIcon,
  Home as HomeIcon,
  Building as BuildingIcon,
  Briefcase as BriefcaseIcon,
  Star as StarIcon,
  Loader2 as Loader2Icon,
  Check as CheckIcon,
  ShoppingBag as ShoppingBagIcon,
  Truck as TruckIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  ArrowLeft as ArrowLeftIcon,
  Package as PackageIcon,
} from "lucide-react";
import { z } from "zod";
import {
  useForm,
  type SubmitHandler,
  type FieldValues,
  type UseFormSetError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AuthGuard } from "@/components/auth-guard";

import { useProduct } from "@/lib/hooks/use-products";
import { useAddresses, useAddAddress } from "@/lib/hooks/use-addresses";
import { buyNow, type Order } from "@/lib/api/orders";
import type { Address } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import type { Product, ProductListing } from "@/lib/api/products";
import { cn } from "@/lib/utils";

const LABEL_OPTIONS: {
  value: "home" | "work" | "other";
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
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
  saveAddress: z.boolean().default(true),
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
  return String((msg as { message?: string } | undefined)?.message ?? msg);
}

function formatOrderTotal(order: Order): number {
  return order.items.reduce(
    (sum, it) => sum + Number(it.totalPrice ?? 0),
    0
  );
}

function formatUnitPrice(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "0.00";
  return Number(v).toFixed(2);
}

interface CheckoutAddAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (address: Address) => void;
}

function CheckoutAddAddressDialog({
  open,
  onOpenChange,
  onCreated,
}: CheckoutAddAddressDialogProps) {
  const addMutation = useAddAddress();
  const [formAlert, setFormAlert] = useState<string | null>(null);

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
      saveAddress: true,
    },
  });

  useEffect(() => {
    if (open) {
      clearErrors();
      setFormAlert(null);
      reset({
        label: "home",
        line1: "",
        line2: "",
        city: "",
        governorate: "",
        postalCode: "",
        isDefault: false,
        saveAddress: true,
      });
    }
  }, [open, reset, clearErrors]);

  const watchLabel = watch("label");
  const watchIsDefault = watch("isDefault");
  const watchSaveAddress = watch("saveAddress");

  const onSubmit: SubmitHandler<DialogFormValues> = async (values) => {
    clearErrors();
    setFormAlert(null);
    try {
      if (values.saveAddress) {
        const payload = {
          label: values.label,
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          governorate: values.governorate,
          postalCode: values.postalCode,
          isDefault: !!values.isDefault,
        };
        const created = await addMutation.mutateAsync(payload);
        toast.success("Address saved");
        onCreated(created);
      } else {
        const stub: Address = {
          id: `unsaved-${Date.now()}`,
          label: values.label,
          line1: values.line1,
          line2: values.line2 ?? null,
          city: values.city,
          governorate: values.governorate ?? null,
          postalCode: values.postalCode ?? null,
          isDefault: !!values.isDefault,
        };
        onCreated(stub);
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body: any = (err as any).body ?? null;
        const issues: unknown =
          body && typeof body === "object" && "issues" in body
            ? body.issues
            : null;
        const mapped = issues
          ? applyFieldErrors(issues, setError as UseFormSetError<FieldValues>)
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
          <DialogTitle>Add a delivery address</DialogTitle>
          <DialogDescription>
            Choose to save it for future checkouts, or use it just this once.
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
                disabled={addMutation.isPending}
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
                disabled={addMutation.isPending}
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
                disabled={addMutation.isPending}
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
                disabled={addMutation.isPending}
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
                disabled={addMutation.isPending}
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
              checked={!!watchSaveAddress}
              onChange={(e) => {
                setValue("saveAddress", e.target.checked, {
                  shouldDirty: true,
                });
                clearErrors("saveAddress");
              }}
              className="mt-0.5 size-4 rounded border-input text-primary focus:ring-3 focus:ring-ring/50 cursor-pointer"
            />
            <span className="flex flex-col text-sm">
              <span className="font-medium">Save this address</span>
              <span className="text-xs text-muted-foreground">
                If disabled, we&apos;ll only use it for this order.
              </span>
            </span>
          </label>

          {watchSaveAddress ? (
            <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={!!watchIsDefault}
                onChange={(e) => {
                  setValue("isDefault", e.target.checked, {
                    shouldDirty: true,
                  });
                  clearErrors("isDefault");
                }}
                className="mt-0.5 size-4 rounded border-input text-primary focus:ring-3 focus:ring-ring/50 cursor-pointer"
              />
              <span className="flex flex-col text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <StarIcon className="h-3.5 w-3.5 text-accent" />
                  Set as default
                </span>
                <span className="text-xs text-muted-foreground">
                  Pre-selected at future checkouts.
                </span>
              </span>
            </label>
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
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMutation.isPending || !isDirty}>
              {addMutation.isPending ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const listingIdParam = searchParams.get("listingId");
  const productIdParam = searchParams.get("productId");
  const quantityParam = searchParams.get("quantity");

  const listingId = listingIdParam ? Number(listingIdParam) : null;
  const quantity = Math.max(1, Math.min(99, Number(quantityParam ?? "1") || 1));

  const { data: product, isLoading: productLoading } = useProduct(
    productIdParam ?? null
  );
  const {
    data: addresses,
    isLoading: addressesLoading,
    error: addressesError,
  } = useAddresses();

  const [selectedAddressOrTemp, setSelectedAddressOrTemp] = useState<
    Address | null
  >(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAlert, setSubmitAlert] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Auto-select default (or first) address when the list loads
  useEffect(() => {
    if (!addresses) return;
    if (selectedAddressOrTemp !== null) {
      // Ensure still in list (not deleted) otherwise reselect default
      if (
        typeof selectedAddressOrTemp.id === "string" &&
        selectedAddressOrTemp.id.startsWith("unsaved-")
      ) {
        return; // keep temp unsaved address
      }
      const stillExists = addresses.some(
        (a) => String(a.id) === String(selectedAddressOrTemp.id)
      );
      if (stillExists) return;
    }
    const def =
      addresses.find((a) => !!a.isDefault) ??
      (addresses.length > 0 ? addresses[0] : null);
    setSelectedAddressOrTemp(def);
  }, [addresses]);

  const { listing: resolvedListing, unitPrice } = useMemo<{
    listing: ProductListing | null;
    unitPrice: number;
  }>(() => {
    if (!product || !Array.isArray(product.listings)) {
      return { listing: null, unitPrice: 0 };
    }
    const match =
      product.listings.find((l) => l.id === listingId) ??
      product.listings[0] ??
      null;
    return {
      listing: match,
      unitPrice: match ? Number(match.effectivePrice) : 0,
    };
  }, [product, listingId]);

  const lineSubtotal = unitPrice * quantity;
  const loading = productLoading || addressesLoading;
  const canPlaceOrder =
    listingId !== null &&
    unitPrice > 0 &&
    quantity >= 1 &&
    selectedAddressOrTemp !== null &&
    !isSubmitting &&
    !confirmedOrder;

  const buildAddressBody = (
    a: Address
  ):
    | { addressId: number }
    | {
        addressLine1: string;
        addressLine2?: string;
        addressCity: string;
        addressGovernorate?: string;
        addressPostalCode?: string;
        addressLabel?: "home" | "work" | "other";
        saveAddress: boolean;
      } => {
    const idNumeric = typeof a.id === "number" || /^\d+$/.test(String(a.id));
    if (idNumeric && !String(a.id).startsWith("unsaved-")) {
      return { addressId: Number(a.id) };
    }
    const label =
      a.label === "home" || a.label === "work" || a.label === "other"
        ? a.label
        : undefined;
    const gov = a.governorate;
    const post = a.postalCode;
    return {
      addressLine1: a.line1,
      ...(a.line2 ? { addressLine2: a.line2 } : {}),
      addressCity: a.city,
      ...(gov ? { addressGovernorate: String(gov) } : {}),
      ...(post ? { addressPostalCode: String(post) } : {}),
      ...(label ? { addressLabel: label } : {}),
      saveAddress: false,
    };
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressOrTemp || listingId === null) {
      setSubmitAlert("Select a delivery address before placing your order.");
      return;
    }
    setSubmitAlert(null);
    setIsSubmitting(true);
    try {
      const address = buildAddressBody(selectedAddressOrTemp);
      const result = await buyNow({
        listingId,
        quantity,
        address,
      });
      setConfirmedOrder(result.order);
      toast.success("Order placed successfully");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body: any = (err as any).body ?? null;
        const issues: unknown =
          body && typeof body === "object" && "issues" in body
            ? body.issues
            : null;
        let mappedTopLevel = false;
        if (issues && typeof issues === "object") {
          const record = issues as Record<string, unknown>;
          if ("address" in record) {
            const nested = record.address;
            if (Array.isArray(nested) || typeof nested === "string") {
              setSubmitAlert(
                Array.isArray(nested)
                  ? String(nested[0] ?? "Invalid address")
                  : String(nested)
              );
              mappedTopLevel = true;
            } else if (nested && typeof nested === "object") {
              const msgs = Object.values(nested)[0];
              setSubmitAlert(
                Array.isArray(msgs) ? String(msgs[0] ?? "Invalid address") : "Invalid address"
              );
              mappedTopLevel = true;
            }
          }
          if (!mappedTopLevel) {
            const generic = Object.values(record)[0];
            const msg = Array.isArray(generic)
              ? String(generic[0] ?? err.message)
              : String(err.message ?? "Unable to place order");
            setSubmitAlert(msg);
            mappedTopLevel = true;
          }
        }
        if (!mappedTopLevel) setSubmitAlert(err.message);
      } else {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Failed to place order — please try again.";
        setSubmitAlert(msg);
      }
      toast.error("We couldn't place your order — please review details below.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderTotal = confirmedOrder
    ? formatOrderTotal(confirmedOrder)
    : lineSubtotal;

  if (confirmedOrder) {
    return (
      <main className="w-full bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12 py-10 md:py-16 space-y-10">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="inline-flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Thank you — order placed!
              </h1>
              <p className="text-base text-muted-foreground max-w-xl">
                Your handmade piece has been ordered. The artisan will review
                it shortly, and shipping details will land in your inbox.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingBagIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Order number
                  </p>
                  <p className="font-mono font-semibold text-lg">
                    #{confirmedOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Total
                </p>
                <p className="font-bold text-2xl text-primary">
                  ${formatUnitPrice(orderTotal)}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </h2>
                <ul className="space-y-3">
                  {[
                    {
                      Icon: ClockIcon,
                      title: "Order placed",
                      desc: "Waiting for artisan confirmation",
                      done: true,
                    },
                    {
                      Icon: PackageIcon,
                      title: "Preparing",
                      desc: "Artisan is crafting & packaging your piece",
                      done:
                        (confirmedOrder.items[0]?.status ?? "pending") !==
                        "pending",
                    },
                    {
                      Icon: TruckIcon,
                      title: "On the way",
                      desc: "Out for delivery with artisan courier",
                      done:
                        (confirmedOrder.items[0]?.status ?? "pending") ===
                        "on_the_way" ||
                        (confirmedOrder.items[0]?.status ?? "pending") ===
                          "delivered",
                    },
                    {
                      Icon: CheckCircleIcon,
                      title: "Delivered",
                      desc: "Enjoy your handmade piece!",
                      done:
                        (confirmedOrder.items[0]?.status ?? "pending") ===
                        "delivered",
                    },
                  ].map(({ Icon, title, desc, done }) => (
                    <li
                      key={title}
                      className="flex items-start gap-3 rounded-xl p-3 border border-border/60 bg-background/60"
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-7 items-center justify-center rounded-full transition-colors",
                          done
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex flex-col">
                        <span
                          className={cn(
                            "font-semibold",
                            done ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {desc}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Delivery address
                </h2>
                <address className="not-italic rounded-xl border border-border/60 bg-background/60 p-4 space-y-1 text-sm leading-relaxed">
                  {confirmedOrder.addressLabel ? (
                    <p className="inline-flex items-center mb-1">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-transparent capitalize"
                      >
                        {confirmedOrder.addressLabel}
                      </Badge>
                    </p>
                  ) : null}
                  <p>{confirmedOrder.addressLine1}</p>
                  {confirmedOrder.addressLine2 ? (
                    <p>{confirmedOrder.addressLine2}</p>
                  ) : null}
                  <p>
                    {confirmedOrder.addressCity}
                    {confirmedOrder.addressGovernorate
                      ? `, ${confirmedOrder.addressGovernorate}`
                      : ""}
                    {confirmedOrder.addressPostalCode
                      ? `  ${confirmedOrder.addressPostalCode}`
                      : ""}
                  </p>
                </address>

                <div className="flex flex-col gap-3 pt-2">
                  <Link
                    href="/account"
                    className={cn(
                      Button.prototype.className,
                      "inline-flex items-center justify-center"
                    )}
                  >
                    View all orders
                  </Link>
                  <Link
                    href="/products"
                    className={cn(
                      Button.prototype.className,
                      "inline-flex items-center justify-center"
                    ) + " variant-outline"}
                  >
                    Keep browsing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!listingId || listingIdParam === null || Number.isNaN(listingId)) {
    return (
      <main className="w-full bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Nothing to check out
          </h1>
          <Alert>
            <AlertTitle>Missing order details</AlertTitle>
            <AlertDescription>
              Please select a product and choose Buy Now to start checkout.
            </AlertDescription>
          </Alert>
          <Link
            href="/products"
            className={cn(Button.prototype.className, "inline-flex items-center gap-2")}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-10">
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="hover:text-foreground">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/products" className="hover:text-foreground">
                  Products
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checkout</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* LEFT: Address selection */}
          <section className="lg:col-span-3 space-y-6">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Checkout
              </h1>
              <p className="text-base text-muted-foreground">
                Review your item and choose a delivery address to complete
                your order.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4" />
                  Delivery address
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                  className="inline-flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add new address
                </Button>
              </div>

              {addressesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Skeleton className="h-40 rounded-2xl bg-muted/60" />
                  <Skeleton className="h-40 rounded-2xl bg-muted/60" />
                </div>
              ) : addressesError ? (
                <Alert className="bg-destructive/10 border-destructive/30">
                  <AlertTitle className="text-sm text-destructive">
                    Could not load your addresses
                  </AlertTitle>
                  <AlertDescription className="text-sm text-destructive/90">
                    {addressesError instanceof ApiError
                      ? addressesError.message
                      : "Refresh and try again."}
                  </AlertDescription>
                </Alert>
              ) : (addresses ?? []).length === 0 &&
                selectedAddressOrTemp === null ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 flex flex-col items-center justify-center gap-5 text-center p-10">
                  <div className="inline-flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                    <MapPinIcon className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col gap-2 max-w-md">
                    <h3 className="font-semibold text-lg tracking-tight">
                      Add a delivery address
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tell us where to ship your handmade piece.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setAddDialogOpen(true)}
                    className="inline-flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add address
                  </Button>
                </div>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ...(addresses ?? []),
                    ...(selectedAddressOrTemp &&
                    typeof selectedAddressOrTemp.id === "string" &&
                    selectedAddressOrTemp.id.startsWith("unsaved-")
                      ? [selectedAddressOrTemp]
                      : []),
                  ].map((a) => {
                    const cfg =
                      LABEL_OPTIONS.find((l) => l.value === a.label) ??
                      LABEL_OPTIONS[2];
                    const LabelIcon = cfg.Icon;
                    const isSelected =
                      String(a.id) === String(selectedAddressOrTemp?.id);
                    return (
                      <li key={String(a.id)}>
                        <button
                          type="button"
                          onClick={() => setSelectedAddressOrTemp(a)}
                          aria-pressed={isSelected}
                          className={cn(
                            "group w-full text-left rounded-2xl border-2 p-4 transition-all relative cursor-pointer h-full",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border/60 bg-card/90 hover:border-primary/40 hover:bg-muted/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="inline-flex items-center gap-2">
                              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                                <LabelIcon className="h-4 w-4" />
                              </span>
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-2">
                                  {cfg.label}
                                  {a.isDefault ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-primary/10 text-primary border-transparent"
                                    >
                                      Default
                                    </Badge>
                                  ) : null}
                                </span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-background group-hover:border-primary/40"
                              )}
                            >
                              {isSelected ? (
                                <CheckIcon className="size-3" />
                              ) : null}
                            </span>
                          </div>
                          <address className="not-italic mt-3 text-sm text-foreground/90 leading-relaxed flex flex-col gap-0.5">
                            <span>{a.line1}</span>
                            {a.line2 ? <span>{String(a.line2)}</span> : null}
                            <span>
                              {a.city}
                              {a.governorate ? `, ${String(a.governorate)}` : ""}
                              {a.postalCode ? `  ${String(a.postalCode)}` : ""}
                            </span>
                          </address>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {submitAlert ? (
              <Alert className="bg-destructive/10 border-destructive/30">
                <AlertTitle className="text-sm text-destructive">
                  Could not place order
                </AlertTitle>
                <AlertDescription className="text-sm text-destructive/90">
                  {submitAlert}
                </AlertDescription>
              </Alert>
            ) : null}
          </section>

          {/* RIGHT: Order summary */}
          <aside className="lg:col-span-2">
            <div className="sticky top-6 rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/60">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Order summary
                </h2>
              </div>

              {productLoading ? (
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-24 rounded-xl bg-muted/60" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4 bg-muted/60" />
                      <Skeleton className="h-4 w-1/2 bg-muted/60" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full bg-muted/60 rounded-lg" />
                </div>
              ) : product && resolvedListing ? (
                <div className="p-5 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="relative size-24 shrink-0 rounded-xl overflow-hidden border border-border/60 bg-muted/40">
                      <Image
                        src={
                          product.images?.find((i) => i.isPrimary)?.url ??
                          product.images?.[0]?.url ??
                          "/hero/hero_1.jpg"
                        }
                        alt={product.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ShoppingBagIcon className="h-3.5 w-3.5" />
                        Seller: {resolvedListing.store.name}
                      </p>
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="font-bold text-primary">
                          ${formatUnitPrice(unitPrice)}
                        </span>
                        {resolvedListing.hasDiscount ? (
                          <span className="text-xs text-muted-foreground line-through">
                            ${formatUnitPrice(resolvedListing.price)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="ml-auto font-semibold text-muted-foreground text-sm self-start">
                      × {quantity}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        ${formatUnitPrice(lineSubtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Handmade delivery
                      </span>
                      <span className="font-medium text-emerald-600">Free</span>
                    </div>
                    <div className="h-px bg-border/60 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Total
                      </span>
                      <span className="font-bold text-2xl text-primary">
                        ${formatUnitPrice(lineSubtotal)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={!canPlaceOrder}
                    onClick={handlePlaceOrder}
                    className="w-full h-12 text-base cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Placing order…
                      </>
                    ) : (
                      <>
                        <ShoppingBagIcon className="mr-2 h-5 w-5" />
                        Place Order · ${formatUnitPrice(lineSubtotal)}
                      </>
                    )}
                  </Button>

                  {!selectedAddressOrTemp ? (
                    <p className="text-xs text-center text-muted-foreground">
                      Select a delivery address to enable Place Order.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  <Alert className="bg-destructive/10 border-destructive/30">
                    <AlertTitle className="text-sm text-destructive">
                      Couldn&apos;t load item
                    </AlertTitle>
                    <AlertDescription className="text-sm text-destructive/90">
                      The product or listing may have changed — start over from
                      the product page.
                    </AlertDescription>
                  </Alert>
                  <Link
                    href={
                      productIdParam
                        ? `/product/${encodeURIComponent(productIdParam)}`
                        : "/products"
                    }
                    className={cn(
                      Button.prototype.className,
                      "w-full inline-flex items-center justify-center"
                    )}
                  >
                    Return to product
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>

        <CheckoutAddAddressDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onCreated={(a) => setSelectedAddressOrTemp(a)}
        />
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </AuthGuard>
  );
}
