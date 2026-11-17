import { useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import {
  shortcuts,
  useShortcut,
  useShortcutHint,
} from "@ui-sdk/react/shortcuts"
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  MoreHorizontalIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { ArchiveDialog } from "@/components/archive-dialog"
import { CopyButton } from "@/components/copy-button"
import { Segmented } from "@/components/segmented"
import {
  api,
  makeCustomers,
  money,
  type Customer,
  type CustomerStatus,
  type Plan,
} from "@/lib/data"
import { usePref } from "@/lib/prefs"

type StatusFilter = "all" | CustomerStatus
const STATUS: readonly StatusFilter[] = ["all", "active", "trial", "churned"]
type PlanFilter = "all" | Plan
const PLANS: readonly PlanFilter[] = [
  "all",
  "Free",
  "Pro",
  "Team",
  "Enterprise",
]
const PLAN_ITEMS = PLANS.map((p) => ({
  value: p,
  label: p === "all" ? "All plans" : p,
}))
type ColumnMeta = { numeric?: boolean; hideBelow?: "sm" | "md" | "lg" }

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  columnMeta: metaHelper<ColumnMeta>(),
})

const statusTone = {
  active: "success",
  trial: "warning",
  churned: "secondary",
} as const

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>(makeCustomers)
  const [params, setParams] = useSearchParams()
  const query = params.get("q") ?? ""
  const [status, setStatus] = usePref<StatusFilter>(
    "customers.status",
    "all",
    STATUS
  )
  const [plan, setPlan] = usePref<PlanFilter>("customers.plan", "all", PLANS)
  const [density] = usePref("settings.density", "comfortable", [
    "comfortable",
    "compact",
  ] as const)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "mrr", desc: true },
  ])
  const [selection, setSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [archiving, setArchiving] = useState<Customer[] | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchHint = useShortcutHint("/")

  const setQuery = (q: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (q) next.set("q", q)
        else next.delete("q")
        return next
      },
      { replace: true }
    )

  useShortcut("/", () => searchRef.current?.focus(), {
    description: "Search customers",
  })
  useShortcut("escape", () => setQuery(""), {
    scope: "customer-search",
    allowInInput: true,
    when: () => query !== "",
  })

  const filtered = useMemo(
    () =>
      rows.filter(
        (c) =>
          (status === "all" || c.status === status) &&
          (plan === "all" || c.plan === plan)
      ),
    [rows, status, plan]
  )

  const columns = useMemo<ColumnDef<typeof features, Customer>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all on this page"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              !table.getIsAllPageRowsSelected() &&
              table.getIsSomePageRowsSelected()
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(v)}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-1">
            <div className="grid min-w-0">
              <span className="truncate font-medium">{row.original.name}</span>
              <span className="truncate text-[13px] leading-[18px] text-muted-foreground">
                {row.original.email}
              </span>
            </div>
            <CopyButton
              text={row.original.email}
              label={`Copy ${row.original.name}'s email`}
            />
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={statusTone[row.original.status]}
            className="capitalize"
          >
            {row.original.status}
          </Badge>
        ),
      },
      { accessorKey: "plan", header: "Plan", meta: { hideBelow: "sm" } },
      {
        accessorKey: "seats",
        header: "Seats",
        meta: { numeric: true, hideBelow: "md" },
        cell: ({ getValue }) => (
          <span className="tabular font-mono">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "mrr",
        header: "MRR",
        meta: { numeric: true },
        cell: ({ getValue }) => (
          <span className="tabular font-mono">
            {money.format(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: "joined",
        header: "Joined",
        meta: { hideBelow: "lg" },
        cell: ({ getValue }) => (
          <span className="tabular font-mono text-[13px] text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${row.original.name}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(row.original.id).catch(() =>
                    toast.error("Couldn't copy", {
                      description: "Select the ID and copy it.",
                    })
                  )
                }
              >
                <CopyIcon /> Copy customer ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setArchiving([row.original])}
              >
                <ArchiveIcon /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  )

  const table = useTable({
    features,
    data: filtered,
    columns,
    state: {
      sorting,
      rowSelection: selection,
      globalFilter: query,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: () => {},
    globalFilterFn: (row, _id, value: string) =>
      `${row.original.name} ${row.original.email}`
        .toLowerCase()
        .includes(value.toLowerCase()),
    autoResetPageIndex: true,
  })

  const selected = table.getSelectedRowModel().rows.map((r) => r.original)
  const { pageIndex, pageSize } = pagination
  const count = table.getFilteredRowModel().rows.length
  const rowClass =
    density === "compact" ? "h-11 [&>td]:py-0.5" : "h-[52px] [&>td]:py-1"

  const archive = async (targets: Customer[]) => {
    await Promise.all(targets.map((c) => api.archiveCustomer(c.id)))
    const ids = new Set(targets.map((c) => c.id))
    const before = rows
    setRows((prev) => prev.filter((c) => !ids.has(c.id)))
    setSelection({})
    toast.success(
      targets.length === 1
        ? `Archived ${targets[0].name}`
        : `Archived ${targets.length} customers`,
      {
        description: "They no longer count toward MRR.",
        action: { label: "Undo", onClick: () => setRows(before) },
      }
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search customers"
            aria-keyshortcuts={searchHint.ariaKeyshortcuts}
            placeholder="Search name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => shortcuts.setScope("customer-search", true)}
            onBlur={() => shortcuts.setScope("customer-search", false)}
            className="px-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("")
                searchRef.current?.focus()
              }}
              className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border px-1.5 font-mono text-xs text-muted-foreground">
              {searchHint.text}
            </kbd>
          )}
        </div>
        <Segmented
          label="Status"
          value={status}
          onChange={setStatus}
          stretch
          options={STATUS.map((s) => ({
            value: s,
            label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1),
          }))}
        />
        <Select
          items={PLAN_ITEMS}
          value={plan}
          onValueChange={(v) => v && setPlan(v)}
        >
          <SelectTrigger aria-label="Plan" className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PLAN_ITEMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <Badge variant="secondary">{selected.length} selected</Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setArchiving(selected)}
            >
              <ArchiveIcon /> Archive
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[520px] table-fixed">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-24" />
            <col className="hidden w-24 sm:table-column" />
            <col className="hidden w-20 md:table-column" />
            <col className="w-24" />
            <col className="hidden w-28 lg:table-column" />
            <col className="w-12" />
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted
                          ? sorted === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className={`h-10 px-3 text-[13px] text-muted-foreground first:pl-4 last:pr-4 ${cellClasses(meta)}`}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={`-mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 hover:text-foreground ${meta?.numeric ? "flex-row-reverse" : ""} ${sorted ? "text-foreground" : ""}`}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3.5" aria-hidden />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDownIcon
                              className="size-3.5 opacity-50"
                              aria-hidden
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={rowClass}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-3 first:pl-4 last:pr-4 ${cellClasses(cell.column.columnDef.meta)}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No customers match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
          <span
            className="tabular font-mono text-[13px] text-muted-foreground"
            aria-live="polite"
          >
            {count
              ? `${pageIndex * pageSize + 1}–${Math.min(count, (pageIndex + 1) * pageSize)} of ${count}`
              : "0 results"}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      <ArchiveDialog
        targets={archiving}
        onClose={() => setArchiving(null)}
        onConfirm={archive}
      />
    </div>
  )
}

function cellClasses(meta?: ColumnMeta) {
  return [
    meta?.numeric ? "text-right" : "",
    meta?.hideBelow ? hideClass[meta.hideBelow] : "",
  ].join(" ")
}

const hideClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
}
