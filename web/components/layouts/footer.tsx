import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export const Footer = () => {
  return (
    <footer className="w-full bg-background  px-6 py-10 sm:px-10 lg:px-16 lg:py-12 border-t border-primary">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-primary">Bonyan</h2>
          <p className="text-sm ">
            Creating spaces that breathe. Rooted in craftsmanship and natural
            materials.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">Company</h3>
          <Link href="/about" className="text-sm  hover:text-primary">
            About Bonyan
          </Link>
          <Link href="/craftsmanship" className="text-sm  hover:text-primary">
            Craftsmanship
          </Link>
          <Link href="/sustainability" className="text-sm  hover:text-primary">
            Sustainability
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">Help</h3>
          <Link href="/support" className="text-sm  hover:text-primary">
            Support Center
          </Link>
          <Link href="/categories" className="text-sm  hover:text-primary">
            Categories
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm">Stay Connected</h3>
          <p className="text-sm ">Newsletter</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Your email address"
              className="bg-white min-w-0"
            />
            <Button className="shrink-0">Join</Button>
          </div>
        </div>
      </div>

      <hr className="my-8 border-neutral-300" />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-sm ">
        <p>© 2026 Bonyan Artisanal. Built for slow living.</p>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span>English (US)</span>
        </div>
      </div>
    </footer>
  );
};
