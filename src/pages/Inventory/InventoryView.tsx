/**
 * Inventory list: product list with search/sort, virtualized list, and ProductDetailDrawer; uses apiGet.
 * @see docs/CODE_REFERENCE.md
 */
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ChangeEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import toast from "react-hot-toast";
import {
  Search,
  LayoutList,
  LayoutGrid,
  Plus,
  MoreVertical,
  ChevronDown,
  Loader2,
  Package,
  Download,
  Upload,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { apiGet } from "../../lib/api";
import { formatCurrency } from "../../lib/formatters";
import {
  PLACEHOLDER_IMAGE,
  PLACEHOLDER_IMAGE_SMALL,
} from "../../lib/placeholder";
import type { ProductWithId } from "../../types/dashboard";
import ProductDetailDrawer from "./ProductDetailDrawer";
import AddProductDrawer from "./AddProductDrawer";
import ImportInventoryDrawer from "./ImportInventoryDrawer";

interface ProductsResponse {
  data: ProductWithId[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "in_stock":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "sold":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "reserved":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "in_stock":
      return "IN STOCK";
    case "sold":
      return "SOLD";
    case "reserved":
      return "RESERVED";
    default:
      return status.toUpperCase().replace("_", " ");
  }
};

const STATUS_FILTER_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
] as const;

function hasMissingInfo(product: ProductWithId): boolean {
  return (
    product.costPriceEur === 0 ||
    product.sellPriceEur === 0 ||
    (product.category != null && product.category.trim() === "")
  );
}

export default function InventoryView() {
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const query = (searchParams.get("q") ?? "").trim();
  const brandFilter = (searchParams.get("brand") ?? "").trim();
  const statusFilter = (searchParams.get("status") ?? "").trim();
  const lowStockFilter = searchParams.get("lowStock") === "1";
  const missingInfoFilter = searchParams.get("missingInfo") === "1";
  const selectedProductId = searchParams.get("product");

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const nextParams = new URLSearchParams(searchParams);
      if (value && value.trim()) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const clearAllFilters = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    ["q", "brand", "status", "lowStock", "missingInfo"].forEach((key) =>
      nextParams.delete(key),
    );
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const openProductDrawer = useCallback(
    (productId: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("product", productId);
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  const closeProductDrawer = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("product");
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleProductUpdated = useCallback((updated: ProductWithId) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const LOW_STOCK_THRESHOLD = 2; // matches settings.lowStockThreshold default

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const brand = product.brand.toLowerCase();
      const model = product.model.toLowerCase();
      const composite = `${brand} ${model}`;
      const normalizedQuery = query.toLowerCase();

      if (normalizedQuery && !composite.includes(normalizedQuery)) return false;
      if (brandFilter && !brand.includes(brandFilter.toLowerCase()))
        return false;
      if (statusFilter && product.status !== statusFilter) return false;
      // Low stock filter: in_stock and quantity below threshold (from Dashboard link)
      if (lowStockFilter) {
        if (product.status !== "in_stock") return false;
        if (product.quantity >= LOW_STOCK_THRESHOLD) return false;
      }
      // Missing info filter: only show products with missing cost/sell/category
      if (missingInfoFilter && !hasMissingInfo(product)) return false;
      return true;
    });
  }, [
    products,
    query,
    brandFilter,
    statusFilter,
    lowStockFilter,
    missingInfoFilter,
  ]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "Brand",
      "Model",
      "Category",
      "Condition",
      "Colour",
      "Cost EUR",
      "Sell EUR",
      "Status",
      "Quantity",
    ];
    const rows = filteredProducts.map((p) => [
      p.brand,
      p.model,
      p.category || "",
      p.condition || "",
      p.colour || "",
      p.costPriceEur,
      p.sellPriceEur,
      p.status,
      p.quantity,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `luxselle-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredProducts.length} items to CSV`);
  }, [filteredProducts]);

  const fetchProducts = useCallback(() => {
    setIsLoading(true);
    // Request full list (limit=500) so imported and all products show; no cached result
    apiGet<ProductsResponse>("/products?limit=500")
      .then((response) => {
        setProducts(response.data ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load products";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isInput) return;
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );

  const topBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([brand]) => brand);
  }, [products]);

  const activeFilterCount =
    Number(Boolean(query)) +
    Number(Boolean(brandFilter)) +
    Number(Boolean(statusFilter)) +
    Number(lowStockFilter) +
    Number(missingInfoFilter);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateParam("q", event.target.value);
  };

  // Virtualization for large tables (>50 items)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = filteredProducts.length > 50;

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 72, // Approximate row height in pixels
    overscan: 5,
    enabled: shouldVirtualize && viewMode === "table",
  });

  return (
    <section className="space-y-6">
      {/* Header & Controls */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-gray-900">
              Inventory
            </h1>
            <p className="text-base text-gray-500 mt-1">
              Manage stock levels and product details.
            </p>
          </div>
          <button
            onClick={() => setShowAddDrawer(true)}
            className="lux-btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={query}
                onChange={handleSearchChange}
                className="lux-input pl-10 w-full shadow-sm"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                /
              </span>
            </div>

            {/* View Toggles */}
            <div className="flex rounded-lg border border-gray-200 bg-gray-100/50 p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`rounded p-2 transition-all ${
                  viewMode === "table"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                data-testid="inventory-view-table"
                aria-label="Table view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded p-2 transition-all ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                data-testid="inventory-view-grid"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className="lux-btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => setShowImportDrawer(true)}
              className="lux-btn-secondary flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>
        </div>

        {/* Low stock banner (from Dashboard link) */}
        {lowStockFilter && (
          <div className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
            <p className="text-sm font-medium text-orange-700">
              Showing low stock items (quantity &lt; {LOW_STOCK_THRESHOLD})
            </p>
            <button
              type="button"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("lowStock");
                setSearchParams(newParams);
              }}
              className="text-sm font-medium text-orange-600 hover:text-orange-800 transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Missing info banner (from Import drawer) */}
        {missingInfoFilter && (
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-sm font-medium text-amber-700">
              Showing products with missing information (e.g. cost/sell price or
              category)
            </p>
            <button
              type="button"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("missingInfo");
                setSearchParams(newParams);
              }}
              className="text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Quick filters
            </span>
            {STATUS_FILTER_OPTIONS.map((option) => {
              const isActive = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    updateParam("status", isActive ? null : option.value)
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                updateParam("lowStock", lowStockFilter ? null : "1")
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                lowStockFilter
                  ? "bg-orange-600 text-white"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
              }`}
            >
              Low stock
            </button>
            <button
              type="button"
              onClick={() =>
                updateParam("missingInfo", missingInfoFilter ? null : "1")
              }
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                missingInfoFilter
                  ? "bg-amber-600 text-white"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
            >
              Missing info
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5" />
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Top brands:
            </span>
            {topBrands.map((brand) => {
              const isActive =
                brandFilter.toLowerCase() === brand.toLowerCase();
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => updateParam("brand", isActive ? null : brand)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {brand}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                className="appearance-none rounded-xl border border-gray-200 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm cursor-pointer"
                value={brandFilter}
                onChange={(e) => updateParam("brand", e.target.value)}
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                className="appearance-none rounded-xl border border-gray-200 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm cursor-pointer"
                value={statusFilter}
                onChange={(e) => updateParam("status", e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="sold">Sold</option>
                <option value="reserved">Reserved</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading inventory...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-12 text-center">
          <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">No items found</p>
          <p className="text-sm text-gray-500">
            {query ||
            brandFilter ||
            statusFilter ||
            lowStockFilter ||
            missingInfoFilter
              ? "Try adjusting your filters."
              : "Add your first inventory item to get started."}
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div
          ref={shouldVirtualize ? tableContainerRef : null}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          style={
            shouldVirtualize
              ? { maxHeight: "600px", overflow: "auto" }
              : undefined
          }
        >
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Paid / Sell
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-transparent">
              {shouldVirtualize ? (
                <>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const product = filteredProducts[virtualRow.index];
                    const isMissingInfo = hasMissingInfo(product);
                    return (
                      <tr
                        key={product.id}
                        onClick={() => openProductDrawer(product.id)}
                        className={`group hover:bg-blue-50/30 transition-colors cursor-pointer ${isMissingInfo ? "border-l-4 border-amber-400 bg-amber-50/30" : ""}`}
                        style={{
                          height: `${virtualRow.size}px`,
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 shadow-sm">
                              {product.imageUrls?.[0] && (
                                <img
                                  src={product.imageUrls[0]}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      PLACEHOLDER_IMAGE_SMALL;
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">
                                  {product.brand} {product.model}
                                </span>
                                {isMissingInfo && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                    Missing info
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">
                                BA{product.id.slice(-4)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            {product.quantity} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-400 w-8">PAID</span>
                              <span className="font-medium text-gray-700">
                                {formatCurrency(product.costPriceEur)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-400 w-8">SELL</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(product.sellPriceEur)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(product.status)}`}
                          >
                            {getStatusLabel(product.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-gray-100 rounded-full"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ) : (
                filteredProducts.map((product) => {
                  const isMissingInfo = hasMissingInfo(product);
                  return (
                    <tr
                      key={product.id}
                      onClick={() => openProductDrawer(product.id)}
                      className={`group hover:bg-blue-50/30 transition-colors cursor-pointer ${isMissingInfo ? "border-l-4 border-amber-400 bg-amber-50/30" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 shadow-sm">
                            {product.imageUrls?.[0] && (
                              <img
                                src={product.imageUrls[0]}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL;
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">
                                {product.brand} {product.model}
                              </span>
                              {isMissingInfo && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                  Missing info
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              BA{product.id.slice(-4)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {product.quantity} units
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 w-8">PAID</span>
                            <span className="font-medium text-gray-700">
                              {formatCurrency(product.costPriceEur)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 w-8">SELL</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(product.sellPriceEur)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(product.status)}`}
                        >
                          {getStatusLabel(product.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Menu will be added later
                          }}
                          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-gray-100 rounded-full"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const isMissingInfo = hasMissingInfo(product);
            return (
              <div
                key={product.id}
                onClick={() => openProductDrawer(product.id)}
                className={`group relative overflow-hidden rounded-2xl bg-white border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer ${isMissingInfo ? "border border-gray-200 border-l-4 border-l-amber-400 bg-amber-50/20" : "border border-gray-200"}`}
              >
                <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                  {product.imageUrls?.[0] && (
                    <img
                      src={product.imageUrls[0]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    {isMissingInfo && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        Missing info
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase border text-white shadow-sm ${getStatusColor(product.status).replace("bg-emerald-100", "bg-emerald-500").replace("text-emerald-700", "text-white")}`}
                    >
                      {getStatusLabel(product.status)}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-1 text-xs font-bold text-blue-600 uppercase tracking-wide">
                    {product.brand}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-4 line-clamp-1">
                    {product.model}
                  </h3>

                  <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                        Price
                      </div>
                      <div className="font-mono text-lg font-bold text-gray-900">
                        {formatCurrency(product.sellPriceEur)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">
                        Qty
                      </div>
                      <div className="text-sm font-medium text-gray-600">
                        {product.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProductId && (
        <ProductDetailDrawer
          productId={selectedProductId}
          onClose={closeProductDrawer}
          onProductUpdated={handleProductUpdated}
        />
      )}

      {showAddDrawer && (
        <AddProductDrawer
          onClose={() => setShowAddDrawer(false)}
          onProductAdded={fetchProducts}
        />
      )}

      {showImportDrawer && (
        <ImportInventoryDrawer
          onClose={() => setShowImportDrawer(false)}
          onImportComplete={fetchProducts}
        />
      )}
    </section>
  );
}
