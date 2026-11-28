<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import type { Data } from '@generated/data'
import { useI18n } from '~/composables/use_i18n'
import VivariumForm from '~/components/vivariums/vivarium_form.vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

defineOptions({ layout: AppLayout })

const props = defineProps<{
  today: string
  kinds: Data.VivariumKind[]
  waterTypes: NonNullable<Data.Vivarium['waterType']>[]
  climates: NonNullable<Data.Vivarium['climate']>[]
}>()

const { t } = useI18n()
</script>

<template>
  <Head :title="t('vivariums.form.create_title')" />
  <Card class="mx-auto max-w-xl">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('vivariums.form.create_title') }}</h1></CardTitle
      >
    </CardHeader>
    <CardContent>
      <VivariumForm
        :today="props.today"
        :kinds="props.kinds"
        :water-types="props.waterTypes"
        :climates="props.climates"
      />
    </CardContent>
  </Card>
</template>
