<script setup lang="ts">
import { useI18n } from '~/composables/use_i18n'
import { useMeasures } from '~/composables/use_measures'

/**
 * A variation as an arrow and a gap ("▲ 0,3"), without colour: a rise is
 * not good or bad in itself.
 */
const props = defineProps<{ value: number; decimals: number }>()

const { t } = useI18n()
const { formatValue } = useMeasures()
</script>

<template>
  <span v-if="props.value === 0" class="tabular-nums"
    ><span aria-hidden="true">= </span>{{ t('charts.tiles.unchanged') }}</span
  >
  <!-- The arrow is read as a sentence ("Up 0.3"), not as a symbol -->
  <span v-else class="tabular-nums"
    ><span aria-hidden="true"
      >{{ props.value > 0 ? '▲' : '▼' }}
      {{ formatValue(Math.abs(props.value), props.decimals) }}</span
    ><span class="sr-only">{{
      t(props.value > 0 ? 'charts.tiles.increase' : 'charts.tiles.decrease', {
        value: formatValue(Math.abs(props.value), props.decimals),
      })
    }}</span></span
  >
</template>
