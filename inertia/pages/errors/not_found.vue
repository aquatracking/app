<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import AppLayout from '~/layouts/app.vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'

defineOptions({ layout: AppLayout })

const { t } = useI18n()
</script>

<template>
  <Head :title="t('errors.not_found.title')" />
  <div class="flex flex-col items-center gap-4 py-16 text-center">
    <h1 class="text-2xl font-semibold">{{ t('errors.not_found.title') }}</h1>
    <p class="text-muted-foreground">{{ t('errors.not_found.description') }}</p>
    <Button as-child>
      <Link route="home">{{ t('app.back_home') }}</Link>
    </Button>
  </div>
</template>
