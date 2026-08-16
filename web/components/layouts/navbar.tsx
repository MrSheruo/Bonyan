"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  User as UserIcon,
  LogOut,
  Package,
  LogIn,
  UserPlus,
  User,
} from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { ModeToggle } from "../ui/dark-mode-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CartDrawer } from "../cart-drawer";
import { useUser } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoggingOut } = useUser();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header className="flex flex-col gap-4 px-12 py-8 border-b border-primary/50 shadow-sm sticky top-0 z-50 bg-background">
      <div className="flex justify-between items-center gap-8">
        <Link href="/" className="text-3xl font-semibold text-primary">
          Bonyan
        </Link>
        <InputGroup className="rounded-2xl max-w-7xl py-6 px-4">
          <InputGroupInput placeholder="Search..." />
          <InputGroupAddon>
            <Search className="text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex items-center gap-6">
          <CartDrawer />

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-full cursor-pointer",
              )}
            >
              {isAuthenticated && user ? (
                <Avatar size="sm">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name || "User"} />
                  ) : null}
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              ) : (
                <UserIcon style={{ width: "20px", height: "20px" }} />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isAuthenticated && user ? (
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/account")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => logout()}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              ) : (
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/login")}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Log in</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/register")}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Register</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
