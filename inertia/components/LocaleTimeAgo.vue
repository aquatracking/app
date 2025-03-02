<script setup lang="ts">
import { useLocaleTimeAgo } from '~/composables/use_locale_time_ago'

const props = defineProps<{
  date: Date | string
}>()
const timeAgo = useLocaleTimeAgo(() => props.date)
</script>

<template>
  <slot v-bind="{ timeAgo }">
    <span>{{ timeAgo }}</span>
  </slot>
</template>
