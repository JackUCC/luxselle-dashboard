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
  Trash2,
  Pencil,
} from "lucide-react";
import { apiGet, apiDelete, apiPost } from "../../lib/api";
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

const getStatusLabel = (status: string) => {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "sold":
      return "Sold";
    case "reserved":
      return "Reserved";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
};

/** Badge variant by status: success (in_stock), warning (reserved / low stock), danger (sold), count (other). */
function getStatusBadgeVariant(
  status: string,
  quantity: number,
  lowStockThreshold: number
): "status-success" | "status-warning" | "status-danger" | "count" {
  if (status === "sold") return "status-danger";
  if (status === "reserved") return "status-warning";
  if (status === "in_stock") {
    return quantity < lowStockThreshold ? "status-warning" : "status-success";
  }
  return "count";
}

import ConfirmationModal from "../../components/common/ConfirmationModal";
import PageLayout from "../../components/layout/PageLayout";
import { Badge, Button, Card, EmptyState, PageHeader, SectionLabel } from "../../components/design-system";
import { useLayoutMode } from "../../lib/LayoutModeContext";

function InventoryRowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductWithId;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (openRef.current && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="text-lux-400 hover:text-lux-600 p-2 rounded-lg hover:bg-lux-100 transition-all"
        aria-label="Row actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-lux-200 rounded-xl shadow-lg z-20 min-w-[120px]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-lux-700 hover:bg-lux-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function hasMissingInfo(product: ProductWithId): boolean {
  return (
    product.costPriceEur === 0 ||
    product.sellPriceEur === 0 ||
    (product.category != null && product.category.trim() === "")
  );
}

export default function InventoryView() {
  const { isSidecar } = useLayoutMode();
  const [products, setProducts] = useState<ProductWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithId | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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

  const handleProductDeleted = useCallback(
    (deletedId: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));
      closeProductDrawer();
    },
    [closeProductDrawer],
  );

  const LOW_STOCK_THRESHOLD = 2; // matches settings.lowStockThreshold default

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const brand = product.brand.toLowerCase();
      const model = product.model.toLowerCase();
      const title = (product.title ?? "").toLowerCase();
      const sku = (product.sku ?? "").toLowerCase();
      const composite = `${brand} ${model} ${title} ${sku}`.trim();
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
    apiGet<ProductsResponse>("/products?limit=500&sort=createdAt&dir=desc")
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

  const handleClearAll = useCallback(() => {
    if (products.length === 0) return;
    setIsClearing(true);
    apiPost<{ data: { deleted: number } }>("/products/clear", {})
      .then((res) => {
        const deleted = res?.data?.deleted ?? 0;
        setProducts([]);
        setError(null);
        closeProductDrawer();
        toast.success(`Cleared ${deleted} item${deleted === 1 ? "" : "s"} from inventory.`);
        fetchProducts();
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to clear inventory";
        toast.error(message);
      })
      .finally(() => {
        setIsClearing(false);
        setShowClearConfirm(false);
      });
  }, [products.length, fetchProducts, closeProductDrawer]);

  const handleDeleteProduct = useCallback(async (product: ProductWithId) => {
    try {
      await apiDelete(`/products/${product.id}`);
      toast.success("Product deleted");
      handleProductDeleted(product.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setProductToDelete(null);
    }
  }, [handleProductDeleted]);

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

  const activeFilterCount =
    Number(Boolean(query)) +
    Number(Boolean(brandFilter)) +
    Number(Boolean(statusFilter)) +
    Number(lowStockFilter) +
    Number(missingInfoFilter);

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) => p.status === "in_stock" && p.quantity < LOW_STOCK_THRESHOLD
      ).length,
    [products]
  );
  const missingInfoCount = useMemo(
    () => products.filter(hasMissingInfo).length,
    [products]
  );

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
    <PageLayout variant="default">
      <section className={isSidecar ? "min-w-0 max-w-full overflow-auto space-y-8" : "space-y-8"}>
      <PageHeader
        title="Inventory"
        purpose="Manage stock levels and product details."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setShowAddDrawer(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Product
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className="inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowImportDrawer(true)}
              className="inline-flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={products.length === 0 || isClearing}
              className="inline-flex items-center gap-2 rounded-lux-input border-2 border-rose-200 bg-white px-3 py-2 text-body-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete all inventory items"
            >
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear all
            </button>
          </>
        }
      />

      {/* Search & Filters */}
      <Card className="p-6 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
        <SectionLabel className="mb-4">Search & Filters</SectionLabel>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-lux-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by brand, model, SKU..."
                  value={query}
                  onChange={handleSearchChange}
                  className="lux-input pl-10 w-full"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-lux-100 px-1.5 py-0.5 text-[10px] font-semibold text-lux-400">
                  /
                </span>
              </div>

              {/* View Toggles */}
              <div className="flex rounded-xl border border-lux-200 bg-lux-50 p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`rounded-lg p-2 transition-all ${
                    viewMode === "table"
                      ? "bg-white shadow-sm text-lux-900"
                      : "text-lux-400 hover:text-lux-700"
                  }`}
                  data-testid="inventory-view-table"
                  aria-label="Table view"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-2 transition-all ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-lux-900"
                      : "text-lux-400 hover:text-lux-700"
                  }`}
                  data-testid="inventory-view-grid"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3 border-t border-lux-200 pt-4">
            <SectionLabel as="span" className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter by
            </SectionLabel>
            <div className="relative">
              <select
                aria-label="Filter by brand"
                className="appearance-none rounded-lux-input border border-lux-200 bg-white pl-4 pr-10 py-2.5 text-body-sm font-medium text-lux-700 hover:border-lux-300 focus:outline-none focus:ring-2 focus:ring-lux-gold/20 focus:border-lux-gold transition-all cursor-pointer"
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
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lux-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                aria-label="Filter by status"
                className="appearance-none rounded-lux-input border border-lux-200 bg-white pl-4 pr-10 py-2.5 text-body-sm font-medium text-lux-700 hover:border-lux-300 focus:outline-none focus:ring-2 focus:ring-lux-gold/20 focus:border-lux-gold transition-all cursor-pointer"
                value={statusFilter}
                onChange={(e) => updateParam("status", e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="sold">Sold</option>
                <option value="reserved">Reserved</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lux-400 pointer-events-none" />
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-full border border-lux-200 px-3 py-1.5 text-[11px] font-semibold text-lux-600 hover:bg-lux-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Low stock banner */}
      {lowStockFilter && (
        <Card accent className="px-5 py-4 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-lux-700">
              Showing low stock items (quantity &lt; {LOW_STOCK_THRESHOLD})
            </p>
            <button
              type="button"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("lowStock");
                setSearchParams(newParams);
              }}
              className="text-sm font-medium text-lux-gold hover:text-lux-800 transition-colors"
            >
              Clear filter
            </button>
          </div>
        </Card>
      )}

      {/* Missing info banner */}
      {missingInfoFilter && (
        <Card accent className="px-5 py-4 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-lux-700">
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
              className="text-sm font-medium text-lux-gold hover:text-lux-800 transition-colors"
            >
              Clear filter
            </button>
          </div>
        </Card>
      )}

      {/* Summary strip */}
      {!isLoading && !error && products.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-sm text-lux-600 animate-bento-enter" style={{ "--stagger": 1 } as React.CSSProperties}>
          <span className="font-medium">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
          </span>
          {lowStockCount > 0 && (
            <a
              href="/inventory?lowStock=1"
              onClick={(e) => {
                e.preventDefault();
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("lowStock", "1");
                  return next;
                });
              }}
              className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
            >
              {lowStockCount} low stock
            </a>
          )}
          {missingInfoCount > 0 && (
            <a
              href="/inventory?missingInfo=1"
              onClick={(e) => {
                e.preventDefault();
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("missingInfo", "1");
                  return next;
                });
              }}
              className="font-medium text-amber-600 hover:text-amber-700 hover:underline"
            >
              {missingInfoCount} missing info
            </a>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-lux-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading inventory...</span>
        </div>
      ) : error ? (
        <div className="lux-card p-8 text-center">
          <p className="text-rose-600 font-medium">{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-dashed animate-bento-enter" style={{ "--stagger": 2 } as React.CSSProperties}>
          <EmptyState
            icon={Package}
            title={
              query || brandFilter || statusFilter || lowStockFilter || missingInfoFilter
                ? "No matching products"
                : "No products yet"
            }
            description={
              query || brandFilter || statusFilter || lowStockFilter || missingInfoFilter
                ? "Try a different search or clear your filters."
                : "Add from Evaluator or create a product manually."
            }
            action={
              !query && !brandFilter && !statusFilter && !lowStockFilter && !missingInfoFilter ? (
                <Button variant="primary" onClick={() => setShowAddDrawer(true)} className="inline-flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Product
                </Button>
              ) : (
                <Button variant="secondary" onClick={clearAllFilters} className="inline-flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              )
            }
          />
        </Card>
      ) : viewMode === "table" ? (
        <div
          ref={shouldVirtualize ? tableContainerRef : null}
          className={`lux-card animate-bento-enter ${isSidecar ? "overflow-x-auto overflow-y-auto" : shouldVirtualize ? "overflow-auto" : "overflow-hidden"}`}
          style={{
            ...(isSidecar ? { maxHeight: "min(70vh, 500px)" } : shouldVirtualize ? { maxHeight: "600px" } : {}),
            '--stagger': 2,
          } as React.CSSProperties}
        >
          <table className="min-w-full divide-y divide-lux-200">
            <thead className="bg-lux-50/80 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  Brand / Title / SKU
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  Customs
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  VAT
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  Sell Price
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-lux-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-4 py-3 w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lux-100 bg-transparent">
              {shouldVirtualize ? (
                <>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const product = filteredProducts[virtualRow.index];
                    const isMissingInfo = hasMissingInfo(product);
                    return (
                      <tr
                        key={product.id}
                        onClick={() => openProductDrawer(product.id)}
                        className={`group hover:bg-lux-200/30 transition-colors cursor-pointer ${isMissingInfo ? "border-l-4 border-amber-400 bg-amber-50/30" : ""}`}
                        style={{
                          height: `${virtualRow.size}px`,
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-lux-100 border border-lux-200">
                              {product.imageUrls?.[0] ? (
                                <img
                                  src={product.imageUrls[0]}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL;
                                  }}
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-4 w-4 text-lux-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-lux-900 truncate max-w-[200px]" title={product.title || product.model}>
                                {product.brand} — {product.title || product.model}
                              </div>
                              <div className="text-xs text-lux-500 font-mono">
                                {product.sku || `BA${product.id.slice(-4)}`}
                              </div>
                              {isMissingInfo && (
                                <Badge variant="status-warning" className="ml-1">Missing info</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular-nums text-lux-700">
                          {formatCurrency(product.costPriceEur)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular-nums text-lux-600">
                          {formatCurrency(product.customsEur ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular-nums text-lux-600">
                          {formatCurrency(product.vatEur ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-lux-900">
                          {formatCurrency(product.sellPriceEur)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-md bg-lux-100 px-2 py-0.5 text-xs font-medium text-lux-600">
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={getStatusBadgeVariant(
                              product.status,
                              product.quantity,
                              LOW_STOCK_THRESHOLD
                            )}
                          >
                            {getStatusLabel(product.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right relative">
                          <InventoryRowActions
                            product={product}
                            onEdit={() => openProductDrawer(product.id)}
                            onDelete={() => setProductToDelete(product)}
                          />
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
                      className={`group hover:bg-lux-200/30 transition-colors cursor-pointer ${isMissingInfo ? "border-l-4 border-amber-400 bg-amber-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-lux-100 border border-lux-200">
                            {product.imageUrls?.[0] ? (
                              <img
                                src={product.imageUrls[0]}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL;
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-lux-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-lux-900 truncate max-w-[200px]" title={product.title || product.model}>
                              {product.brand} — {product.title || product.model}
                            </div>
                            <div className="text-xs text-lux-500 font-mono">
                              {product.sku || `BA${product.id.slice(-4)}`}
                            </div>
                            {isMissingInfo && (
                              <Badge variant="status-warning">Missing info</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-lux-700">
                        {formatCurrency(product.costPriceEur)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-lux-600">
                        {formatCurrency(product.customsEur ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-lux-600">
                        {formatCurrency(product.vatEur ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-lux-900">
                        {formatCurrency(product.sellPriceEur)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-md bg-lux-100 px-2 py-0.5 text-xs font-medium text-lux-600">
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={getStatusBadgeVariant(
                            product.status,
                            product.quantity,
                            LOW_STOCK_THRESHOLD
                          )}
                        >
                          {getStatusLabel(product.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <InventoryRowActions
                          product={product}
                          onEdit={() => openProductDrawer(product.id)}
                          onDelete={() => setProductToDelete(product)}
                        />
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
          {filteredProducts.map((product, index) => {
            const isMissingInfo = hasMissingInfo(product);
            return (
              <div
                key={product.id}
                onClick={() => openProductDrawer(product.id)}
                className={`lux-card group relative overflow-hidden hover:-translate-y-1 transition-all cursor-pointer animate-bento-enter ${isMissingInfo ? "border-l-4 border-l-amber-400" : ""}`}
                style={{ '--stagger': index } as React.CSSProperties}
              >
                <div className="aspect-[4/3] bg-lux-50 relative overflow-hidden rounded-t-[15px]">
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
                      <Badge variant="status-warning">Missing info</Badge>
                    )}
                    <Badge
                      variant={getStatusBadgeVariant(
                        product.status,
                        product.quantity,
                        LOW_STOCK_THRESHOLD
                      )}
                    >
                      {getStatusLabel(product.status)}
                    </Badge>
                  </div>
                </div>
                <div className="p-5">
                  <SectionLabel as="span" className="mb-1">
                    {product.brand}
                  </SectionLabel>
                  <h3 className="font-bold text-lux-900 text-base mb-4 line-clamp-1">
                    {product.model}
                  </h3>

                  <div className="flex items-end justify-between border-t border-lux-200 pt-4">
                    <div>
                      <SectionLabel as="span">Price</SectionLabel>
                      <div className="font-mono text-lg font-bold text-lux-900">
                        {formatCurrency(product.sellPriceEur)}
                      </div>
                    </div>
                    <div className="text-right">
                      <SectionLabel as="span">Qty</SectionLabel>
                      <div className="text-sm font-medium text-lux-600">
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
          onProductDeleted={handleProductDeleted}
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

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear Inventory"
        message={`Are you sure you want to delete all ${products.length} items? This action cannot be undone.`}
        confirmLabel="Clear All"
        isConfirming={isClearing}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => productToDelete && handleDeleteProduct(productToDelete)}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.brand} ${productToDelete?.title || productToDelete?.model}"?`}
        confirmLabel="Delete"
        variant="danger"
      />
      </section>
    </PageLayout>
  );
}
