<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { useI18n } from '~/composables/use_i18n'
import TimezoneSelect from '~/components/timezone_select.vue'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'

/**
 * Language and time zone of an account, in the forms of setup,
 * registration and profile. The languages and time zones are the lists
 * accepted by the server; the language starts as the current one. The
 * default slot goes under the time zone field.
 */
const props = defineProps<{
  errors: Partial<Record<string, string>>
  locales: string[]
  timezones: string[]
}>()
const timezone = defineModel<string>('timezone', { required: true })

const { t } = useI18n()
const page = usePage()
</script>

<template>
  <Field :data-invalid="!!props.errors.locale">
    <FieldLabel for="locale">{{ t('auth.locale') }}</FieldLabel>
    <NativeSelect
      id="locale"
      name="locale"
      class="w-full"
      :model-value="page.props.locale"
      :aria-invalid="!!props.errors.locale"
    >
      <NativeSelectOption v-for="locale in props.locales" :key="locale" :value="locale">
        {{ t(`app.locales.${locale}`) }}
      </NativeSelectOption>
    </NativeSelect>
    <FieldError :errors="[props.errors.locale]" />
  </Field>

  <Field :data-invalid="!!props.errors.timezone">
    <FieldLabel for="timezone">{{ t('auth.timezone') }}</FieldLabel>
    <TimezoneSelect
      id="timezone"
      v-model="timezone"
      name="timezone"
      :label="t('auth.timezone')"
      :timezones="props.timezones"
      :invalid="!!props.errors.timezone"
    />
    <FieldDescription>{{ t('auth.timezone_hint') }}</FieldDescription>
    <slot />
    <FieldError :errors="[props.errors.timezone]" />
  </Field>
</template>
