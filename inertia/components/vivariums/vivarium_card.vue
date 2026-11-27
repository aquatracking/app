<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { Card } from '~/components/ui/card'
import { useVivarium } from '~/composables/use_vivarium'
import VivariumPicture from '~/components/vivariums/vivarium_picture.vue'

const props = defineProps<{ vivarium: Data.Vivarium }>()

const { profileLabel, ageLabel, volumeLabel } = useVivarium()
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
    <Link route="vivariums.show" :params="{ id: props.vivarium.id }" class="flex flex-col">
      <VivariumPicture :vivarium="props.vivarium" />
      <div class="flex flex-col gap-1 p-4">
        <h2 class="font-semibold">{{ props.vivarium.name }}</h2>
        <p class="text-sm text-muted-foreground">{{ profileLabel(props.vivarium) }}</p>
        <p class="text-sm text-muted-foreground">
          <template v-if="props.vivarium.volumeLiters !== null">
            {{ volumeLabel(props.vivarium.volumeLiters) }} ·
          </template>
          {{ ageLabel(props.vivarium.startedOn) }}
        </p>
      </div>
    </Link>
  </Card>
</template>
