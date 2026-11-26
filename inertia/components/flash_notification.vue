<script setup lang="ts">
/**
 * Shows the flash `notification` of the Inertia middleware as a toast.
 */
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import { usePage } from '@inertiajs/vue3'
import { Toaster } from '~/components/ui/sonner'

const page = usePage()

/**
 * Browser only: during SSR, vue-sonner would keep the toast in a
 * module-level store shared by every request.
 */
if (!import.meta.env.SSR) {
  watch(
    () => page.flash.notification,
    (notification) => {
      if (!notification) return
      if (notification.type === 'error') toast.error(notification.message)
      else toast.success(notification.message)
    },
    { immediate: true }
  )
}
</script>

<template>
  <Toaster position="top-center" theme="system" />
</template>
