<script lang="ts" setup>
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECBasicOption } from 'echarts/types/dist/shared'
import VChart from 'vue-echarts'
import { MeasureType } from '../../app/constant'
import { MeasureDto } from '../../app/dto/measure_dto'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { get365DaysAgo, getAllDatesBetweenTwoDates } from '~/lib/utils'
import { computed } from 'vue'

use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const props = defineProps<{
  measure: { type: MeasureType; last: MeasureDto; history: MeasureDto[] }
}>()

const dateRange = computed(() => {
  const startDate = get365DaysAgo()
  const endDate = new Date()
  return getAllDatesBetweenTwoDates(startDate, endDate)
})

const minValue = computed(() => {
  const min = Math.min(...props.measure.history.map((m) => m.value))
  return min
})
const maxValue = computed(() => {
  const max = Math.max(...props.measure.history.map((m) => m.value))
  return max
})

const option: ECBasicOption = {
  tooltip: {
    trigger: 'axis',
  },
  grid: {
    left: '1%',
    right: '1%',
    bottom: '20%',
    top: '10%',
    containLabel: true,
  },
  xAxis: {
    data: dateRange.value.map((date) => {
      const dateObj = new Date(date)
      return `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
    }),
  },
  yAxis: {
    type: 'value',
    min: Math.max(Math.floor(minValue.value - 1), 0),
    max: Math.ceil(maxValue.value + 1),
  },
  series: [
    {
      data: dateRange.value.map((d) => {
        const measure = props.measure.history.find((m) => {
          return m.measuredAt.toString().split('T')[0] === d.toISOString().split('T')[0]
        })
        return measure ? measure.value.toFixed(2) : null
      }),
      type: 'line',
      connectNulls: true,
    },
  ],
}
</script>
<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t(`measures.types.${measure.type.code}.name`) }}</CardTitle>
    </CardHeader>
    <CardContent class="h-full w-full">
      <VChart autoresize :option />
    </CardContent>
  </Card>
</template>
