"use client";

import React from "react";
import {
  Receipt as ReceiptIcon,
  Heart as HeartIcon,
  MapPin as MapPinIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

export type AccountSection = "orders" | "saved" | "addresses" | "settings";

const NAV_ITEMS: {
  id: AccountSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "orders", label: "Order History", icon: ReceiptIcon },
  { id: "saved", label: "Saved Items", icon: HeartIcon },
  { id: "addresses", label: "Shipping Addresses", icon: MapPinIcon },
  { id: "settings", label: "Account Settings", icon: SettingsIcon },
];

interface AccountSidebarProps {
  active: AccountSection;
  onSelect: (section: AccountSection) => void;
}

export function AccountSidebar({ active, onSelect }: AccountSidebarProps) {
  const { user, isLoading } = useUser();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const memberSinceYear =
    user?.createdAt instanceof Date
      ? user.createdAt.getFullYear()
      : typeof user?.createdAt === "string"
        ? new Date(user.createdAt).getFullYear()
        : new Date().getFullYear();

  return (
    <aside
      className={cn(
        "w-full md:w-72 shrink-0 rounded-2xl p-6 border border-border/40",
        "bg-[#FEF3E2] shadow-sm"
      )}
    >
      <div className="flex items-center gap-4 pb-6 border-b border-foreground/10">
        <Avatar size="lg" className="size-14">
          {user?.image ? (
            <AvatarImage src={user.image} alt={user.name || "User"} />
          ) : null}
          <AvatarFallback className="text-lg font-semibold">
            {isLoading ? "…" : getInitials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg text-foreground truncate">
            {isLoading ? "Loading…" : user?.name || "Guest"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Member since {memberSinceYear}
          </p>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all cursor-pointer",
                isActive
                  ? "bg-[#B37C4F] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-[#F5E6D3] hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
