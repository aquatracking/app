<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '~/layouts/app.vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import TimezoneInput from '~/components/timezone_input.vue'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const props = defineProps<{ token: string; invitation: { email: string } | null }>()

const { t } = useI18n()
const page = usePage()

/**
 * The language follows the browser (detected by the server from
 * "Accept-Language"). The time zone is only known by the browser: the
 * server renders "UTC", replaced by the browser's own zone once mounted.
 */
const locales = ['en', 'fr'] as const
const timezone = ref('UTC')

onMounted(() => {
  timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
})
</script>

<template>
  <Head :title="t(props.invitation ? 'auth.register.title' : 'auth.register.invalid_title')" />
  <Card v-if="!props.invitation" class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('auth.register.invalid_title') }}</h1></CardTitle
      >
      <CardDescription>{{ t('auth.register.invalid_description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button as-child>
        <Link route="session.create">{{ t('auth.back_to_login') }}</Link>
      </Button>
    </CardContent>
  </Card>

  <Card v-else class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('auth.register.title') }}</h1></CardTitle
      >
      <CardDescription>{{ t('auth.register.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form
        v-slot="{ errors, processing }"
        route="registration.store"
        :params="{ token: props.token }"
      >
        <FieldGroup>
          <Field>
            <FieldLabel for="email">{{ t('auth.email') }}</FieldLabel>
            <!-- Not submitted: the account takes the email of the invitation -->
            <Input id="email" type="email" :model-value="props.invitation.email" disabled />
            <FieldDescription>{{ t('auth.register.email_hint') }}</FieldDescription>
          </Field>

          <Field :data-invalid="!!errors.firstName">
            <FieldLabel for="firstName">{{ t('auth.first_name') }}</FieldLabel>
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
              {{ t('auth.last_name') }}
              <span class="text-muted-foreground font-normal">({{ t('auth.optional') }})</span>
            </FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              autocomplete="family-name"
              :aria-invalid="!!errors.lastName"
            />
            <FieldError :errors="[errors.lastName]" />
          </Field>

          <Field :data-invalid="!!errors.password">
            <FieldLabel for="password">{{ t('auth.password') }}</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              :aria-invalid="!!errors.password"
            />
            <FieldDescription>{{ t('auth.password_hint') }}</FieldDescription>
            <FieldError :errors="[errors.password]" />
          </Field>

          <Field :data-invalid="!!errors.passwordConfirmation">
            <FieldLabel for="passwordConfirmation">
              {{ t('auth.password_confirmation') }}
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
            <FieldLabel for="locale">{{ t('auth.locale') }}</FieldLabel>
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
            <FieldLabel for="timezone">{{ t('auth.timezone') }}</FieldLabel>
            <TimezoneInput
              id="timezone"
              v-model="timezone"
              name="timezone"
              :invalid="!!errors.timezone"
            />
            <FieldDescription>{{ t('auth.timezone_hint') }}</FieldDescription>
            <FieldError :errors="[errors.timezone]" />
          </Field>

          <Button type="submit" :disabled="processing">{{ t('auth.register.submit') }}</Button>
        </FieldGroup>
      </Form>
    </CardContent>
  </Card>
</template>
