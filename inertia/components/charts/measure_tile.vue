<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { Card } from '~/components/ui/card'
import { useI18n } from '~/composables/use_i18n'
import { useDates } from '~/composables/use_dates'
import { useMeasures } from '~/composables/use_measures'
import VariationLabel from '~/components/charts/variation_label.vue'

/**
 * A tile of the dashboard (docs/features/07-charts.md): the last value of
 * a tracked measure, its age, its variation and the curve of the last 30
 * days, without any colour judging the value. Opens the chart of the type.
 */
const props = defineProps<{ vivariumId: string; tile: Data.Tile }>()

const { t } = useI18n()
const { formatRelative, formatDateTime } = useDates()
const { typeLabel, formatValue } = useMeasures()

const WIDTH = 100
const HEIGHT = 32

/**
 * The sparkline on a real time axis, as SVG coordinates.
 */
const sparkline = computed(() => {
  const points = props.tile.sparkline.map(({ measuredAt, value }) => ({
    x: new Date(measuredAt).getTime(),
    y: value,
  }))
  if (points.length < 2) {
    return null
  }
  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  return points
    .map(({ x, y }) => {
      const left = ((x - minX) / (maxX - minX || 1)) * WIDTH
      const top = maxY === minY ? HEIGHT / 2 : HEIGHT - ((y - minY) / (maxY - minY)) * HEIGHT
      return `${left.toFixed(1)},${top.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <Card class="gap-0 py-0 transition-shadow hover:shadow-md">
    <Link
      route="charts.show"
      :params="{ id: props.vivariumId, code: props.tile.measureType.code }"
      class="flex h-full flex-col gap-2 p-4"
    >
      <h2 class="text-sm text-muted-foreground">{{ typeLabel(props.tile.measureType) }}</h2>
      <template v-if="props.tile.last">
        <p class="text-2xl font-semibold tabular-nums">
          {{ formatValue(props.tile.last.value, props.tile.measureType.decimals) }}
          <span
            v-if="props.tile.measureType.unit"
            class="text-sm font-normal text-muted-foreground"
          >
            {{ props.tile.measureType.unit }}</span
          >
        </p>
        <p class="flex flex-wrap justify-between gap-x-2 text-sm text-muted-foreground">
          <time
            :datetime="props.tile.last.measuredAt"
            :title="formatDateTime(props.tile.last.measuredAt)"
            >{{ formatRelative(props.tile.last.measuredAt) }}</time
          >
          <VariationLabel
            v-if="props.tile.variation !== null"
            :value="props.tile.variation"
            :decimals="props.tile.measureType.decimals"
          />
        </p>
        <svg
          v-if="sparkline"
          :viewBox="`-2 -2 ${WIDTH + 4} ${HEIGHT + 4}`"
          preserveAspectRatio="none"
          class="mt-auto h-8 w-full text-primary"
          aria-hidden="true"
        >
          <polyline
            :points="sparkline"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </template>
      <p v-else class="text-muted-foreground">{{ t('charts.tiles.no_measure') }}</p>
    </Link>
  </Card>
</template>
