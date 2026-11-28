<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '~/layouts/app.vue'
import { Head } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { browserTimezone } from '~/timezones'
import type { Data } from '@generated/data'
import NameFields from '~/components/users/name_fields.vue'
import PasswordFields from '~/components/users/password_fields.vue'
import PreferenceFields from '~/components/users/preference_fields.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const props = defineProps<{
  token: string
  invitation: Data.Invitation | null
  locales: string[]
  timezones: string[]
}>()

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

          <NameFields :errors="errors" />

          <PasswordFields :errors="errors" :label="t('auth.password')" />

          <PreferenceFields
            v-model:timezone="timezone"
            :errors="errors"
            :locales="props.locales"
            :timezones="props.timezones"
          />

          <Button type="submit" :disabled="processing">{{ t('auth.register.submit') }}</Button>
        </FieldGroup>
      </Form>
    </CardContent>
  </Card>
</template>
