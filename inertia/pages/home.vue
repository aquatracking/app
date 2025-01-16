<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NavigationLayout from '~/layouts/NavigationLayout.vue'

const { t } = useI18n()
</script>

<template>
  <NavigationLayout :title="t('pages.home.title')">
    <div class="flex lg:flex-row flex-col gap-4 bg-surface-0 dark:bg-surface-900">
      <div class="flex-1 flex items-center justify-center">
        <div class="p-6 pt-12 lg:p-12">
          <h1
            class="text-3xl lg:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4 lg:leading-normal text-center lg:text-left"
          >
            {{ t('appName') }}<br />
            <span class="text-primary dark:text-primary">{{ t('greeting') }}</span>
          </h1>
          <p
            class="text-surface-700 dark:text-surface-200 leading-normal mb-8 text-center lg:text-left"
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </div>
    </div>
  </NavigationLayout>
</template>
