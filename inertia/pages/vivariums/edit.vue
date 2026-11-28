<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import type { Data } from '@generated/data'
import { useI18n } from '~/composables/use_i18n'
import VivariumForm from '~/components/vivariums/vivarium_form.vue'
import VivariumImageForm from '~/components/vivariums/vivarium_image_form.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useVivarium } from '~/composables/use_vivarium'

defineOptions({ layout: AppLayout })

const props = defineProps<{
  vivarium: Data.Vivarium
  today: string
  kinds: Data.VivariumKind[]
  waterTypes: NonNullable<Data.Vivarium['waterType']>[]
  climates: NonNullable<Data.Vivarium['climate']>[]
}>()

const { t } = useI18n()
const { profileLabel } = useVivarium()
const title = t('vivariums.form.edit_title', { name: props.vivarium.name })
</script>

<template>
  <Head :title="title" />
  <div class="mx-auto flex max-w-xl flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle
          ><h1>{{ title }}</h1></CardTitle
        >
        <CardDescription>{{ profileLabel(props.vivarium) }}</CardDescription>
      </CardHeader>
      <CardContent>
        <VivariumForm
          :vivarium="props.vivarium"
          :today="props.today"
          :kinds="props.kinds"
          :water-types="props.waterTypes"
          :climates="props.climates"
        />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle
          ><h2>{{ t('vivariums.image.title') }}</h2></CardTitle
        >
      </CardHeader>
      <CardContent>
        <VivariumImageForm :vivarium="props.vivarium" />
      </CardContent>
    </Card>
  </div>
</template>
