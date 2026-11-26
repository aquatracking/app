<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { useI18n } from '~/composables/use_i18n'
import FlashNotification from '~/components/flash_notification.vue'

const { t } = useI18n()
</script>

<template>
  <!-- Default document title ("AquaTracking"), replaced by a page's own <Head> -->
  <Head title="" />
  <div class="min-h-svh bg-background">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link route="home" class="font-semibold">{{ t('app.name') }}</Link>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <slot />
    </main>
    <FlashNotification />
  </div>
</template>
