<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import { Form, Link } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import PasswordFields from '~/components/users/password_fields.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { FieldGroup } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const props = defineProps<{ token: string; valid: boolean }>()

const { t } = useI18n()
</script>

<template>
  <Head
    :title="t(props.valid ? 'auth.reset_password.title' : 'auth.reset_password.invalid_title')"
  />
  <Card v-if="!props.valid" class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('auth.reset_password.invalid_title') }}</h1></CardTitle
      >
      <CardDescription>{{ t('auth.reset_password.invalid_description') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <Button as-child>
        <Link route="password_reset.create">{{ t('auth.forgot_password.title') }}</Link>
      </Button>
      <Link route="session.create" class="text-sm underline-offset-4 hover:underline">
        {{ t('auth.back_to_login') }}
      </Link>
    </CardContent>
  </Card>

  <Card v-else class="mx-auto max-w-md">
    <CardHeader>
      <CardTitle
        ><h1>{{ t('auth.reset_password.title') }}</h1></CardTitle
      >
      <CardDescription>{{ t('auth.reset_password.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form
        v-slot="{ errors, processing }"
        route="password_reset.update"
        :params="{ token: props.token }"
      >
        <FieldGroup>
          <PasswordFields :errors="errors" :label="t('auth.reset_password.password')" />

          <Button type="submit" :disabled="processing">
            {{ t('auth.reset_password.submit') }}
          </Button>
        </FieldGroup>
      </Form>
    </CardContent>
  </Card>
</template>
