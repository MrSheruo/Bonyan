"use client";

import React from "react";
import {
  Package as PackageIcon,
  Truck as TruckIcon,
  CheckCircle2 as CheckCircle2Icon,
  Clock as ClockIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "In Transit" | "Delivered" | "Pending";

interface MockOrder {
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  productTitle: string;
  productDescription: string;
  productImage: string;
  total: string;
}

const MOCK_ORDERS: MockOrder[] = [
  {
    orderNumber: "#BYN-8472",
    placedAt: "Oct 12, 2024",
    status: "In Transit",
    productTitle: "Lina Solid Oak Dining Chair (Set of 2)",
    productDescription:
      "Hand-finished solid European oak with woven paper cord seating. A testament to mid-century artisanal techniques.",
    productImage:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=mid-century%20solid%20oak%20dining%20chair%20with%20woven%20paper%20cord%20seat%20in%20sunlit%20cream%20room%20with%20plant&image_size=square",
    total: "$840.00",
  },
  {
    orderNumber: "#BYN-7193",
    placedAt: "Sep 28, 2024",
    status: "Delivered",
    productTitle: "Terracotta Vessel Collection",
    productDescription:
      "Hand-thrown clay vessels finished with a matte, unglazed texture. Sourced directly from artisans in the Atlas Mountains.",
    productImage:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=matte%20unglazed%20terracotta%20clay%20vase%20vessel%20on%20oak%20table%20with%20dried%20pampas%20grass%20cream%20background&image_size=square",
    total: "$185.00",
  },
  {
    orderNumber: "#BYN-6501",
    placedAt: "Aug 15, 2024",
    status: "Pending",
    productTitle: "Noma Linen Weave Runner Rug",
    productDescription:
      "Hand-loomed undyed linen with a natural fringe border. Made in small batches by weavers in Upper Egypt.",
    productImage:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=natural%20undyed%20linen%20weave%20runner%20rug%20fringe%20border%20in%20cream%20living%20room%20overhead%20view&image_size=square",
    total: "$320.00",
  },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<
    OrderStatus,
    { icon: React.ComponentType<{ className?: string }>; cls: string }
  > = {
    "In Transit": {
      icon: TruckIcon,
      cls: "bg-[#FFD8B8] text-[#8B4F1E] hover:bg-[#FFD8B8]/90 border-transparent",
    },
    Delivered: {
      icon: CheckCircle2Icon,
      cls: "bg-[#E7E4D7] text-[#4B463A] hover:bg-[#E7E4D7]/90 border-transparent",
    },
    Pending: {
      icon: ClockIcon,
      cls: "bg-[#F4E8D5] text-[#6B4A22] hover:bg-[#F4E8D5]/90 border-transparent",
    },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="secondary"
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs",
        cfg.cls,
      ].join(" ")}
    >
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

export function OrderHistoryList() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Order History</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Review your past purchases and track current artisanal pieces.
        </p>
      </div>

      {/*
        TODO: GET /users/me/orders exists, but response shape is unconfirmed
        (backend currently errors on this route). Wire up to useSuspenseQuery /
        useQuery once schema is locked in — for now, render the hardcoded visual
        mocks below to match the design reference.
      */}

      <div className="flex flex-col gap-6">
        {MOCK_ORDERS.map((order) => (
          <article
            key={order.orderNumber}
            className="flex flex-col md:flex-row gap-6 rounded-2xl border border-border/60 bg-card/90 p-5 md:p-6 shadow-sm"
          >
            <div className="w-full md:w-56 shrink-0 aspect-[4/3] md:aspect-auto md:h-44 rounded-xl overflow-hidden bg-muted border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.productImage}
                alt={order.productTitle}
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <header className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <PackageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    Order {order.orderNumber}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    Placed {order.placedAt}
                  </span>
                </div>
                <StatusBadge status={order.status} />
              </header>

              <div className="my-4 h-px bg-border/60" />

              <div className="flex-1 space-y-2 min-w-0">
                <h3 className="font-semibold text-xl tracking-tight truncate">
                  {order.productTitle}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {order.productDescription}
                </p>
              </div>

              <footer className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    {order.total}
                  </p>
                </div>
                <Button variant="outline" className="min-w-[140px]">
                  View Details
                </Button>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
