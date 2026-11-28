<script setup lang="ts">
import AppLayout from '~/layouts/app.vue'
import { Head } from '@inertiajs/vue3'
import { Card } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { useDates } from '~/composables/use_dates'
import { useI18n } from '~/composables/use_i18n'
import AdminTabs from '~/components/admin/admin_tabs.vue'
import UserActions from '~/components/admin/user_actions.vue'
import GeneratedLinkDialog from '~/components/admin/generated_link_dialog.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

defineOptions({ layout: AppLayout })

const props = defineProps<{
  users: {
    id: string
    displayName: string
    email: string
    isAdmin: boolean
    invitedByName: string | null
    createdAt: string
    lastSeenAt: string | null
    vivariumsCount: number
  }[]
}>()

const { t } = useI18n()
const { formatDate, formatDateTime, formatRelative } = useDates()
</script>

<template>
  <Head :title="t('admin.users.title')" />
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">{{ t('admin.title') }}</h1>
      <AdminTabs current="users" />
    </div>

    <!-- Below "lg", one card per account: the table would scroll horizontally -->
    <ul class="flex flex-col gap-3 lg:hidden">
      <li v-for="user in props.users" :key="user.id">
        <Card class="gap-3 p-4">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-medium">{{ user.displayName }}</h2>
            <Badge v-if="user.isAdmin">{{ t('admin.users.admin') }}</Badge>
          </div>
          <p class="-mt-2 text-sm break-all text-muted-foreground">{{ user.email }}</p>
          <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <dt class="text-muted-foreground">{{ t('admin.users.invited_by') }}</dt>
            <dd>{{ user.invitedByName ?? '—' }}</dd>
            <dt class="text-muted-foreground">{{ t('admin.users.signed_up') }}</dt>
            <dd>{{ formatDate(user.createdAt) }}</dd>
            <dt class="text-muted-foreground">{{ t('admin.users.last_seen') }}</dt>
            <dd>
              <time
                v-if="user.lastSeenAt"
                :datetime="user.lastSeenAt"
                :title="formatDateTime(user.lastSeenAt)"
                >{{ formatRelative(user.lastSeenAt) }}</time
              >
              <template v-else>{{ t('admin.users.never_seen') }}</template>
            </dd>
            <dt class="text-muted-foreground">{{ t('admin.users.vivariums') }}</dt>
            <dd class="tabular-nums">{{ user.vivariumsCount }}</dd>
          </dl>
          <UserActions :user="user" />
        </Card>
      </li>
    </ul>

    <Table class="hidden lg:table">
      <TableHeader>
        <TableRow>
          <TableHead>{{ t('admin.users.name') }}</TableHead>
          <TableHead>{{ t('admin.users.role') }}</TableHead>
          <TableHead>{{ t('admin.users.invited_by') }}</TableHead>
          <TableHead>{{ t('admin.users.signed_up') }}</TableHead>
          <TableHead>{{ t('admin.users.last_seen') }}</TableHead>
          <TableHead class="text-right">{{ t('admin.users.vivariums') }}</TableHead>
          <TableHead class="text-right">{{ t('admin.actions') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="user in props.users" :key="user.id">
          <!-- Name and email in one column, so that the actions fit without scrolling -->
          <TableCell>
            <div class="font-medium">{{ user.displayName }}</div>
            <div class="text-muted-foreground">{{ user.email }}</div>
          </TableCell>
          <TableCell>
            <Badge v-if="user.isAdmin">{{ t('admin.users.admin') }}</Badge>
          </TableCell>
          <TableCell>{{ user.invitedByName ?? '—' }}</TableCell>
          <TableCell>{{ formatDate(user.createdAt) }}</TableCell>
          <TableCell>
            <time
              v-if="user.lastSeenAt"
              :datetime="user.lastSeenAt"
              :title="formatDateTime(user.lastSeenAt)"
              >{{ formatRelative(user.lastSeenAt) }}</time
            >
            <span v-else class="text-muted-foreground">{{ t('admin.users.never_seen') }}</span>
          </TableCell>
          <TableCell class="text-right tabular-nums">{{ user.vivariumsCount }}</TableCell>
          <TableCell class="whitespace-normal">
            <UserActions :user="user" class="justify-end" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <GeneratedLinkDialog />
  </div>
</template>
