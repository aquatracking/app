<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { PrimeVueLocaleOptions, usePrimeVue } from 'primevue/config'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from 'primevue/confirmdialog'
import { useColorMode } from '@vueuse/core'

defineProps<{ title: string }>()

const { locale, messages } = useI18n()
const page = usePage()

locale.value = page.props.locale as string

useColorMode()

const primevue = usePrimeVue()

primevue.config.locale = messages.value[locale.value as string]?.primevue as
  | PrimeVueLocaleOptions
  | undefined
</script>
<template>
  <Head :title="title" />

  <ConfirmDialog> </ConfirmDialog>

  <slot />
</template>
