<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Form } from '@adonisjs/inertia/vue'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useDates } from '~/composables/use_dates'
import { useI18n } from '~/composables/use_i18n'
import AdminTabs from '~/components/admin/admin_tabs.vue'
import GeneratedLinkDialog from '~/components/admin/generated_link_dialog.vue'
import InvitationActions from '~/components/admin/invitation_actions.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

defineOptions({ layout: AppLayout })

const props = defineProps<{
  invitations: {
    id: string
    email: string
    invitedByName: string | null
    expiresAt: string
    expired: boolean
  }[]
}>()

const { t } = useI18n()
const { formatDateTime } = useDates()
</script>

<template>
  <Head :title="t('admin.invitations.title')" />
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">{{ t('admin.title') }}</h1>
      <AdminTabs current="invitations" />
    </div>

    <Card>
      <CardHeader>
        <CardTitle
          ><h2>{{ t('admin.invitations.create_title') }}</h2></CardTitle
        >
        <CardDescription>{{ t('admin.invitations.create_description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          v-slot="{ errors, processing }"
          route="admin.invitations.store"
          reset-on-success
          class="flex flex-wrap items-start gap-2"
        >
          <Field :data-invalid="!!errors.email" class="min-w-0 flex-1 basis-56">
            <FieldLabel for="email" class="sr-only">{{ t('auth.email') }}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autocomplete="off"
              data-1p-ignore
              data-bwignore
              data-lpignore="true"
              data-form-type="other"
              required
              :placeholder="t('auth.email')"
              :aria-invalid="!!errors.email"
            />
            <FieldError :errors="[errors.email]" />
          </Field>
          <Button type="submit" :disabled="processing">{{ t('admin.invitations.submit') }}</Button>
        </Form>
      </CardContent>
    </Card>

    <!-- Below "md", one card per invitation: the table would scroll horizontally -->
    <p
      v-if="props.invitations.length === 0"
      class="rounded-lg border border-dashed p-6 text-center text-sm md:hidden"
    >
      {{ t('admin.invitations.empty') }}
    </p>
    <ul v-else class="flex flex-col gap-3 md:hidden">
      <li v-for="invitation in props.invitations" :key="invitation.id">
        <Card class="gap-3 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-medium break-all">{{ invitation.email }}</h2>
            <Badge :variant="invitation.expired ? 'destructive' : 'secondary'">
              {{
                invitation.expired ? t('admin.invitations.expired') : t('admin.invitations.pending')
              }}
            </Badge>
          </div>
          <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <dt class="text-muted-foreground">{{ t('admin.invitations.invited_by') }}</dt>
            <dd>{{ invitation.invitedByName ?? '—' }}</dd>
            <dt class="text-muted-foreground">{{ t('admin.invitations.expires_at') }}</dt>
            <dd>{{ formatDateTime(invitation.expiresAt) }}</dd>
          </dl>
          <InvitationActions :invitation="invitation" />
        </Card>
      </li>
    </ul>

    <Table class="hidden md:table">
      <TableHeader>
        <TableRow>
          <TableHead>{{ t('admin.invitations.email') }}</TableHead>
          <TableHead>{{ t('admin.invitations.invited_by') }}</TableHead>
          <TableHead>{{ t('admin.invitations.expires_at') }}</TableHead>
          <TableHead>{{ t('admin.invitations.status') }}</TableHead>
          <TableHead class="text-right">{{ t('admin.actions') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="invitation in props.invitations" :key="invitation.id">
          <TableCell class="font-medium">{{ invitation.email }}</TableCell>
          <TableCell>{{ invitation.invitedByName ?? '—' }}</TableCell>
          <TableCell>{{ formatDateTime(invitation.expiresAt) }}</TableCell>
          <TableCell>
            <Badge :variant="invitation.expired ? 'destructive' : 'secondary'">
              {{
                invitation.expired ? t('admin.invitations.expired') : t('admin.invitations.pending')
              }}
            </Badge>
          </TableCell>
          <TableCell>
            <InvitationActions :invitation="invitation" class="justify-end" />
          </TableCell>
        </TableRow>
        <TableEmpty v-if="props.invitations.length === 0" :colspan="5">
          {{ t('admin.invitations.empty') }}
        </TableEmpty>
      </TableBody>
    </Table>
    <GeneratedLinkDialog />
  </div>
</template>
