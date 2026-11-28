<script setup lang="ts">
import AppLayout from '~/layouts/app.vue'
import ErrorPage from '~/components/error_page.vue'

defineOptions({ layout: AppLayout })
</script>

<template>
  <ErrorPage error="forbidden" />
</template>
