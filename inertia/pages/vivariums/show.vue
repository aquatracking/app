<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Pencil } from '@lucide/vue'
import AppLayout from '~/layouts/app.vue'
import type { Data } from '@generated/data'
import { Form, Link } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { useVivarium } from '~/composables/use_vivarium'
import { Alert, AlertDescription } from '~/components/ui/alert'
import VivariumPicture from '~/components/vivariums/vivarium_picture.vue'
import ArchiveVivariumDialog from '~/components/vivariums/archive_vivarium_dialog.vue'

defineOptions({ layout: AppLayout })

/**
 * Dashboard of a vivarium. This feature shows its header; the tiles of
 * the tracked measures come with feature 07.
 */
const props = defineProps<{ vivarium: Data.Vivarium }>()

const { t } = useI18n()
const { profileLabel, ageLabel, volumeLabel } = useVivarium()
</script>

<template>
  <Head :title="props.vivarium.name" />
  <div class="flex flex-col gap-6">
    <Link
      :route="props.vivarium.isArchived ? 'vivariums.archived' : 'vivariums.index'"
      class="text-sm text-muted-foreground hover:underline"
    >
      {{ props.vivarium.isArchived ? t('vivariums.archived_title') : t('vivariums.back_to_list') }}
    </Link>

    <Alert v-if="props.vivarium.isArchived">
      <AlertDescription class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ t('vivariums.archived_banner') }}</span>
        <Form route="vivariums.unarchive" :params="{ id: props.vivarium.id }">
          <Button type="submit" size="sm">{{ t('vivariums.unarchive') }}</Button>
        </Form>
      </AlertDescription>
    </Alert>

    <header class="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div class="overflow-hidden rounded-lg border">
        <VivariumPicture :vivarium="props.vivarium" />
      </div>
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold">{{ props.vivarium.name }}</h1>
        <p class="text-muted-foreground">{{ profileLabel(props.vivarium) }}</p>
        <p class="text-muted-foreground">
          <template v-if="props.vivarium.volumeLiters !== null">
            {{ volumeLabel(props.vivarium.volumeLiters) }} ·
          </template>
          {{ ageLabel(props.vivarium.startedOn) }}
        </p>
        <p v-if="props.vivarium.description" class="whitespace-pre-line">
          {{ props.vivarium.description }}
        </p>
        <div v-if="!props.vivarium.isArchived" class="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" as-child>
            <Link route="vivariums.edit" :params="{ id: props.vivarium.id }"
              ><Pencil />{{ t('vivariums.edit') }}</Link
            >
          </Button>
          <ArchiveVivariumDialog :vivarium="props.vivarium" />
        </div>
      </div>
    </header>
  </div>
</template>
