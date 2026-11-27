<script setup lang="ts">
import AppLayout from '~/layouts/app.vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const { t } = useI18n()
const page = usePage()
</script>

<template>
  <Head :title="t('auth.forgot_password.title')" />
  <Card class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('auth.forgot_password.title') }}</h1></CardTitle
      >
      <CardDescription v-if="page.props.mailEnabled">
        {{ t('auth.forgot_password.description') }}
      </CardDescription>
      <CardDescription v-else>{{ t('auth.forgot_password.no_mail') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form
        v-if="page.props.mailEnabled"
        v-slot="{ errors, processing }"
        route="password_reset.store"
        reset-on-success
      >
        <FieldGroup>
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

          <Button type="submit" :disabled="processing">
            {{ t('auth.forgot_password.submit') }}
          </Button>
          <Link route="session.create" class="text-sm underline-offset-4 hover:underline">
            {{ t('auth.back_to_login') }}
          </Link>
        </FieldGroup>
      </Form>
      <Button v-else as-child>
        <Link route="session.create">{{ t('auth.back_to_login') }}</Link>
      </Button>
    </CardContent>
  </Card>
</template>
