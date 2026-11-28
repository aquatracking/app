<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { Form } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import DeleteUserDialog from '~/components/admin/delete_user_dialog.vue'

/**
 * Actions on an account of the administration: password reset link,
 * administrator rights and deletion. Shared by the table and the cards.
 */
const props = defineProps<{
  user: Pick<Data.User.Variants['forAdmin'], 'id' | 'email' | 'displayName' | 'isAdmin'>
}>()

const { t } = useI18n()
const page = usePage()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Form route="admin.users.create_password_reset" :params="{ id: props.user.id }">
      <Button type="submit" variant="outline" size="sm">
        {{ t('admin.users.password_reset') }}
      </Button>
    </Form>
    <!-- Own account: neither rights removal nor deletion -->
    <template v-if="props.user.id !== page.props.user?.id">
      <Form route="admin.users.toggle_admin" :params="{ id: props.user.id }">
        <input type="hidden" name="isAdmin" :value="String(!props.user.isAdmin)" />
        <Button type="submit" variant="outline" size="sm">
          {{ props.user.isAdmin ? t('admin.users.remove_admin') : t('admin.users.make_admin') }}
        </Button>
      </Form>
      <DeleteUserDialog :user="props.user" />
    </template>
  </div>
</template>
