<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BiotopeCard from '~/components/BiotopeCard.vue'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import { Button } from '~/components/ui/button'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { BiotopeDto } from '../../app/dto/biotope_dto'
import { UserDto } from '../../app/dto/user_dto'
import { Plus } from 'lucide-vue-next'
import { Link } from '@inertiajs/vue3'

defineProps<{
  user: UserDto
  biotopes: BiotopeDto[]
}>()
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <div class="flex lg:flex-row flex-col gap-4 bg-accent">
      <div class="flex-1 flex items-center">
        <div class="py-6 pt-12 lg:py-12 px-6 md:px-12 lg:px-20">
          <h1 class="text-3xl lg:text-5xl font-bold text-accent-foreground mb-4 lg:leading-normal">
            {{ $t('appName') }}<br />
            <span class="text-primary">{{ $t('greeting', { fullName: user.fullName }) }}</span>
          </h1>
          <p class="text-accent-foreground leading-normal mb-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
          <div class="flex items-center gap-6">
            <Button type="button" @click="router.post('/auth/logout')">
              {{ $t('auth.logout') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <PageContent>
      <ErrorAndNotificationDisplay />

      <TitleBar :title="$t('pages.biotopes.title')">
        <template #cta>
          <Button :as="Link" href="/biotopes/create">
            <Plus class="w-4 h-4 mr-2" />
            {{ $t('pages.biotopes.create.title') }}
          </Button>
        </template>
      </TitleBar>

      <div class="flex flex-wrap gap-4">
        <BiotopeCard v-for="biotope in biotopes" :key="biotope.id" :biotope="biotope" />
      </div>
    </PageContent>
  </NavigationLayout>
</template>
