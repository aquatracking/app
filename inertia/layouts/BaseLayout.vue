<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

defineProps<{ title: string }>()

const { locale } = useI18n()
const page = usePage()

locale.value = page.props.locale as string

useColorMode()
</script>
<template>
  <Head :title="title" />

  <slot />
</template>
