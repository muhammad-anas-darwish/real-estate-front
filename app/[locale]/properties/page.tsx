"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useParams } from "next/navigation"
import { BookmarkPlus, ChevronDown, Filter, Loader2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DashboardLayout } from "components/layout/DashboardLayout"
import { propertyService } from "src/modules/properties/services/propertyService"
import { PropertyFilters } from "src/modules/properties/components/PropertyFilters"
import {
  SearchAutocomplete,
  AdvancedFilters,
  EMPTY_ADVANCED_FILTERS,
} from "src/modules/search"
import { PropertyGridCard } from "src/modules/properties/components/PropertyGridCard"
import { PropertyListRow, type PropertyListItem } from "src/modules/properties/components/PropertyListRow"
import { ViewModeToggle, type ViewMode } from "src/modules/properties/components/ViewModeToggle"
import { useFilterUrlState } from "src/modules/properties/hooks/useFilterUrlState"
import {
  ActiveFilterChips,
  ShareButton,
  type ActiveFilterChip,
} from "src/modules/properties/components/FilterExtras"
import { useDebounce, useMediaQuery } from "@/hooks"
import type { PropertyDto } from "@/types/dto"
import { filterToParams, type PropertyFilters as PropertyFiltersApi } from "src/modules/properties/services/propertyService"
import { cn } from "@/lib/utils"
import { SaveSearchDialog } from "src/modules/saved-searches/components/SaveSearchDialog"
import { useCurrentSearchCandidate } from "src/modules/saved-searches/hooks/useCurrentSearchCandidate"

const PER_PAGE = 12
const FILTERS_PANEL_ID = "properties-filters-panel"
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"

const PropertyCarousel = dynamic(
  () => import("components/properties/PropertyCarousel").then((m) => m.PropertyCarousel),
  {
    loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted" />,
    ssr: false,
  }
)

const PropertyMapView = dynamic(
  () =>
    import("src/modules/properties/components/PropertyMapView").then((m) => m.PropertyMapView),
  {
    loading: () => <div className="h-[60vh] w-full animate-pulse rounded-lg bg-muted" />,
    ssr: false,
  }
)

function PublicPropertiesPageInner() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const locale = params?.locale ?? "en"
  const tProperty = useTranslations("property")
  const tCommon = useTranslations("common")
  const tHome = useTranslations("home")
  const { filters, advanced, setFilters, setAdvanced, reset: resetFilters, hasActiveFilters } = useFilterUrlState()
  const [view, setView] = useState<ViewMode>("grid")
  const [data, setData] = useState<PropertyDto[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: PER_PAGE,
    current_page: 1,
    last_page: 1,
    from: null as number | null,
    to: null as number | null,
  })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [userPanelChoice, setUserPanelChoice] = useState<boolean | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const debouncedFilters = useDebounce(filters, 250)
  const debouncedSort = useDebounce(filters.sort, 250)
  const { filters: candidateFilters } = useCurrentSearchCandidate()
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY)

  const filtersPanelOpen =
    userPanelChoice !== null ? userPanelChoice : isDesktop

  const handlePanelOpenChange = useCallback((open: boolean) => {
    setUserPanelChoice(open)
  }, [])

  const buildApiFilters = useCallback(
    (page: number): PropertyFiltersApi => {
      const [sortBy, sortOrder] = debouncedSort.split(":") as [
        string,
        "asc" | "desc",
      ]
      return filterToParams({
        search: debouncedFilters.search || undefined,
        property_type: debouncedFilters.property_type || undefined,
        type_of_contract: debouncedFilters.type_of_contract || undefined,
        country_id: debouncedFilters.country_id ?? undefined,
        city_id: debouncedFilters.city_id ?? undefined,
        rooms_min: debouncedFilters.rooms
          ? Number(debouncedFilters.rooms)
          : undefined,
        bathrooms_min: debouncedFilters.bathrooms
          ? Number(debouncedFilters.bathrooms)
          : undefined,
        price_min: debouncedFilters.min_price
          ? Number(debouncedFilters.min_price)
          : undefined,
        price_max: debouncedFilters.max_price
          ? Number(debouncedFilters.max_price)
          : undefined,
        area_min: advanced.area_min ? Number(advanced.area_min) : undefined,
        area_max: advanced.area_max ? Number(advanced.area_max) : undefined,
        page,
        perPage: PER_PAGE,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
    },
    [debouncedFilters, debouncedSort, advanced]
  )

  const fetchFeatured = useCallback(async () => {
    try {
      return await propertyService.getRandomProperties()
    } catch {
      return []
    }
  }, [])

  const isFetchingPropertiesRef = useRef(false)

  const fetchProperties = useCallback(
    async (page: number, append: boolean) => {
      if (isFetchingPropertiesRef.current) return
      isFetchingPropertiesRef.current = true
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const response = await propertyService.getProperties(buildApiFilters(page))
        setData((current) =>
          append ? [...current, ...response.data] : response.data
        )
        setPagination(response.pagination)
      } catch (error) {
        console.error("Failed to fetch properties:", error)
        toast.error(tProperty("noResults"))
      } finally {
        setLoading(false)
        setLoadingMore(false)
        isFetchingPropertiesRef.current = false
      }
    },
    [buildApiFilters, tProperty]
  )

  const fetchPropertiesRef = useRef(fetchProperties)
  useEffect(() => {
    fetchPropertiesRef.current = fetchProperties
  })

  const [featured, setFeatured] = useState<PropertyDto[]>([])

  useEffect(() => {
    let active = true
    void fetchFeatured().then((data) => {
      if (active) setFeatured(data)
    })
    return () => {
      active = false
    }
  }, [fetchFeatured])

  const toListItem = (property: PropertyDto): PropertyListItem => ({
    ...property,
    main_image: property.main_image,
    main_image_thumb: property.main_image_thumb,
    area: String(property.area),
    publisher: {
      id: property.publisher.id,
      name: property.publisher.name,
      is_verified: property.publisher.is_verified,
      publisher_type: property.publisher.publisher_type,
    },
  })

  const lastFetchKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const fetchKey = JSON.stringify([debouncedFilters, debouncedSort, advanced])
    if (fetchKey === lastFetchKeyRef.current) return
    lastFetchKeyRef.current = fetchKey
    const handle = window.setTimeout(() => {
      void fetchPropertiesRef.current(1, false)
    }, 0)
    return () => window.clearTimeout(handle)
  }, [debouncedFilters, debouncedSort, advanced])

  const chips = useMemo<ActiveFilterChip[]>(() => {
    const out: ActiveFilterChip[] = []
    if (debouncedFilters.search) {
      out.push({
        key: "search",
        label: `"${debouncedFilters.search}"`,
        onRemove: () => setFilters({ ...filters, search: "" }),
      })
    }
    if (debouncedFilters.property_type) {
      out.push({
        key: "property_type",
        label: tProperty(`filters.type.${debouncedFilters.property_type}` as never),
        onRemove: () => setFilters({ ...filters, property_type: "" }),
      })
    }
    if (debouncedFilters.type_of_contract) {
      out.push({
        key: "type_of_contract",
        label: tProperty(
          `filters.contractOption.${debouncedFilters.type_of_contract}` as never
        ),
        onRemove: () => setFilters({ ...filters, type_of_contract: "" }),
      })
    }
    if (debouncedFilters.rooms) {
      out.push({
        key: "rooms",
        label: `${tProperty("filters.beds")} ≥ ${debouncedFilters.rooms}`,
        onRemove: () => setFilters({ ...filters, rooms: "" }),
      })
    }
    if (debouncedFilters.bathrooms) {
      out.push({
        key: "bathrooms",
        label: `${tProperty("filters.baths")} ≥ ${debouncedFilters.bathrooms}`,
        onRemove: () => setFilters({ ...filters, bathrooms: "" }),
      })
    }
    if (debouncedFilters.min_price || debouncedFilters.max_price) {
      const lo = debouncedFilters.min_price || "0"
      const hi = debouncedFilters.max_price || "∞"
      out.push({
        key: "price",
        label: `${lo} – ${hi}`,
        onRemove: () => setFilters({ ...filters, min_price: "", max_price: "" }),
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, filters, tProperty])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (debouncedFilters.search) count++
    if (debouncedFilters.property_type) count++
    if (debouncedFilters.type_of_contract) count++
    if (debouncedFilters.country_id) count++
    if (debouncedFilters.city_id) count++
    if (debouncedFilters.rooms) count++
    if (debouncedFilters.bathrooms) count++
    if (debouncedFilters.min_price) count++
    if (debouncedFilters.max_price) count++
    if (advanced.area_min) count++
    if (advanced.area_max) count++
    if (advanced.year_built_min) count++
    if (advanced.year_built_max) count++
    if (advanced.keywords) count++
    return count
  }, [debouncedFilters, advanced])

  const loadingMoreRef = useRef(loadingMore)
  const paginationRef = useRef(pagination)
  useEffect(() => {
    loadingMoreRef.current = loadingMore
    paginationRef.current = pagination
  })

  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMoreRef.current &&
          paginationRef.current.current_page < paginationRef.current.last_page
        ) {
          void fetchPropertiesRef.current(paginationRef.current.current_page + 1, true)
        }
      },
      { threshold: 1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [])

  const gridLayoutClass = cn(
    "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  )
  const skeletonLayoutClass = cn(
    view === "grid" ? gridLayoutClass : "space-y-2"
  )

  return (
    <DashboardLayout title={tProperty("title")}>
      <div className="space-y-4">
        <Collapsible
          open={filtersPanelOpen}
          onOpenChange={handlePanelOpenChange}
        >
          <div
            className={cn(
              "sticky top-16 z-10 -mx-4 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:-mx-6 lg:px-6 xl:-mx-8 xl:px-8",
              "transition-shadow"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 py-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant={filtersPanelOpen ? "secondary" : "outline"}
                  size="sm"
                  aria-expanded={filtersPanelOpen}
                  aria-controls={FILTERS_PANEL_ID}
                  aria-label={
                    filtersPanelOpen
                      ? tProperty("filters.toggleHide")
                      : tProperty("filters.toggleShow")
                  }
                  data-testid="properties-filters-toggle"
                >
                  <Filter className="size-4" aria-hidden />
                  <span>{tProperty("filters.toggleLabel")}</span>
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="default"
                      className="ms-1 h-5 min-w-5 justify-center px-1.5 text-xs"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      "ms-1 size-4 transition-transform",
                      filtersPanelOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>

              <span
                className="text-sm text-muted-foreground"
                aria-live="polite"
              >
                {loading && data.length === 0
                  ? tCommon("loading")
                  : tProperty("filters.resultCount", {
                      count: pagination.total,
                    })}
              </span>

              <div className="ms-auto flex items-center gap-2">
                <Select
                  value={filters.sort}
                  onValueChange={(value) =>
                    setFilters({ ...filters, sort: value })
                  }
                >
                  <SelectTrigger
                    className="h-9 min-w-[140px] px-3 py-1 text-sm"
                    aria-label={tProperty("filters.sortBy")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at:desc">
                      {tProperty("filters.sort.newest")}
                    </SelectItem>
                    <SelectItem value="created_at:asc">
                      {tProperty("filters.sort.oldest")}
                    </SelectItem>
                    <SelectItem value="price:asc">
                      {tProperty("filters.sort.priceAsc")}
                    </SelectItem>
                    <SelectItem value="price:desc">
                      {tProperty("filters.sort.priceDesc")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={!hasActiveFilters}
                  data-testid="open-save-search-dialog-properties"
                >
                  <BookmarkPlus className="size-4" aria-hidden />
                  <span className="hidden sm:inline">
                    {tProperty("filters.saveSearch")}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <CollapsibleContent
            id={FILTERS_PANEL_ID}
            className="data-[state=open]:animate-fade-in"
            role="region"
            aria-label={tProperty("filters.toggleLabel")}
          >
            <Card>
              <CardContent className="space-y-4 p-4">
                <SearchAutocomplete
                  locale={locale}
                  initialQuery={filters.search}
                  basePath={`/${locale}/properties`}
                />
                <PropertyFilters
                  value={filters}
                  onChange={setFilters}
                  showSort={false}
                />
                <AdvancedFilters
                  values={advanced}
                  onChange={setAdvanced}
                  onReset={() => setAdvanced(EMPTY_ADVANCED_FILTERS)}
                />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <ActiveFilterChips
          chips={chips}
          onClearAll={resetFilters}
          clearAllLabel={tProperty("filters.clearAll")}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {tProperty("title")}
          </h1>
          <div className="flex items-center gap-2">
            <ShareButton />
            <ViewModeToggle value={view} onChange={setView} />
            <Button
              onClick={() => router.push("/properties/create")}
              size="sm"
              className="rounded-lg"
            >
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">
                {tProperty("create")}
              </span>
            </Button>
          </div>
        </div>

        <PropertyCarousel
          properties={featured}
          title={tHome("cta")}
          loading={featured.length === 0}
          error={null}
          onRetry={() => {
            void fetchFeatured().then((data) => setFeatured(data))
          }}
        />

        <div className="space-y-3">
          <h2 className="text-base font-semibold sm:text-lg">
            {tProperty("browse")}
          </h2>
          {loading && data.length === 0 ? (
            <div className={skeletonLayoutClass}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-pulse rounded-lg bg-muted",
                    view === "grid" ? "h-56" : "h-24"
                  )}
                />
              ))}
            </div>
          ) : data.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                <p className="font-medium">{tProperty("noResults")}</p>
              </CardContent>
            </Card>
          ) : view === "grid" ? (
            <div className={gridLayoutClass}>
              {data.map((property) => (
                <PropertyGridCard key={property.id} property={property} />
              ))}
            </div>
          ) : view === "list" ? (
            <div className="space-y-2">
              {data.map((property) => (
                <PropertyListRow
                  key={property.id}
                  property={toListItem(property)}
                />
              ))}
            </div>
          ) : (
            <PropertyMapView properties={data} />
          )}

          <div
            ref={loaderRef}
            className="flex items-center justify-center py-6 text-sm text-muted-foreground"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {tCommon("loading")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <SaveSearchDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        filters={candidateFilters}
      />
    </DashboardLayout>
  )
}

export default function PublicPropertiesPage() {
  return (
    <Suspense fallback={null}>
      <PublicPropertiesPageInner />
    </Suspense>
  )
}
