<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { ColumnDef } from '@tanstack/vue-table'
import { Check, Edit2 } from 'lucide-vue-next'
import { h } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from '~/components/DataTable.vue'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import { Button } from '~/components/ui/button'
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
} from '~/components/ui/pagination'
import { useQueryParams } from '~/composables/use_query_param'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { PaginatedDto } from '../../../../app/dto/paginated_dto'
import { UserDto } from '../../../../app/dto/user_dto'

defineProps<{
  users: PaginatedDto<UserDto>
}>()

const { t, d } = useI18n()
const query = useQueryParams()

const columns: ColumnDef<UserDto>[] = [
  {
    accessorKey: 'email',
    enableSorting: true,
    header: t('fields.email'),
    cell: ({ row }) => row.getValue('email'),
  },
  {
    accessorKey: 'fullName',
    enableSorting: true,
    header: t('fields.fullName'),
    cell: ({ row }) => row.getValue('fullName'),
  },
  {
    accessorKey: 'isAdmin',
    enableSorting: true,
    header: t('fields.admin'),
    cell: ({ row }) => {
      const isAdmin = row.getValue('isAdmin')
      return isAdmin ? h(Check, { class: 'w-4 h-4 text-primary' }) : undefined
    },
  },
  {
    accessorKey: 'verified',
    enableSorting: true,
    header: t('fields.status'),
    cell: ({ row }) => {
      const verified = row.getValue('verified')

      return h(
        Badge,
        { variant: verified ? 'default' : 'destructive' },
        verified ? t('auth.status.verified') : t('auth.status.notVerified')
      )
    },
  },
  {
    accessorKey: 'createdAt',
    enableSorting: true,
    header: t('fields.createdAt'),
    cell: ({ row }) => d(row.getValue('createdAt')),
  },
  {
    accessorKey: 'updatedAt',
    enableSorting: true,
    header: t('fields.updatedAt'),
    cell: ({ row }) => d(row.getValue('updatedAt')),
  },
]

async function setPage(page: number) {
  router.reload({ data: { ...query.value, page }, replace: true })
}
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <PageContent>
      <TitleBar
        :title="$t('pages.admin.users.title')"
        :breadcrumb="[
          { label: $t('pages.home.title'), href: '/' },
          { label: $t('pages.admin.users.title'), href: '/admin/users' },
        ]"
      >
        <template #cta>
          <Button variant="secondary" :as="Link" href="">
            <Edit2 class="w-4 h-4 mr-2" />
            {{ $t('pages.biotopes.edit.title') }}
          </Button>
        </template>
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <DataTable :columns="columns" :data="users.data" @update:sorting="console.log" />

      <Pagination
        v-if="users.meta.total > users.meta.perPage"
        class="mx-auto"
        v-slot="{ page }"
        :items-per-page="users.meta.perPage"
        :total="users.meta.total"
        :sibling-count="1"
        show-edges
        :page="users.meta.currentPage"
        @update:page="setPage"
      >
        <PaginationList v-slot="{ items }" class="flex items-center gap-1">
          <PaginationFirst />
          <PaginationPrev />

          <template v-for="(item, index) in items">
            <PaginationListItem
              v-if="item.type === 'page'"
              :key="index"
              :value="item.value"
              as-child
            >
              <Button class="w-10 h-10 p-0" :variant="item.value === page ? 'default' : 'outline'">
                {{ item.value }}
              </Button>
            </PaginationListItem>
            <PaginationEllipsis v-else :key="item.type" :index="index" />
          </template>

          <PaginationNext />
          <PaginationLast />
        </PaginationList>
      </Pagination>
    </PageContent>
  </NavigationLayout>
</template>
