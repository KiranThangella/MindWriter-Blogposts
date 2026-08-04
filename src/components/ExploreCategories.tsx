import { MoveRight } from "lucide-react";
import { exploreCategories } from "../data";
import { getCategoryIcon } from "./icons";
import { getCategoryTheme } from "../lib/categoryTheme";

interface Category {
  name: string;
  count: number;
  icon: string;
}

interface ExploreCategoriesProps {
  categories?: Category[];
  onCategoryClick?: (categoryName: string) => void;
}

export function ExploreCategories({ categories, onCategoryClick }: ExploreCategoriesProps) {
  const displayCategories = categories && categories.length > 0 ? categories : exploreCategories;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-brand-purple" />
          <h2 className="text-2xl font-bold">Explore Categories</h2>
        </div>
        <a href="#" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-brand-purple transition-colors">
          View all <MoveRight className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {displayCategories.map((category) => {
          const IconComponent = getCategoryIcon(category.name, category.icon);
          const theme = getCategoryTheme(category.name);
          return (
            <button
              key={category.name} 
              onClick={() => onCategoryClick?.(category.name)}
              className="group flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-brand-card py-8 transition-colors hover:bg-brand-card-hover hover:-translate-y-1 duration-300 w-full"
            >
              <div
                className="rounded-full p-4 transition-colors duration-300"
                style={{ background: theme.bg, color: theme.accent }}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.accent; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.accent; }}
              >
                {IconComponent && <IconComponent className="h-8 w-8" />}
              </div>
              <div className="text-center">
                <h3 className="font-semibold">{category.name}</h3>
                <p className="text-xs text-brand-text-muted mt-1">{category.count} Articles</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
