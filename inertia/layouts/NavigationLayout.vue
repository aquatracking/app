<script setup lang="ts">
import BaseLayout from './BaseLayout.vue'

defineProps<{ title: string }>()
</script>
<template>
  <BaseLayout :title="title">
    <main><slot /></main>
  </BaseLayout>
</template>
