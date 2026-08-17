"use client";

import React, { useState } from "react";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { AuthGuard } from "@/components/auth-guard";
import { Button, buttonVariants } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-auth";
import {
  AccountSidebar,
  type AccountSection,
} from "@/components/account/account-sidebar";
import { AccountSettingsForm } from "@/components/account/account-settings-form";
import { OrderHistoryList } from "@/components/account/order-history-list";
import { ShippingAddressesList } from "@/components/account/shipping-addresses-list";
import { SavedItemsList } from "@/components/account/saved-items-list";
import { cn } from "@/lib/utils";

function AccountPageInner() {
  const [active, setActive] = useState<AccountSection>("orders");
  const { isLoading: isAuthLoading, isAuthenticated } = useUser();

  const renderSection = () => {
    switch (active) {
      case "orders":
        return <OrderHistoryList />;
      case "saved":
        return <SavedItemsList />;
      case "addresses":
        return <ShippingAddressesList />;
      case "settings":
        return <AccountSettingsForm />;
      default:
        return null;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="rounded-2xl border border-border/60 bg-card p-8 md:p-10 shadow-sm max-w-md w-full text-center flex flex-col gap-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to view your account
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ll need to sign in to track orders, manage your saved
            pieces, and update your profile.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
            >
              Create Account
            </Link>
          </div>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "self-center",
            )}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <AccountSidebar active={active} onSelect={setActive} />
      <div className="flex-1 min-w-0">{renderSection()}</div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <div className="w-full max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <AccountPageInner />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            },
          }}
        />
      </div>
    </AuthGuard>
  );
}
