<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'

/**
 * Content of an error page: its title and description are the
 * translations "errors.<error>.title" and ".description".
 */
const props = defineProps<{ error: 'not_found' | 'forbidden' | 'server_error' }>()

const { t } = useI18n()
</script>

<template>
  <Head :title="t(`errors.${props.error}.title`)" />
  <div class="flex flex-col items-center gap-4 py-16 text-center">
    <h1 class="text-2xl font-semibold">{{ t(`errors.${props.error}.title`) }}</h1>
    <p class="text-muted-foreground">{{ t(`errors.${props.error}.description`) }}</p>
    <Button as-child>
      <Link route="vivariums.index">{{ t('app.back_home') }}</Link>
    </Button>
  </div>
</template>
