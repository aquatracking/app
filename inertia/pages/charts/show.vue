<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import type { Data } from '@generated/data'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { useDates } from '~/composables/use_dates'
import { Link, useRouter } from '@adonisjs/inertia/vue'
import { useMeasures } from '~/composables/use_measures'
import { Alert, AlertDescription } from '~/components/ui/alert'
import VariationLabel from '~/components/charts/variation_label.vue'
import NewReadingDialog from '~/components/measures/new_reading_dialog.vue'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { CurveType } from '@unovis/ts'
import { VisArea, VisAxis, VisLine, VisScatter, VisXYContainer } from '@unovis/vue'
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  type ChartConfig,
} from '~/components/ui/chart'

defineOptions({ layout: AppLayout })

/**
 * Chart of a measure type of a vivarium (docs/features/07-charts.md):
 * its values over a range on a real time axis, in the time zone of the
 * user, the min–max band of the intervals when the series is aggregated,
 * and the statistics of the range. Also for a type no longer tracked.
 */
const props = defineProps<{
  vivarium: Data.Vivarium
  measureType: Data.MeasureType.Variants['withDecimals']
  trackedTypes: Data.MeasureType[]
  ranges: string[]
  series: Data.MeasureSeries
  readingFields: Data.MeasureTypeDefinition[]
}>()

const { t } = useI18n()
const page = usePage()
const router = useRouter()
const { formatDateTime } = useDates()
const { typeLabel, formatValue } = useMeasures()

/**
 * Points shown with a marker below this number.
 */
const MAX_MARKED_POINTS = 100

const isTracked = computed(() =>
  props.trackedTypes.some(({ code }) => code === props.measureType.code)
)
const navigation = computed(() =>
  isTracked.value ? props.trackedTypes : [...props.trackedTypes, props.measureType]
)

interface Row {
  x: number
  value: number
  min?: number
  max?: number
  end?: number
  count?: number
}

const aggregated = computed(() => props.series.bins.length > 0)
const rows = computed<Row[]>(() =>
  aggregated.value
    ? props.series.bins.map((bin) => ({
        x: new Date(bin.start).getTime(),
        value: bin.average,
        min: bin.min,
        max: bin.max,
        end: new Date(bin.end).getTime(),
        count: bin.count,
      }))
    : props.series.points.map((point) => ({
        x: new Date(point.measuredAt).getTime(),
        value: point.value,
      }))
)
const xDomain = computed<[number, number]>(() => [
  new Date(props.series.start).getTime(),
  new Date(props.series.end).getTime(),
])

const chartConfig = computed<ChartConfig>(() => ({
  value: { label: typeLabel(props.measureType), color: 'var(--primary)' },
}))

/**
 * Unovis draws in the browser only: the chart is rendered once mounted,
 * so that SSR and hydration match.
 */
const mounted = ref(false)
onMounted(() => (mounted.value = true))

const x = (row: Row) => row.x
const y = (row: Row) => row.value

function value(number: number) {
  const unit = props.measureType.unit ? ` ${props.measureType.unit}` : ''
  return `${formatValue(number, props.measureType.decimals)}${unit}`
}

/**
 * Up to this span, the time axis shows days rather than months.
 */
const MAX_DAYS_SPAN = 62 * 24 * 3600 * 1000

/**
 * Labels of the time axis, in the time zone of the user: days on short
 * spans, months beyond.
 */
function formatTick(tick: number | Date) {
  const short = xDomain.value[1] - xDomain.value[0] <= MAX_DAYS_SPAN
  return new Intl.DateTimeFormat(page.props.locale, {
    timeZone: page.props.timezone,
    ...(short ? { day: 'numeric', month: 'short' } : { month: 'short', year: 'numeric' }),
  }).format(tick)
}

function escape(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

/**
 * The interval of an aggregated point: its day(s), or its start and end.
 */
function intervalLabel(row: Row) {
  const days = props.series.interval?.unit === 'day'
  return new Intl.DateTimeFormat(page.props.locale, {
    dateStyle: 'medium',
    ...(days ? {} : { timeStyle: 'short' }),
    timeZone: page.props.timezone,
  }).formatRange(row.x, days ? row.end! - 1 : row.end!)
}

function tooltip(row: Row) {
  const lines = aggregated.value
    ? [
        `<div class="font-medium">${escape(intervalLabel(row))}</div>`,
        `<div class="font-mono font-medium tabular-nums">${escape(t('charts.tooltip.average', { value: value(row.value) }))}</div>`,
        `<div class="text-muted-foreground">${escape(t('charts.tooltip.range', { min: formatValue(row.min!, props.measureType.decimals), max: value(row.max!) }))}</div>`,
        `<div class="text-muted-foreground">${escape(t('charts.tooltip.count', { count: row.count }))}</div>`,
      ]
    : [
        `<div class="font-medium">${escape(formatDateTime(new Date(row.x).toISOString()))}</div>`,
        `<div class="font-mono font-medium tabular-nums">${escape(value(row.value))}</div>`,
      ]
  return `<div class="grid min-w-32 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">${lines.join('')}</div>`
}

function changeType(event: Event) {
  const code = (event.target as HTMLSelectElement).value
  router.get(
    { route: 'charts.show', routeParams: { id: props.vivarium.id, code } },
    { range: props.series.range }
  )
}
</script>

<template>
  <Head :title="typeLabel(props.measureType)" />
  <div class="flex flex-col gap-6">
    <Link
      route="vivariums.show"
      :params="{ id: props.vivarium.id }"
      class="text-sm text-muted-foreground hover:underline"
    >
      {{ t('charts.back', { name: props.vivarium.name }) }}
    </Link>

    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="text-2xl font-semibold">{{ typeLabel(props.measureType) }}</h1>
      <div class="flex flex-wrap items-end gap-2">
        <label v-if="navigation.length > 1" class="flex flex-col gap-1 text-sm">
          <span class="text-muted-foreground">{{ t('charts.parameter') }}</span>
          <NativeSelect :model-value="props.measureType.code" @change="changeType">
            <NativeSelectOption
              v-for="navigationType in navigation"
              :key="navigationType.code"
              :value="navigationType.code"
            >
              {{ typeLabel(navigationType) }}
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <NewReadingDialog
          v-if="!props.vivarium.isArchived"
          :vivarium="props.vivarium"
          :fields="props.readingFields"
        />
      </div>
    </div>

    <Alert v-if="!isTracked">
      <AlertDescription>{{ t('charts.no_longer_tracked') }}</AlertDescription>
    </Alert>

    <nav :aria-label="t('charts.ranges.label')" class="flex flex-wrap gap-1">
      <Button
        v-for="range in props.ranges"
        :key="range"
        :variant="range === props.series.range ? 'default' : 'outline'"
        size="sm"
        as-child
      >
        <Link
          route="charts.show"
          :params="{ id: props.vivarium.id, code: props.measureType.code }"
          :qs="{ range }"
          preserve-scroll
          >{{ t(`charts.ranges.${range}`) }}</Link
        >
      </Button>
    </nav>

    <div
      v-if="props.series.stats === null"
      class="flex flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center"
    >
      <p>{{ t('charts.empty') }}</p>
      <p v-if="!props.vivarium.isArchived" class="text-sm text-muted-foreground">
        {{ t('charts.empty_hint') }}
      </p>
    </div>

    <template v-else>
      <section class="flex flex-col gap-2">
        <ChartContainer :config="chartConfig" class="aspect-auto h-72 w-full" cursor>
          <VisXYContainer
            v-if="mounted"
            :data="rows"
            :x-domain="xDomain"
            :margin="{ top: 8, right: 8, bottom: 0, left: 0 }"
          >
            <VisArea
              v-if="aggregated"
              :x="x"
              :y="(row: Row) => row.max! - row.min!"
              :baseline="(row: Row) => row.min!"
              :curve-type="CurveType.Linear"
              color="var(--color-value)"
              :opacity="0.3"
            />
            <VisLine :x="x" :y="y" :curve-type="CurveType.Linear" color="var(--color-value)" />
            <VisScatter
              v-if="rows.length < MAX_MARKED_POINTS"
              :x="x"
              :y="y"
              :size="6"
              color="var(--color-value)"
            />
            <VisAxis type="x" :tick-format="formatTick" :num-ticks="5" :grid-line="false" />
            <VisAxis
              type="y"
              :tick-format="(tick: number) => formatValue(tick, props.measureType.decimals)"
              :num-ticks="4"
            />
            <ChartTooltip />
            <ChartCrosshair :template="tooltip" color="var(--color-value)" />
          </VisXYContainer>
        </ChartContainer>
        <p v-if="aggregated && props.series.interval" class="text-sm text-muted-foreground">
          {{
            t('charts.aggregated', {
              count: props.series.stats.count,
              unit: props.series.interval.unit,
              size: props.series.interval.size,
            })
          }}
        </p>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="font-semibold">{{ t('charts.stats.title') }}</h2>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div class="flex flex-col">
            <dt class="text-sm text-muted-foreground">{{ t('charts.stats.last') }}</dt>
            <dd class="tabular-nums">
              {{ value(props.series.stats.last.value) }}
              <span class="block text-sm text-muted-foreground">{{
                formatDateTime(props.series.stats.last.measuredAt)
              }}</span>
            </dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-muted-foreground">{{ t('charts.stats.min') }}</dt>
            <dd class="tabular-nums">{{ value(props.series.stats.min) }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-muted-foreground">{{ t('charts.stats.max') }}</dt>
            <dd class="tabular-nums">{{ value(props.series.stats.max) }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-muted-foreground">{{ t('charts.stats.average') }}</dt>
            <dd class="tabular-nums">{{ value(props.series.stats.average) }}</dd>
          </div>
          <div class="flex flex-col">
            <dt class="text-sm text-muted-foreground">{{ t('charts.stats.count') }}</dt>
            <dd class="tabular-nums">{{ props.series.stats.count }}</dd>
          </div>
          <div v-if="props.series.stats.largestVariation" class="flex flex-col">
            <dt class="text-sm text-muted-foreground">
              {{ t('charts.stats.largest_variation') }}
            </dt>
            <dd>
              <VariationLabel
                :value="props.series.stats.largestVariation.delta"
                :decimals="props.measureType.decimals"
              />
              <span class="block text-sm text-muted-foreground">{{
                t('charts.stats.variation_dates', {
                  from: formatDateTime(props.series.stats.largestVariation.from.measuredAt),
                  to: formatDateTime(props.series.stats.largestVariation.to.measuredAt),
                })
              }}</span>
            </dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>
