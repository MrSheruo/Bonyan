import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FiltersSidebar } from "@/components/layouts/filter-sidebar";
import { ProductGrid } from "@/components/layouts/product-grid";
import { fetchCategories } from "@/lib/constants/categories";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    brand?: string;
    color?: string;
    size?: string;
    minRating?: string;
    search?: string;
    price?: string;
  }>;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const extraFilters = await searchParams;

  const decoded = decodeURIComponent(slug);
  const categories = await fetchCategories();

  const match = categories.find(
    (c) => String(c.name).trim().toLowerCase() === decoded.trim().toLowerCase(),
  );

  if (!match) {
    notFound();
  }

  const mergedFilters = {
    ...extraFilters,
    category: match.id,
  };

  return (
    <main className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 flex flex-col gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="hover:text-foreground">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/products"
                className="hover:text-foreground"
              >
                All products
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{match.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wider uppercase text-primary">
            Category
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {match.name}
          </h1>
        </header>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 flex gap-8">
        {/* <FiltersSidebar categories={categories} /> */}
        <section className="grow flex flex-col gap-6 min-w-0">
          <ProductGrid filters={mergedFilters} />
        </section>
      </div>
    </main>
  );
}
