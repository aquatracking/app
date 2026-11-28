<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { useI18n } from '~/composables/use_i18n'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { hasClimate, hasWaterType, type VivariumKind } from '~/composables/use_vivarium'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '~/components/ui/field'

/**
 * Creation (no vivarium) or update form of a vivarium. Only the fields of
 * the chosen kind are shown; the kind is chosen on creation only. The
 * kinds, water types and climates are those of the server
 * (app/models/vivarium.ts).
 */
const props = defineProps<{
  vivarium?: Data.Vivarium
  today: string
  kinds?: readonly VivariumKind[]
  waterTypes: readonly NonNullable<Data.Vivarium['waterType']>[]
  climates: readonly NonNullable<Data.Vivarium['climate']>[]
}>()

const { t } = useI18n()

const kind = ref<VivariumKind>(props.vivarium?.kind ?? 'aquarium')

/**
 * Water types and climates are lowercase in the translations, to fit in
 * the profile of a vivarium ("Aquarium · eau de mer"); as options of a
 * list, they start with a capital letter, like the other lists.
 */
function optionLabel(key: string) {
  const label = t(key)
  return label.charAt(0).toLocaleUpperCase() + label.slice(1)
}

function asText(value: number | null | undefined) {
  return value === null || value === undefined ? '' : String(value)
}

const lengthCm = ref(asText(props.vivarium?.lengthCm))
const widthCm = ref(asText(props.vivarium?.widthCm))
const heightCm = ref(asText(props.vivarium?.heightCm))
const volumeLiters = ref(asText(props.vivarium?.volumeLiters))

/**
 * Gross volume "L × W × H / 1000", offered while the volume is empty and
 * the three dimensions are filled, rounded to the liter's tenth. Not
 * offered above the largest volume the server accepts (999,999.9 L).
 */
const suggestedVolume = computed(() => {
  const dimensions = [lengthCm.value, widthCm.value, heightCm.value].map(Number)
  if (volumeLiters.value !== '' || dimensions.some((value) => !(value > 0))) {
    return null
  }
  const volume = Math.round((dimensions[0] * dimensions[1] * dimensions[2]) / 100) / 10
  return volume <= 999999.9 ? volume : null
})
</script>

<template>
  <Form
    v-slot="{ errors, processing }"
    :route="props.vivarium ? 'vivariums.update' : 'vivariums.store'"
    :params="props.vivarium ? { id: props.vivarium.id } : undefined"
  >
    <FieldGroup>
      <Field v-if="!props.vivarium" :data-invalid="!!errors.kind">
        <FieldLabel for="kind">{{ t('vivariums.form.kind') }}</FieldLabel>
        <NativeSelect
          id="kind"
          v-model="kind"
          name="kind"
          class="w-full"
          :aria-invalid="!!errors.kind"
        >
          <NativeSelectOption v-for="value in props.kinds" :key="value" :value="value">
            {{ t(`vivariums.kinds.${value}`) }}
          </NativeSelectOption>
        </NativeSelect>
        <FieldDescription>{{ t('vivariums.form.kind_hint') }}</FieldDescription>
        <FieldError :errors="[errors.kind]" />
      </Field>

      <Field :data-invalid="!!errors.name">
        <FieldLabel for="name">{{ t('vivariums.form.name') }}</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          maxlength="100"
          :default-value="props.vivarium?.name"
          :aria-invalid="!!errors.name"
        />
        <FieldError :errors="[errors.name]" />
      </Field>

      <Field v-if="hasWaterType(kind)" :data-invalid="!!errors.waterType">
        <FieldLabel for="waterType">{{ t('vivariums.form.water_type') }}</FieldLabel>
        <NativeSelect
          id="waterType"
          name="waterType"
          class="w-full"
          required
          :model-value="props.vivarium?.waterType ?? ''"
          :aria-invalid="!!errors.waterType"
        >
          <NativeSelectOption value="" disabled>{{
            t('vivariums.form.choose')
          }}</NativeSelectOption>
          <NativeSelectOption v-for="value in props.waterTypes" :key="value" :value="value">
            {{ optionLabel(`vivariums.water_types.${value}`) }}
          </NativeSelectOption>
        </NativeSelect>
        <FieldError :errors="[errors.waterType]" />
      </Field>

      <Field v-if="hasClimate(kind)" :data-invalid="!!errors.climate">
        <FieldLabel for="climate">{{ t('vivariums.form.climate') }}</FieldLabel>
        <NativeSelect
          id="climate"
          name="climate"
          class="w-full"
          required
          :model-value="props.vivarium?.climate ?? ''"
          :aria-invalid="!!errors.climate"
        >
          <NativeSelectOption value="" disabled>{{
            t('vivariums.form.choose')
          }}</NativeSelectOption>
          <NativeSelectOption v-for="value in props.climates" :key="value" :value="value">
            {{ optionLabel(`vivariums.climates.${value}`) }}
          </NativeSelectOption>
        </NativeSelect>
        <FieldError :errors="[errors.climate]" />
      </Field>

      <Field :data-invalid="!!errors.description">
        <FieldLabel for="description">{{ t('vivariums.form.description') }}</FieldLabel>
        <Textarea
          id="description"
          name="description"
          maxlength="2000"
          :default-value="props.vivarium?.description ?? ''"
          :aria-invalid="!!errors.description"
        />
        <FieldError :errors="[errors.description]" />
      </Field>

      <FieldSet>
        <FieldLegend variant="label">{{ t('vivariums.form.dimensions') }}</FieldLegend>
        <div class="grid grid-cols-3 gap-3">
          <Field :data-invalid="!!errors.lengthCm">
            <FieldLabel for="lengthCm">{{ t('vivariums.form.length') }}</FieldLabel>
            <Input
              id="lengthCm"
              v-model="lengthCm"
              name="lengthCm"
              type="number"
              inputmode="numeric"
              min="1"
              max="1000"
              step="1"
              :aria-invalid="!!errors.lengthCm"
            />
            <FieldError :errors="[errors.lengthCm]" />
          </Field>
          <Field :data-invalid="!!errors.widthCm">
            <FieldLabel for="widthCm">{{ t('vivariums.form.width') }}</FieldLabel>
            <Input
              id="widthCm"
              v-model="widthCm"
              name="widthCm"
              type="number"
              inputmode="numeric"
              min="1"
              max="1000"
              step="1"
              :aria-invalid="!!errors.widthCm"
            />
            <FieldError :errors="[errors.widthCm]" />
          </Field>
          <Field :data-invalid="!!errors.heightCm">
            <FieldLabel for="heightCm">{{ t('vivariums.form.height') }}</FieldLabel>
            <Input
              id="heightCm"
              v-model="heightCm"
              name="heightCm"
              type="number"
              inputmode="numeric"
              min="1"
              max="1000"
              step="1"
              :aria-invalid="!!errors.heightCm"
            />
            <FieldError :errors="[errors.heightCm]" />
          </Field>
        </div>
      </FieldSet>

      <Field :data-invalid="!!errors.volumeLiters">
        <FieldLabel for="volumeLiters">{{ t('vivariums.form.volume') }}</FieldLabel>
        <Input
          id="volumeLiters"
          v-model="volumeLiters"
          name="volumeLiters"
          type="number"
          inputmode="decimal"
          min="0.1"
          step="0.1"
          :aria-invalid="!!errors.volumeLiters"
        />
        <div v-if="suggestedVolume !== null" class="flex flex-wrap items-center gap-2 text-sm">
          <span>{{ t('vivariums.form.volume_suggestion', { volume: suggestedVolume }) }}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="volumeLiters = String(suggestedVolume)"
          >
            {{ t('vivariums.form.use_volume') }}
          </Button>
        </div>
        <FieldError :errors="[errors.volumeLiters]" />
      </Field>

      <Field :data-invalid="!!errors.startedOn">
        <FieldLabel for="startedOn">{{ t('vivariums.form.started_on') }}</FieldLabel>
        <Input
          id="startedOn"
          name="startedOn"
          type="date"
          required
          :max="props.today"
          :default-value="props.vivarium?.startedOn ?? props.today"
          :aria-invalid="!!errors.startedOn"
        />
        <FieldDescription>{{ t('vivariums.form.started_on_hint') }}</FieldDescription>
        <FieldError :errors="[errors.startedOn]" />
      </Field>

      <div class="flex flex-wrap gap-2">
        <Button type="submit" :disabled="processing">
          {{ props.vivarium ? t('vivariums.form.submit_edit') : t('vivariums.form.submit_create') }}
        </Button>
        <Button variant="ghost" as-child>
          <Link v-if="props.vivarium" route="vivariums.show" :params="{ id: props.vivarium.id }">{{
            t('vivariums.form.cancel')
          }}</Link>
          <Link v-else route="vivariums.index">{{ t('vivariums.form.cancel') }}</Link>
        </Button>
      </div>
    </FieldGroup>
  </Form>
</template>
