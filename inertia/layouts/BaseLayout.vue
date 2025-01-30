<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { PrimeVueLocaleOptions, usePrimeVue } from 'primevue/config'
import { useI18n } from 'vue-i18n'

defineProps<{ title: string }>()

const { locale, messages } = useI18n()
const page = usePage()

locale.value = page.props.locale as string

const primevue = usePrimeVue()

primevue.config.locale = messages.value[locale.value as string]?.primevue as
  | PrimeVueLocaleOptions
  | undefined
</script>
<template>
  <Head :title="title" />
  <slot />
</template>
