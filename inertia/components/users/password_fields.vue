<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { useI18n } from '~/composables/use_i18n'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'

/**
 * A new password and its confirmation, in the forms of setup,
 * registration, password reset and profile. "label" names the password
 * field ("Password", "New password").
 */
const props = defineProps<{ errors: Partial<Record<string, string>>; label: string }>()

const { t } = useI18n()
</script>

<template>
  <Field :data-invalid="!!props.errors.password">
    <FieldLabel for="password">{{ props.label }}</FieldLabel>
    <Input
      id="password"
      name="password"
      type="password"
      autocomplete="new-password"
      required
      :aria-invalid="!!props.errors.password"
    />
    <FieldDescription>{{ t('auth.password_hint') }}</FieldDescription>
    <FieldError :errors="[props.errors.password]" />
  </Field>

  <Field :data-invalid="!!props.errors.passwordConfirmation">
    <FieldLabel for="passwordConfirmation">
      {{ t('auth.password_confirmation') }}
    </FieldLabel>
    <Input
      id="passwordConfirmation"
      name="passwordConfirmation"
      type="password"
      autocomplete="new-password"
      required
      :aria-invalid="!!props.errors.passwordConfirmation"
    />
    <FieldError :errors="[props.errors.passwordConfirmation]" />
  </Field>
</template>
