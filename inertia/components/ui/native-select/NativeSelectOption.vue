<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import { computed } from 'vue'
import { cn } from 'cn'
import { injectNativeSelectValue } from '.'

const props = defineProps<{ value?: AcceptableValue; class?: HTMLAttributes['class'] }>()

/**
 * Selected when its value is the one of the select, so that the server
 * renders the selected option and the client hydrates the same one.
 */
const selectValue = injectNativeSelectValue()
const selected = computed(() => {
  const value = selectValue.value
  return Array.isArray(value) ? value.some((item) => item === props.value) : value === props.value
})
</script>

<template>
  <option
    data-slot="native-select-option"
    :value="props.value"
    :selected="selected"
    :class="cn('bg-[Canvas] text-[CanvasText]', props.class)"
  >
    <slot />
  </option>
</template>
