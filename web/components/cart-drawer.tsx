"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Loader2,
  ShoppingBag,
  ArrowRight,
  Package,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
} from "@/lib/hooks/use-cart";
import { useUser } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useUser();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const isLoading = isAuthLoading || isCartLoading;
  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleUpdateQuantity = (
    id: number,
    currentQty: number,
    change: number,
  ) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      removeItemMutation.mutate(id);
    } else {
      updateItemMutation.mutate({ id, quantity: newQty });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative cursor-pointer",
        )}
        aria-label="Shopping Cart"
      >
        <ShoppingCart className="h-5 w-5" />
        {isAuthenticated && itemCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {itemCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent className="flex flex-col w-full sm:max-w-md p-6">
        <SheetHeader className="p-0 border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart
            {itemCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout
          </SheetDescription>
        </SheetHeader>

        {isAuthLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">You are not logged in</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Sign in to view your cart, add products, and proceed to
                checkout.
              </p>
            </div>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full max-w-xs cursor-pointer",
              )}
            >
              Sign In
            </Link>
          </div>
        ) : isCartLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Explore our catalog and add artisanal items to your cart.
              </p>
            </div>
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full max-w-xs cursor-pointer",
              )}
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/60 transition-colors hover:border-border"
              >
                {/* Product Image */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/40">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name || "Product"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <h4
                      className="font-semibold text-sm text-foreground truncate"
                      title={item.name}
                    >
                      {item.name || `Listing #${item.listingId}`}
                    </h4>
                    <span className="font-bold text-sm text-primary shrink-0">
                      ${(item.priceAtAdd * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                    {item.store?.name && (
                      <span className="font-medium text-foreground/80">
                        {item.store.name}
                      </span>
                    )}
                    {item.store?.name && <span>•</span>}
                    <span>${item.priceAtAdd} each</span>
                    {!item.inStock && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] py-0 px-1.5 ml-1"
                      >
                        Out of stock
                      </Badge>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center rounded-md border border-border bg-background">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(item.id, item.quantity, -1)
                        }
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-semibold min-w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuantity(item.id, item.quantity, 1)
                        }
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItemMutation.mutate(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAuthenticated && items.length > 0 && (
          <SheetFooter className="p-0 border-t border-border pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-base">
              <span className="font-medium text-muted-foreground">
                Subtotal
              </span>
              <span className="font-bold text-xl text-primary">
                ${cart?.total?.toFixed(2) ?? "0.00"}
              </span>
            </div>

            <Button className="w-full py-6 text-base font-semibold cursor-pointer">
              Proceed to Checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
