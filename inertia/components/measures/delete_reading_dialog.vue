<script setup lang="ts">
import { ref } from 'vue'
import type { Data } from '@generated/data'
import { Trash2 } from '@lucide/vue'
import { Form } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { useDates } from '~/composables/use_dates'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

/**
 * Deletion of a whole reading, confirmed with its number of measures.
 */
const props = defineProps<{
  vivarium: Pick<Data.Vivarium, 'id'>
  reading: Pick<Data.Reading, 'measuredAt' | 'measures'>
  qs?: Record<string, string | number>
}>()

const { t } = useI18n()
const { formatDateTime } = useDates()
const open = ref(false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="ghost" size="sm"><Trash2 />{{ t('measures.reading.delete') }}</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-lg">
      <Form
        v-slot="{ processing }"
        route="measures.destroy_reading"
        :params="{ id: props.vivarium.id, measuredAt: props.reading.measuredAt }"
        :qs="props.qs"
        :options="{ preserveScroll: true }"
        @success="open = false"
      >
        <DialogHeader>
          <DialogTitle>{{
            t('measures.reading.delete_title', { date: formatDateTime(props.reading.measuredAt) })
          }}</DialogTitle>
          <DialogDescription>{{
            t('measures.reading.delete_description', { count: props.reading.measures.length })
          }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button type="button" variant="outline" @click="open = false">
            {{ t('measures.reading.cancel') }}
          </Button>
          <Button type="submit" variant="destructive" :disabled="processing">
            {{ t('measures.reading.delete_submit') }}
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  </Dialog>
</template>
