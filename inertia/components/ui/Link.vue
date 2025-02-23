<script setup lang="ts">
import { Link as InertiaLink } from '@inertiajs/vue3'

defineProps<{
  href: string
}>()
</script>

<template>
  <InertiaLink class="underline" :href="href" v-bind="$attrs">
    <slot />
  </InertiaLink>
</template>
