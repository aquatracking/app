<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { Check, Edit2 } from 'lucide-vue-next'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { UserDto } from '../../../../app/dto/user_dto'

defineProps<{
  users: UserDto[]
}>()
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
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {{ $t('fields.email') }}
            </TableHead>
            <TableHead>
              {{ $t('fields.fullName') }}
            </TableHead>
            <TableHead>
              {{ $t('fields.admin') }}
            </TableHead>
            <TableHead>
              {{ $t('fields.status') }}
            </TableHead>
            <TableHead>
              {{ $t('fields.createdAt') }}
            </TableHead>
            <TableHead>
              {{ $t('fields.updatedAt') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in users" :key="user.id">
            <TableCell class="font-medium">
              {{ user.email }}
            </TableCell>
            <TableCell>{{ user.fullName }}</TableCell>
            <TableCell>
              <Check v-if="user.isAdmin" class="w-4 h-4 text-primary" />
            </TableCell>
            <TableCell>
              <Badge :variant="user.verified ? 'default' : 'destructive'">
                {{ user.verified ? $t('auth.status.verified') : $t('auth.status.notVerified') }}
              </Badge>
            </TableCell>
            <TableCell> {{ $d(user.createdAt) }}</TableCell>
            <TableCell> {{ $d(user.updatedAt) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </PageContent>
  </NavigationLayout>
</template>
