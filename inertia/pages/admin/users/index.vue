<script setup lang="ts">
import AppLayout from '~/layouts/app.vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useDates } from '~/composables/use_dates'
import { useI18n } from '~/composables/use_i18n'
import AdminTabs from '~/components/admin/admin_tabs.vue'
import DeleteUserDialog from '~/components/admin/delete_user_dialog.vue'
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
const page = usePage()
</script>

<template>
  <Head :title="t('admin.users.title')" />
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">{{ t('admin.title') }}</h1>
      <AdminTabs current="users" />
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{{ t('admin.users.name') }}</TableHead>
          <TableHead>{{ t('admin.users.email') }}</TableHead>
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
          <TableCell class="font-medium">{{ user.displayName }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
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
          <TableCell>
            <div class="flex flex-wrap justify-end gap-2">
              <Form route="admin.users.create_password_reset" :params="{ id: user.id }">
                <Button type="submit" variant="outline" size="sm">
                  {{ t('admin.users.password_reset') }}
                </Button>
              </Form>
              <!-- Own account: neither rights removal nor deletion -->
              <template v-if="user.id !== page.props.user?.id">
                <Form route="admin.users.toggle_admin" :params="{ id: user.id }">
                  <input type="hidden" name="isAdmin" :value="String(!user.isAdmin)" />
                  <Button type="submit" variant="outline" size="sm">
                    {{ user.isAdmin ? t('admin.users.remove_admin') : t('admin.users.make_admin') }}
                  </Button>
                </Form>
                <DeleteUserDialog :user="user" />
              </template>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <GeneratedLinkDialog />
  </div>
</template>
