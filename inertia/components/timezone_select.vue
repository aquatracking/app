<script setup lang="ts">
/**
 * Time zone field: a list with search of the time zones accepted by the
 * server (docs/CONTEXT.md), submitted under "name".
 */
import { computed, ref } from 'vue'
import { CheckIcon, ChevronsUpDownIcon } from '@lucide/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport,
} from '~/components/ui/combobox'

const props = defineProps<{
  id: string
  name: string
  timezones: readonly string[]
  invalid?: boolean
}>()
const model = defineModel<string>({ required: true })

const { t } = useI18n()

/**
 * Spaces match the underscores of the names: "new york" finds
 * "America/New_York".
 */
function normalized(text: string) {
  return text.toLowerCase().replaceAll('_', ' ')
}

const search = ref('')
const filtered = computed(() => {
  const query = normalized(search.value.trim())
  return query
    ? props.timezones.filter((timezone) => normalized(timezone).includes(query))
    : props.timezones
})
</script>

<template>
  <Combobox v-model="model" :name="name" ignore-filter required>
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          class="w-full justify-between font-normal"
          :aria-invalid="invalid"
        >
          {{ model }}
          <ChevronsUpDownIcon class="opacity-50" />
        </Button>
      </ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxList>
      <!-- A search field, empty when opened: the chosen zone is on the button -->
      <ComboboxInput
        v-model="search"
        :display-value="() => ''"
        :placeholder="t('app.timezones.search')"
      />
      <ComboboxEmpty>{{ t('app.timezones.empty') }}</ComboboxEmpty>
      <ComboboxViewport>
        <ComboboxItem v-for="timezone in filtered" :key="timezone" :value="timezone">
          {{ timezone }}
          <ComboboxItemIndicator>
            <CheckIcon />
          </ComboboxItemIndicator>
        </ComboboxItem>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
