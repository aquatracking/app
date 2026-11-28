<script setup lang="ts">
import { computed } from 'vue'
import { ChartLine, Pencil } from '@lucide/vue'
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import type { Data } from '@generated/data'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { useDates } from '~/composables/use_dates'
import { Link, useRouter } from '@adonisjs/inertia/vue'
import { useMeasures } from '~/composables/use_measures'
import { Alert, AlertDescription } from '~/components/ui/alert'
import ReadingForm from '~/components/measures/reading_form.vue'
import { Dialog, DialogContent } from '~/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import DeleteReadingDialog from '~/components/measures/delete_reading_dialog.vue'

defineOptions({ layout: AppLayout })

/**
 * History of a vivarium (docs/features/06-measures.md): its readings from
 * the most recent, 20 per page, filtered by type or not. "Edit" opens the
 * reading form over the history (route "measures.edit_reading"), the only
 * way to correct measures. Read-only on an archived vivarium.
 */
const props = defineProps<{
  vivarium: Data.Vivarium
  readings: { data: Data.Reading[]; metadata: { currentPage: number; lastPage: number } }
  measuredTypes: Data.MeasureType[]
  type: string | null
  editedReading: Data.Reading.Variants['forEdit'] | null
  fields: Data.MeasureTypeDefinition[]
}>()

const { t } = useI18n()
const router = useRouter()
const { formatDateTime } = useDates()
const { typeLabel, formatValue } = useMeasures()

/**
 * Filter and page kept by the edit and delete forms and the pagination.
 */
const qs = computed(() => {
  const page = props.readings.metadata.currentPage
  return { ...(props.type ? { type: props.type } : {}), ...(page > 1 ? { page } : {}) }
})

/**
 * The chart of the filtered type, which has measures (feature 07).
 */
const chartable = computed(() => props.measuredTypes.some(({ code }) => code === props.type))

function filter(event: Event) {
  const type = (event.target as HTMLSelectElement).value
  router.get(
    { route: 'measures.index', routeParams: { id: props.vivarium.id } },
    type ? { type } : {}
  )
}

function closeEdit(open: boolean) {
  if (!open) {
    router.get({ route: 'measures.index', routeParams: { id: props.vivarium.id } }, qs.value, {
      preserveScroll: true,
    })
  }
}
</script>

<template>
  <Head :title="t('measures.title')" />
  <div class="flex max-w-3xl flex-col gap-6">
    <Link
      route="vivariums.show"
      :params="{ id: props.vivarium.id }"
      class="text-sm text-muted-foreground hover:underline"
    >
      {{ t('measures.back', { name: props.vivarium.name }) }}
    </Link>

    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="text-2xl font-semibold">{{ t('measures.title') }}</h1>
      <div class="flex flex-wrap items-end gap-2">
        <Button v-if="props.type && chartable" variant="outline" size="sm" as-child>
          <Link route="charts.show" :params="{ id: props.vivarium.id, code: props.type }"
            ><ChartLine />{{ t('measures.chart') }}</Link
          >
        </Button>
        <label v-if="props.measuredTypes.length > 0" class="flex flex-col gap-1 text-sm">
          <span class="text-muted-foreground">{{ t('measures.filter.label') }}</span>
          <NativeSelect :model-value="props.type ?? ''" @change="filter">
            <NativeSelectOption value="">{{ t('measures.filter.all') }}</NativeSelectOption>
            <NativeSelectOption
              v-for="measureType in props.measuredTypes"
              :key="measureType.code"
              :value="measureType.code"
            >
              {{ typeLabel(measureType) }}
            </NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
    </div>

    <Alert v-if="props.vivarium.isArchived">
      <AlertDescription>{{ t('vivariums.archived_banner') }}</AlertDescription>
    </Alert>

    <p
      v-if="props.readings.data.length === 0"
      class="rounded-lg border border-dashed p-6 text-center"
    >
      {{ props.type ? t('measures.empty_filtered') : t('measures.empty') }}
    </p>

    <ol v-else class="flex flex-col gap-3">
      <li
        v-for="reading in props.readings.data"
        :key="reading.measuredAt"
        class="flex flex-col gap-3 rounded-lg border p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <time :datetime="reading.measuredAt" class="font-medium">{{
            formatDateTime(reading.measuredAt)
          }}</time>
          <div v-if="!props.vivarium.isArchived" class="flex gap-1">
            <Button variant="ghost" size="sm" as-child>
              <Link
                route="measures.edit_reading"
                :params="{ id: props.vivarium.id, measuredAt: reading.measuredAt }"
                :qs="qs"
                preserve-scroll
                ><Pencil />{{ t('measures.reading.edit') }}</Link
              >
            </Button>
            <DeleteReadingDialog
              v-if="!props.type"
              :vivarium="props.vivarium"
              :reading="reading"
              :qs="qs"
            />
          </div>
        </div>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <div v-for="measure in reading.measures" :key="measure.id" class="flex flex-col">
            <dt class="text-sm text-muted-foreground">{{ typeLabel(measure.measureType) }}</dt>
            <dd>
              <Link
                v-if="props.type && !props.vivarium.isArchived"
                route="measures.edit_reading"
                :params="{ id: props.vivarium.id, measuredAt: reading.measuredAt }"
                :qs="qs"
                preserve-scroll
                class="hover:underline"
                >{{ formatValue(measure.value, measure.measureType.decimals) }}</Link
              >
              <template v-else>{{
                formatValue(measure.value, measure.measureType.decimals)
              }}</template>
              <span v-if="measure.measureType.unit" class="text-sm text-muted-foreground"
                >&nbsp;{{ measure.measureType.unit }}</span
              >
            </dd>
          </div>
        </dl>
      </li>
    </ol>

    <nav
      v-if="props.readings.metadata.lastPage > 1"
      class="grid grid-cols-3 items-center gap-2 text-sm"
    >
      <span>
        <Button v-if="props.readings.metadata.currentPage > 1" variant="outline" size="sm" as-child>
          <Link
            route="measures.index"
            :params="{ id: props.vivarium.id }"
            :qs="{ ...qs, page: props.readings.metadata.currentPage - 1 }"
            >{{ t('measures.pagination.previous') }}</Link
          >
        </Button>
      </span>
      <span class="text-center text-muted-foreground">{{
        t('measures.pagination.page', {
          page: props.readings.metadata.currentPage,
          last: props.readings.metadata.lastPage,
        })
      }}</span>
      <span class="text-right">
        <Button
          v-if="props.readings.metadata.currentPage < props.readings.metadata.lastPage"
          variant="outline"
          size="sm"
          as-child
        >
          <Link
            route="measures.index"
            :params="{ id: props.vivarium.id }"
            :qs="{ ...qs, page: props.readings.metadata.currentPage + 1 }"
            >{{ t('measures.pagination.next') }}</Link
          >
        </Button>
      </span>
    </nav>

    <Dialog :open="props.editedReading !== null" @update:open="closeEdit">
      <DialogContent
        :aria-describedby="undefined"
        class="flex h-dvh max-h-dvh max-w-full flex-col rounded-none sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl"
      >
        <ReadingForm
          v-if="props.editedReading"
          :key="props.editedReading.measuredAt"
          :vivarium="props.vivarium"
          :fields="props.fields"
          :reading="props.editedReading"
          :qs="qs"
          @cancel="closeEdit(false)"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
