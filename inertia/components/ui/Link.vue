<script setup lang="ts">
import { Link as InertiaLink } from '@inertiajs/vue3'

defineProps<{
  href: string
}>()
</script>

<template>
  <InertiaLink
    class="text-primary cursor-pointer rounded-sm outline-primary outline-offset-1 outline-1 hover:text-primary-emphasis active:text-primary-emphasis-alt focus-visible:outline"
    :href="href"
    v-bind="$attrs"
  >
    <slot />
  </InertiaLink>
</template>
