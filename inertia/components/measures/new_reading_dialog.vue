<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@lucide/vue'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import ReadingForm from '~/components/measures/reading_form.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

/**
 * "New reading" of the dashboard: a button in the header, floating at
 * the bottom of the screen on mobile, that opens the reading form, full
 * screen on mobile. Without tracked measures, the window invites to add
 * some instead (docs/features/06-measures.md).
 */
const props = defineProps<{
  vivarium: Pick<Data.Vivarium, 'id'>
  fields: Data.MeasureTypeDefinition[]
}>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button
        class="fixed right-4 bottom-4 z-40 h-12 rounded-full px-5 shadow-lg sm:static sm:h-8 sm:rounded-lg sm:px-2.5 sm:shadow-none"
      >
        <Plus />{{ t('measures.reading.new') }}
      </Button>
    </DialogTrigger>
    <DialogContent
      :aria-describedby="undefined"
      class="flex h-dvh max-h-dvh max-w-full flex-col rounded-none sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl"
    >
      <template v-if="props.fields.length > 0">
        <ReadingForm
          v-if="open"
          :vivarium="props.vivarium"
          :fields="props.fields"
          @success="open = false"
          @cancel="open = false"
        />
      </template>
      <template v-else>
        <DialogHeader>
          <DialogTitle>{{ t('measures.reading.new') }}</DialogTitle>
          <DialogDescription>{{ t('measures.reading.no_tracked_measures') }}</DialogDescription>
        </DialogHeader>
        <Button as-child>
          <Link route="tracked_measures.index" :params="{ id: props.vivarium.id }">{{
            t('measures.reading.add_tracked_measures')
          }}</Link>
        </Button>
      </template>
    </DialogContent>
  </Dialog>
</template>
