<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import FlashNotification from '~/components/flash_notification.vue'

const { t } = useI18n()
const page = usePage()
</script>

<template>
  <!-- Default document title ("AquaTracking"), replaced by a page's own <Head> -->
  <Head title="" />
  <div class="min-h-svh bg-background">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link route="vivariums.index" class="font-semibold">{{ t('app.name') }}</Link>
        <nav v-if="page.props.user" class="ml-auto flex items-center gap-2">
          <Button v-if="page.props.user.isAdmin" variant="ghost" size="sm" as-child>
            <Link route="admin.users.index">{{ t('admin.title') }}</Link>
          </Button>
          <Button variant="ghost" size="sm" as-child>
            <Link route="profile.edit">{{ page.props.user.firstName }}</Link>
          </Button>
          <Button variant="outline" size="sm" as-child>
            <Link route="session.destroy" as="button">{{ t('auth.logout') }}</Link>
          </Button>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <slot />
    </main>
    <FlashNotification />
  </div>
</template>
