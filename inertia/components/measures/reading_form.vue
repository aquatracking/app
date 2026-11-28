<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { useMeasures } from '~/composables/use_measures'
import { DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

/**
 * The reading form (docs/features/06-measures.md), new or edited: a date
 * and time in the time zone of the user, then one field per type. Empty
 * fields are ignored; on edit, emptying a field deletes its measure.
 * Bounds and decimals are checked again by the server.
 */
const props = defineProps<{
  vivarium: Pick<Data.Vivarium, 'id'>
  fields: Data.MeasureTypeDefinition[]
  reading?: Data.Reading.Variants['forEdit']
  /**
   * Filter and page of the history to go back to after an edit.
   */
  qs?: Record<string, string | number>
}>()

const emit = defineEmits<{ success: []; cancel: [] }>()

const { t } = useI18n()
const { typeLabel, inputValue, localNow } = useMeasures()

const measuredAt = ref(props.reading?.localMeasuredAt ?? localNow())

/**
 * Current values of the edited reading, as text in the language of the
 * user.
 */
function initialValue(field: Data.MeasureTypeDefinition) {
  const measure = props.reading?.measures.find(({ measureType }) => measureType.code === field.code)
  return measure ? inputValue(measure.value, field.decimals) : ''
}

function hint(field: Data.MeasureTypeDefinition) {
  return [
    field.unit,
    `${inputValue(field.min, field.decimals)} – ${inputValue(field.max, field.decimals)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
</script>

<template>
  <Form
    v-slot="{ errors, processing }"
    :route="props.reading ? 'measures.update_reading' : 'measures.store_reading'"
    :params="
      props.reading
        ? { id: props.vivarium.id, measuredAt: props.reading.measuredAt }
        : { id: props.vivarium.id }
    "
    :qs="props.qs"
    :options="{ preserveScroll: true }"
    class="flex min-h-0 flex-1 flex-col gap-4"
    @success="emit('success')"
  >
    <DialogHeader>
      <DialogTitle>{{
        props.reading ? t('measures.reading.edit_title') : t('measures.reading.new')
      }}</DialogTitle>
    </DialogHeader>

    <FieldGroup class="min-h-0 flex-1 overflow-y-auto px-1">
      <Field :data-invalid="!!errors.measuredAt">
        <FieldLabel for="reading-measured-at">{{ t('measures.reading.measured_at') }}</FieldLabel>
        <Input
          id="reading-measured-at"
          v-model="measuredAt"
          name="measuredAt"
          type="datetime-local"
          required
          :aria-invalid="!!errors.measuredAt"
        />
        <FieldError :errors="[errors.measuredAt]" />
      </Field>

      <p v-if="errors.values" class="text-sm text-destructive" role="alert">{{ errors.values }}</p>

      <div class="grid grid-cols-2 gap-4">
        <Field
          v-for="field in props.fields"
          :key="field.code"
          :data-invalid="!!errors[`values.${field.code}`]"
        >
          <FieldLabel :for="`reading-${field.code}`">{{ typeLabel(field) }}</FieldLabel>
          <Input
            :id="`reading-${field.code}`"
            :name="`values[${field.code}]`"
            :default-value="initialValue(field)"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :aria-invalid="!!errors[`values.${field.code}`]"
          />
          <FieldDescription>{{ hint(field) }}</FieldDescription>
          <FieldError :errors="[errors[`values.${field.code}`]]" />
        </Field>
      </div>

      <p v-if="props.reading" class="text-sm text-muted-foreground">
        {{ t('measures.reading.edit_hint') }}
      </p>
    </FieldGroup>

    <DialogFooter>
      <Button type="button" variant="outline" @click="emit('cancel')">
        {{ t('measures.reading.cancel') }}
      </Button>
      <Button type="submit" :disabled="processing">{{ t('measures.reading.submit') }}</Button>
    </DialogFooter>
  </Form>
</template>
