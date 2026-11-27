<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import VivariumCard from '~/components/vivariums/vivarium_card.vue'

defineOptions({ layout: AppLayout })

const props = defineProps<{ vivariums: Data.Vivarium[]; hasArchived: boolean }>()

const { t } = useI18n()
</script>

<template>
  <Head :title="t('vivariums.title')" />
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">{{ t('vivariums.title') }}</h1>
      <Button v-if="props.vivariums.length > 0" as-child>
        <Link route="vivariums.create"><Plus />{{ t('vivariums.create') }}</Link>
      </Button>
    </div>

    <div
      v-if="props.vivariums.length === 0"
      class="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center"
    >
      <h2 class="text-lg font-semibold">{{ t('vivariums.empty.title') }}</h2>
      <p class="max-w-md text-muted-foreground">{{ t('vivariums.empty.description') }}</p>
      <Button as-child>
        <Link route="vivariums.create"><Plus />{{ t('vivariums.empty.action') }}</Link>
      </Button>
    </div>

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="vivarium in props.vivariums" :key="vivarium.id">
        <VivariumCard :vivarium="vivarium" />
      </li>
    </ul>

    <p v-if="props.hasArchived">
      <Link route="vivariums.archived" class="text-sm underline underline-offset-4">
        {{ t('vivariums.archived_link') }}
      </Link>
    </p>
  </div>
</template>
