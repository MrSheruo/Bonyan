"use client";

import React, { useState } from "react";
import { type Product, type ProductListing } from "@/lib/api/products";
import { useAddToCart } from "@/lib/hooks/use-cart";
import { useStore } from "@/lib/hooks/use-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronUp, Loader2, MapPin, Phone, ShieldCheck, Star, Store as StoreIcon } from "lucide-react";

interface AddToCartDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StoreInfoRow({ storeId }: { storeId: string }) {
  const { data: store, isLoading, error } = useStore(storeId, { enabled: Boolean(storeId) });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Loading store details...
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="py-2 text-xs text-muted-foreground">
        Store details not available.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs space-y-1.5 border border-border/40">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <StoreIcon className="h-3.5 w-3.5 text-primary" />
          {store.name}
        </span>
        {store.verified && (
          <Badge variant="outline" className="text-[10px] gap-1 bg-green-500/10 text-green-600 border-green-500/30">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>

      {store.rating !== undefined && store.rating !== null && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{Number(store.rating).toFixed(1)} rating</span>
        </div>
      )}

      {store.location && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{store.location}{store.city ? `, ${store.city}` : ""}</span>
        </div>
      )}

      {store.contactNumber && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span>{store.contactNumber}</span>
        </div>
      )}

      {store.ownerName && (
        <div className="text-muted-foreground">
          Owner: <span className="text-foreground">{store.ownerName}</span>
        </div>
      )}
    </div>
  );
}

function ListingRow({
  listing,
  product,
  onAdded,
}: {
  listing: ProductListing;
  product: Product;
  onAdded: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const addToCartMutation = useAddToCart();

  const handleAdd = () => {
    addToCartMutation.mutate(
      { listingId: listing.id, quantity: 1 },
      {
        onSuccess: () => {
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            onAdded();
          }, 600);
        },
      }
    );
  };

  const isPending = addToCartMutation.isPending;

  return (
    <div className="rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40 bg-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground truncate">
              {listing.store?.name || "Official Store"}
            </span>
            {listing.store?.city && (
              <span className="text-xs text-muted-foreground">
                ({listing.store.city})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-bold text-primary">
              ${listing.effectivePrice}
            </span>
            {listing.hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                ${listing.price}
              </span>
            )}
            {!listing.inStock && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Out of Stock
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((v) => !v)}
            className="text-xs text-muted-foreground h-8 px-2"
          >
            {isExpanded ? (
              <>
                Less <ChevronUp className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Info <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!listing.inStock || isPending || isSuccess}
            className="h-8 min-w-17.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isSuccess ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </div>

      {isExpanded && <StoreInfoRow storeId={listing.storeId} />}
    </div>
  );
}

export function AddToCartDialog({ product, open, onOpenChange }: AddToCartDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Select Seller</DialogTitle>
          <DialogDescription>
            {product.name} is available from multiple stores. Choose which listing to add to your cart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {product.listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              product={product}
              onAdded={() => onOpenChange(false)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
