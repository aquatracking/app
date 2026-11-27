<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head, usePage } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const { t } = useI18n()
const page = usePage()

/**
 * The language follows the browser (detected by the server from
 * "Accept-Language"). The time zone is only known by the browser: the
 * server renders "UTC", replaced by the browser's own zone once mounted.
 */
const locales = ['en', 'fr'] as const
const timezone = ref('UTC')
const timezones = ref<string[]>([])

onMounted(() => {
  timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  timezones.value = ['UTC', ...Intl.supportedValuesOf('timeZone')]
})
</script>

<template>
  <Head :title="t('setup.title')" />
  <Card class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('setup.title') }}</h1></CardTitle
      >
      <CardDescription>{{ t('setup.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form v-slot="{ errors, processing }" route="setup.store">
        <FieldGroup>
          <Field :data-invalid="!!errors.firstName">
            <FieldLabel for="firstName">{{ t('setup.first_name') }}</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              autocomplete="given-name"
              required
              :aria-invalid="!!errors.firstName"
            />
            <FieldError :errors="[errors.firstName]" />
          </Field>

          <Field :data-invalid="!!errors.lastName">
            <FieldLabel for="lastName">
              {{ t('setup.last_name') }}
              <span class="text-muted-foreground font-normal">({{ t('setup.optional') }})</span>
            </FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              autocomplete="family-name"
              :aria-invalid="!!errors.lastName"
            />
            <FieldError :errors="[errors.lastName]" />
          </Field>

          <Field :data-invalid="!!errors.email">
            <FieldLabel for="email">{{ t('setup.email') }}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              :aria-invalid="!!errors.email"
            />
            <FieldError :errors="[errors.email]" />
          </Field>

          <Field :data-invalid="!!errors.password">
            <FieldLabel for="password">{{ t('setup.password') }}</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              :aria-invalid="!!errors.password"
            />
            <FieldDescription>{{ t('setup.password_hint') }}</FieldDescription>
            <FieldError :errors="[errors.password]" />
          </Field>

          <Field :data-invalid="!!errors.passwordConfirmation">
            <FieldLabel for="passwordConfirmation">
              {{ t('setup.password_confirmation') }}
            </FieldLabel>
            <Input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              autocomplete="new-password"
              required
              :aria-invalid="!!errors.passwordConfirmation"
            />
            <FieldError :errors="[errors.passwordConfirmation]" />
          </Field>

          <Field :data-invalid="!!errors.locale">
            <FieldLabel for="locale">{{ t('setup.locale') }}</FieldLabel>
            <NativeSelect
              id="locale"
              name="locale"
              class="w-full"
              :model-value="page.props.locale"
              :aria-invalid="!!errors.locale"
            >
              <NativeSelectOption v-for="locale in locales" :key="locale" :value="locale">
                {{ t(`app.locales.${locale}`) }}
              </NativeSelectOption>
            </NativeSelect>
            <FieldError :errors="[errors.locale]" />
          </Field>

          <Field :data-invalid="!!errors.timezone">
            <FieldLabel for="timezone">{{ t('setup.timezone') }}</FieldLabel>
            <Input
              id="timezone"
              v-model="timezone"
              name="timezone"
              list="timezones"
              autocomplete="off"
              required
              :aria-invalid="!!errors.timezone"
            />
            <datalist id="timezones">
              <option v-for="name in timezones" :key="name" :value="name" />
            </datalist>
            <FieldDescription>{{ t('setup.timezone_hint') }}</FieldDescription>
            <FieldError :errors="[errors.timezone]" />
          </Field>

          <Button type="submit" :disabled="processing">{{ t('setup.submit') }}</Button>
        </FieldGroup>
      </Form>
    </CardContent>
  </Card>
</template>
