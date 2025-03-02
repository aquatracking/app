<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Link } from '@inertiajs/vue3'

defineProps<{
  title: string
  breadcrumb?: { label: string; href: string }[]
}>()
</script>
<template>
  <div>
    <Breadcrumb v-if="breadcrumb" class="mb-2">
      <BreadcrumbList>
        <template v-for="(item, index) in breadcrumb" :key="index">
          <BreadcrumbItem>
            <BreadcrumbLink :as="Link" :href="item.href"> {{ item.label }} </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator v-if="index < breadcrumb.length - 1" />
        </template>
      </BreadcrumbList>
    </Breadcrumb>

    <div class="flex items-center flex-col lg:justify-between lg:flex-row">
      <div>
        <div class="text-3xl font-bold tracking-tight">
          {{ title }}
        </div>
        <div class="flex items-center text-surface-700 dark:text-surface-100 flex-wrap">
          <slot name="subtitle" />
        </div>
      </div>
      <div class="mt-4 lg:mt-0 flex gap-4">
        <slot name="cta" />
      </div>
    </div>
  </div>
</template>
