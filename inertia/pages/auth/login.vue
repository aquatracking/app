<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Form, Link } from '@adonisjs/inertia/vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { useI18n } from '~/composables/use_i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const { t } = useI18n()
</script>

<template>
  <Head :title="t('auth.login.title')" />
  <Card class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('auth.login.title') }}</h1></CardTitle
      >
      <CardDescription>{{ t('auth.login.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form v-slot="{ errors, processing }" route="session.store" :reset-on-error="['password']">
        <FieldGroup>
          <Field :data-invalid="!!errors.email">
            <FieldLabel for="email">{{ t('auth.email') }}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autocomplete="username"
              required
              :aria-invalid="!!errors.email"
            />
            <FieldError :errors="[errors.email]" />
          </Field>

          <Field :data-invalid="!!errors.password">
            <FieldLabel for="password">{{ t('auth.password') }}</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              :aria-invalid="!!errors.password"
            />
            <FieldError :errors="[errors.password]" />
          </Field>

          <Field orientation="horizontal">
            <Checkbox id="rememberMe" name="rememberMe" value="true" />
            <FieldLabel for="rememberMe" class="font-normal">
              {{ t('auth.login.remember_me') }}
            </FieldLabel>
          </Field>

          <Button type="submit" :disabled="processing">{{ t('auth.login.submit') }}</Button>
          <Link route="password_reset.create" class="text-sm underline-offset-4 hover:underline">
            {{ t('auth.login.forgot_password') }}
          </Link>
        </FieldGroup>
      </Form>
    </CardContent>
  </Card>
</template>
