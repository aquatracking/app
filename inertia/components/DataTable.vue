<script setup lang="ts" generic="TData, TValue">
import type { ColumnDef, SortDirection, SortingState } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-vue-next'
import { computed, h } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { valueUpdater } from '~/lib/utils'
import { Button } from './ui/button'

const props = defineProps<{
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}>()

const emit = defineEmits(['update:sorting'])

function getSortIcon(sorting: SortDirection | false) {
  if (!sorting) return ChevronsUpDown
  if (sorting === 'asc') return ChevronUp
  return ChevronDown
}

const cols = computed<ColumnDef<TData, TValue>[]>(() => {
  return props.columns.map((col) => {
    if (!col.enableSorting) return col

    return {
      ...col,
      header: (p) => {
        return h(
          Button,
          {
            variant: 'ghost',
            onClick: () => p.column.toggleSorting(p.column.getIsSorted() === 'asc'),
          },
          () => [
            col.header instanceof Function ? col.header(p) : col.header,
            h(getSortIcon(p.column.getIsSorted()), { class: 'ml-2 h-4 w-4' }),
          ]
        )
      },
    }
  }) as ColumnDef<TData, TValue>[]
})

const sorting = defineModel<SortingState>('sorting', {
  default: [],
})

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return cols.value
  },
  getCoreRowModel: getCoreRowModel(),
  onSortingChange: (updaterOrValue) => {
    valueUpdater(updaterOrValue, sorting)
    emit('update:sorting', sorting.value)
  },
  state: {
    get sorting() {
      return sorting.value
    },
  },
})
</script>

<template>
  <p>{{ sorting }}</p>
  <div class="border rounded-md">
    <Table>
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead v-for="header in headerGroup.headers" :key="header.id">
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="table.getRowModel().rows?.length">
          <TableRow
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :data-state="row.getIsSelected() ? 'selected' : undefined"
          >
            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>
        </template>
        <template v-else>
          <TableRow>
            <TableCell :colspan="columns.length" class="h-24 text-center"> No results. </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
