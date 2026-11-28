<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { browserTimezone } from '~/timezones'
import NameFields from '~/components/users/name_fields.vue'
import PasswordFields from '~/components/users/password_fields.vue'
import PreferenceFields from '~/components/users/preference_fields.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const props = defineProps<{ locales: string[]; timezones: string[] }>()

const { t } = useI18n()

/**
 * The language follows the browser (detected by the server from
 * "Accept-Language"). The time zone is only known by the browser: the
 * server renders "UTC", replaced by the browser's own zone once mounted.
 */
const timezone = ref('UTC')

onMounted(() => {
  timezone.value = browserTimezone(props.timezones) ?? 'UTC'
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
          <NameFields :errors="errors" />

          <Field :data-invalid="!!errors.email">
            <FieldLabel for="email">{{ t('auth.email') }}</FieldLabel>
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

          <PasswordFields :errors="errors" :label="t('auth.password')" />

          <PreferenceFields
            v-model:timezone="timezone"
            :errors="errors"
            :locales="props.locales"
            :timezones="props.timezones"
          />

          <Button type="submit" :disabled="processing">{{ t('setup.submit') }}</Button>
        </FieldGroup>
      </Form>
    </CardContent>
  </Card>
</template>
