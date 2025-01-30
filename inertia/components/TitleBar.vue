<script setup lang="ts">
import { Link } from '@inertiajs/vue3'

defineProps<{
  title: string
  breadcrumb?: { label: string; href: string }[]
}>()
</script>
<template>
  <div>
    <ul class="list-none p-0 m-0 flex items-center font-medium mb-4" v-if="breadcrumb">
      <template v-for="(item, index) in breadcrumb" :key="index">
        <li>
          <Link
            class="no-underline leading-normal cursor-pointer text-surface-500 dark:text-surface-300 aria-selected:text-surface-900 dark:aria-selected:text-surface-0"
            :aria-current="index === breadcrumb.length - 1 ? 'page' : undefined"
            :aria-selected="index === breadcrumb.length - 1"
            :href="item.href"
          >
            {{ item.label }}
          </Link>
        </li>
        <li class="px-2" v-if="index < breadcrumb.length - 1">
          <i class="pi pi-angle-right text-surface-500 dark:text-surface-300 leading-normal" />
        </li>
      </template>
    </ul>

    <div class="flex items-start flex-col lg:justify-between lg:flex-row">
      <div>
        <div class="font-medium text-3xl text-surface-900 dark:text-surface-0">
          {{ title }}
        </div>
      </div>
      <div class="mt-4 lg:mt-0 flex gap-4">
        <slot name="cta" />
      </div>
    </div>
  </div>
</template>
