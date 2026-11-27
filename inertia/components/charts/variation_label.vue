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
  <span v-if="props.value === 0" class="tabular-nums">= {{ t('charts.tiles.unchanged') }}</span>
  <span
    v-else
    class="tabular-nums"
    :aria-label="
      t(props.value > 0 ? 'charts.tiles.increase' : 'charts.tiles.decrease', {
        value: formatValue(Math.abs(props.value), props.decimals),
      })
    "
    >{{ props.value > 0 ? '▲' : '▼' }}
    {{ formatValue(Math.abs(props.value), props.decimals) }}</span
  >
</template>
