<script setup lang="ts">
import { computed } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import { LogOut, Shield, UserRound } from '@lucide/vue'
import { Link } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import FlashNotification from '~/components/flash_notification.vue'

const { t } = useI18n()
const page = usePage()

/**
 * Every page of the administration (users and invitations) marks its link.
 */
const inAdministration = computed(() => page.component.startsWith('admin/'))
</script>

<template>
  <!-- Default document title ("AquaTracking"), replaced by a page's own <Head> -->
  <Head title="" />
  <div class="min-h-svh bg-background">
    <header class="border-b">
      <div class="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link route="vivariums.index" class="shrink-0 font-semibold">{{ t('app.name') }}</Link>
        <!-- Below "sm", the links are icons whose text is only read by screen readers -->
        <nav v-if="page.props.user" class="ml-auto flex min-w-0 items-center gap-2">
          <Button
            v-if="page.props.user.isAdmin"
            :variant="inAdministration ? 'secondary' : 'ghost'"
            size="sm"
            as-child
          >
            <Link route="admin.users.index"
              ><Shield /><span class="sr-only sm:not-sr-only">{{ t('admin.title') }}</span></Link
            >
          </Button>
          <Button variant="ghost" size="sm" class="min-w-0" as-child>
            <Link route="profile.edit"
              ><UserRound /><span class="sr-only sm:not-sr-only sm:truncate">{{
                page.props.user.firstName
              }}</span></Link
            >
          </Button>
          <Button variant="outline" size="sm" as-child>
            <Link route="session.destroy" as="button"
              ><LogOut /><span class="sr-only sm:not-sr-only">{{ t('auth.logout') }}</span></Link
            >
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
