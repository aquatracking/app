<script setup lang="ts">
import { computed } from 'vue'
import { Fish, Leaf, Sprout } from '@lucide/vue'
import type { Data } from '@generated/data'
import { useI18n } from '~/composables/use_i18n'

/**
 * The photo of a vivarium, or an illustration of its kind when it has
 * none.
 */
const props = defineProps<{ vivarium: Pick<Data.Vivarium, 'kind' | 'name' | 'imageUrl'> }>()

const { t } = useI18n()

const illustration = computed(
  () =>
    ({
      aquarium: { icon: Fish, class: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
      terrarium: {
        icon: Sprout,
        class: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      },
      paludarium: {
        icon: Leaf,
        class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      },
    })[props.vivarium.kind]
)
</script>

<template>
  <img
    v-if="props.vivarium.imageUrl"
    :src="props.vivarium.imageUrl"
    :alt="t('vivariums.image.alt', { name: props.vivarium.name })"
    class="aspect-video w-full object-cover"
  />
  <div
    v-else
    class="flex aspect-video w-full items-center justify-center"
    :class="illustration.class"
    aria-hidden="true"
  >
    <component :is="illustration.icon" class="size-12" />
  </div>
</template>
