<script setup lang="ts">
/**
 * Time zone field: free text with the IANA names known by the browser as
 * suggestions. The server checks the name (docs/CONTEXT.md).
 */
import { onMounted, ref } from 'vue'
import { Input } from '~/components/ui/input'

defineProps<{ id: string; name: string; invalid?: boolean }>()
const model = defineModel<string>({ required: true })

/**
 * Filled once mounted: the server does not know the browser's list.
 */
const timezones = ref<string[]>([])

onMounted(() => {
  timezones.value = ['UTC', ...Intl.supportedValuesOf('timeZone')]
})
</script>

<template>
  <Input
    :id="id"
    v-model="model"
    :name="name"
    :list="`${id}-options`"
    autocomplete="off"
    required
    :aria-invalid="invalid"
  />
  <datalist :id="`${id}-options`">
    <option v-for="timezone in timezones" :key="timezone" :value="timezone" />
  </datalist>
</template>
