<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { toRefs } from 'vue'
import { useBiotopeDetails } from '~/composables/use_biotope_details'
import { BiotopeDto } from '../../app/dto/biotope_dto'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const { biotope } = toRefs(props)

const { subtitleItems, thumbnailUrl } = useBiotopeDetails(biotope)
</script>
<template>
  <Link :href="'/biotopes/' + biotope.id">
    <Card class="min-w-72 md:max-w-96 overflow-hidden h-full hover:bg-highlight">
      <template #header>
        <div class="flex absolute flex-wrap gap-2 p-2">
          <Tag :value="$t(`biotopes.${biotope.type}.name`)" severity="contrast" rounded />
        </div>

        <img alt="" class="aspect-video object-cover" :src="thumbnailUrl" />
      </template>
      <template #title>
        {{ biotope.name }}
      </template>
      <template #subtitle v-if="subtitleItems.length > 0">
        {{ subtitleItems.map((item) => item.text).join(' - ') }}
      </template>
      <template #content>
        <p class="m-0">
          {{ biotope.description }}
        </p>
      </template>
    </Card>
  </Link>
</template>
