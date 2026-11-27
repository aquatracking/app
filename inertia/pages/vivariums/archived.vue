<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useI18n } from '~/composables/use_i18n'
import VivariumCard from '~/components/vivariums/vivarium_card.vue'

defineOptions({ layout: AppLayout })

const props = defineProps<{ vivariums: Data.Vivarium.Variants['forCard'][] }>()

const { t } = useI18n()
</script>

<template>
  <Head :title="t('vivariums.archived_title')" />
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <Link route="vivariums.index" class="text-sm text-muted-foreground hover:underline">
        {{ t('vivariums.back_to_list') }}
      </Link>
      <h1 class="text-2xl font-semibold">{{ t('vivariums.archived_title') }}</h1>
    </div>

    <p v-if="props.vivariums.length === 0" class="text-muted-foreground">
      {{ t('vivariums.archived_empty') }}
    </p>
    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="vivarium in props.vivariums" :key="vivarium.id">
        <VivariumCard :vivarium="vivarium" />
      </li>
    </ul>
  </div>
</template>
