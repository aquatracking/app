<script setup lang="ts">
import AppLayout from '~/layouts/app.vue'
import { useI18n } from '~/composables/use_i18n'

defineOptions({ layout: AppLayout })

const { t } = useI18n()
</script>

<template>
  <h1 class="text-2xl font-semibold">{{ t('app.name') }}</h1>
  <p class="mt-2 text-muted-foreground">{{ t('app.tagline') }}</p>
</template>
