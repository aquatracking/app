<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'

defineProps<{ current: 'users' | 'invitations' }>()

const { t } = useI18n()
</script>

<template>
  <nav class="flex gap-2" :aria-label="t('admin.title')">
    <Button :variant="current === 'users' ? 'secondary' : 'ghost'" size="sm" as-child>
      <Link route="admin.users.index" :aria-current="current === 'users' ? 'page' : undefined">
        {{ t('admin.users.title') }}
      </Link>
    </Button>
    <Button :variant="current === 'invitations' ? 'secondary' : 'ghost'" size="sm" as-child>
      <Link
        route="admin.invitations.index"
        :aria-current="current === 'invitations' ? 'page' : undefined"
      >
        {{ t('admin.invitations.title') }}
      </Link>
    </Button>
  </nav>
</template>
