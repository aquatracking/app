<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input, InputError } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import Link from '~/components/ui/Link.vue'
import BaseLayout from '~/layouts/BaseLayout.vue'

const form = useForm({
  email: '',
})

function submit() {
  form.clearErrors()
  form.post('/auth/password/forgot')
}
</script>

<template>
  <BaseLayout :title="$t('pages.forgotPassword.title')">
    <form @submit.prevent="submit">
      <div class="w-full h-screen flex items-center justify-center px-4">
        <Card class="mx-auto max-w-sm w-full">
          <CardHeader>
            <CardTitle class="text-2xl">
              {{ $t('pages.forgotPassword.title') }}
            </CardTitle>
            <CardDescription>
              {{ $t('pages.forgotPassword.description') }}
            </CardDescription>
            <ErrorAndNotificationDisplay />
          </CardHeader>
          <CardContent>
            <div class="grid gap-4">
              <div class="grid gap-2">
                <Label for="email" :invalid="!!form.errors.email">
                  {{ $t('fields.email') }}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="me@example.com"
                  v-model="form.email"
                />
                <InputError v-for="error in form.errors.email ?? []">
                  {{ error }}
                </InputError>
              </div>

              <Button type="submit" class="w-full" :loading="form.processing">
                {{ $t('auth.sendResetMail') }}
              </Button>
            </div>
            <div class="mt-4 text-center text-sm">
              {{ $t('returnTo') }}
              <Link href="/auth/login">
                {{ $t('pages.login.title') }}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  </BaseLayout>
</template>
