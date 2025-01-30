<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { UserDto } from '../../app/dto/user_dto'
import { BiotopeDto } from '../../app/dto/biotope_dto'
import BiotopeCard from '~/components/BiotopeCard.vue'
import TitleBar from '~/components/TitleBar.vue'
import PageContent from '~/components/PageContent.vue'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'

defineProps<{
  user: UserDto
  biotopes: BiotopeDto[]
}>()
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <div class="flex lg:flex-row flex-col gap-4 bg-surface-0 dark:bg-surface-900">
      <div class="flex-1 flex items-center">
        <div class="py-6 pt-12 lg:py-12 px-6 md:px-12 lg:px-20">
          <h1
            class="text-3xl lg:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4 lg:leading-normal"
          >
            {{ $t('appName') }}<br />
            <span class="text-primary dark:text-primary">{{
              $t('greeting', { fullName: user.fullName })
            }}</span>
          </h1>
          <p class="text-surface-700 dark:text-surface-200 leading-normal mb-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
          <div class="flex items-center gap-6">
            <Button :label="$t('auth.logout')" type="button" @click="router.post('/auth/logout')" />
          </div>
        </div>
      </div>
    </div>

    <PageContent>
      <ErrorAndNotificationDisplay />

      <TitleBar :title="$t('pages.biotopes.title')">
        <template #cta>
          <Button
            as="a"
            :label="$t('pages.biotopes.create.title')"
            type="button"
            href="/biotopes/create"
            icon="pi pi-plus"
          />
        </template>
      </TitleBar>

      <div class="flex flex-wrap gap-4">
        <BiotopeCard v-for="biotope in biotopes" :key="biotope.id" :biotope="biotope" />
      </div>
    </PageContent>
  </NavigationLayout>
</template>
