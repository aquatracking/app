<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { useI18n } from '~/composables/use_i18n'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'

/**
 * First and last name of an account, in the forms of setup, registration
 * and profile. The last name is optional.
 */
const props = defineProps<{
  errors: Partial<Record<string, string>>
  firstName?: string
  lastName?: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <Field :data-invalid="!!props.errors.firstName">
    <FieldLabel for="firstName">{{ t('auth.first_name') }}</FieldLabel>
    <Input
      id="firstName"
      name="firstName"
      autocomplete="given-name"
      required
      :default-value="props.firstName"
      :aria-invalid="!!props.errors.firstName"
    />
    <FieldError :errors="[props.errors.firstName]" />
  </Field>

  <Field :data-invalid="!!props.errors.lastName">
    <FieldLabel for="lastName">
      {{ t('auth.last_name') }}
      <span class="text-muted-foreground font-normal">({{ t('auth.optional') }})</span>
    </FieldLabel>
    <Input
      id="lastName"
      name="lastName"
      autocomplete="family-name"
      :default-value="props.lastName ?? undefined"
      :aria-invalid="!!props.errors.lastName"
    />
    <FieldError :errors="[props.errors.lastName]" />
  </Field>
</template>
