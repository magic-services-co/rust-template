import {
    columnFilteringFeature,
    columnVisibilityFeature,
    constructFilterFn,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFn_includesString,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_basic,
    tableFeatures,
} from "@tanstack/react-table"

const statusFilter = constructFilterFn({
    filter: (dataValue, filterValue) => filterValue === "all" || dataValue === filterValue,
})

export const appTableFeatures = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortedRowModel: createSortedRowModel(),
    filterFns: {
        includesString: filterFn_includesString,
        status: statusFilter,
    },
    sortFns: {
        alphanumeric: sortFn_alphanumeric,
        basic: sortFn_basic,
    },
})

export type AppTableFeatures = typeof appTableFeatures
