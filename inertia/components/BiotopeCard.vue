<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { computed, toRefs } from 'vue'
import { BiotopeDto } from '../../app/dto/biotope_dto'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  biotope: BiotopeDto
}>()

const { biotope } = toRefs(props)

const biotopeImage = computed(() => {
  if (biotope.value.type === 'aquarium') {
    return '../../images/illustrations/aquarium.jpg'
  } else if (biotope.value.type === 'terrarium') {
    return '../../images/illustrations/terrarium.jpg'
  }
})

const subtitle = computed(() => {
  const content = []
  if (biotope.value.volume) {
    content.push(`${biotope.value.volume}L`)
  }

  if (biotope.value.type === 'aquarium') {
    if (biotope.value.saltwater) {
      content.push(t('biotopes.aquarium.saltwater'))
    } else {
      content.push(t('biotopes.aquarium.freshwater'))
    }
  }

  return content.join(' - ')
})
</script>
<template>
  <Link :href="'/biotopes/' + biotope.id">
    <Card class="min-w-72 md:max-w-96 overflow-hidden h-full hover:bg-highlight">
      <template #header>
        <div class="flex absolute flex-wrap gap-2 p-2">
          <Tag :value="$t(`biotopes.${biotope.type}.name`)" severity="contrast" rounded />
        </div>

        <img alt="" class="aspect-video object-cover" :src="biotopeImage" />
      </template>
      <template #title>
        {{ biotope.name }}
      </template>
      <template #subtitle v-if="subtitle.length > 0">
        {{ subtitle }}
      </template>
      <template #content>
        <p class="m-0">
          {{ biotope.description }}
        </p>
      </template>
    </Card>
  </Link>
</template>
