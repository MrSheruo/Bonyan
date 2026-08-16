import { FiltersSidebar } from "@/components/layouts/filter-sidebar";
import { ProductGrid } from "@/components/layouts/product-grid";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { fetchCategories, type Category } from "@/lib/constants/categories";

interface SearchPageProps {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    color?: string;
    size?: string;
    minRating?: string;
    search?: string;
  }>;
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const params = await searchParams;

  let categories: Category[] = [];
  try {
    categories = await fetchCategories();
  } catch {
    categories = [];
  }

  return (
    <main className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 flex gap-8">
        <FiltersSidebar categories={categories} />

        <section className="grow flex flex-col gap-6 min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Search</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <ProductGrid filters={params} />
        </section>
      </div>
    </main>
  );
};

export default SearchPage;
