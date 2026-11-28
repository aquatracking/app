<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'

/**
 * Actions on an invitation: renew it or revoke it. Shared by the table
 * and the cards of the administration.
 */
const props = defineProps<{ invitation: { id: string } }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Form route="admin.invitations.renew" :params="{ id: props.invitation.id }">
      <Button type="submit" variant="outline" size="sm">
        {{ t('admin.invitations.renew') }}
      </Button>
    </Form>
    <Form route="admin.invitations.destroy" :params="{ id: props.invitation.id }">
      <Button type="submit" variant="destructive" size="sm">
        {{ t('admin.invitations.revoke') }}
      </Button>
    </Form>
  </div>
</template>
