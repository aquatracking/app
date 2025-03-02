<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input, InputError } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import Link from '~/components/ui/Link.vue'
import BaseLayout from '~/layouts/BaseLayout.vue'

const props = defineProps<{
  token: string
}>()

const form = useForm({
  token: props.token,
  password: '',
})

function submit() {
  form.clearErrors()
  form.post('/auth/password/reset')
}
</script>

<template>
  <BaseLayout :title="$t('pages.resetPassword.title')">
    <form @submit.prevent="submit">
      <div class="w-full h-screen flex items-center justify-center px-4">
        <Card class="mx-auto max-w-sm w-full">
          <CardHeader>
            <CardTitle class="text-2xl">
              {{ $t('pages.resetPassword.title') }}
            </CardTitle>
            <CardDescription>
              {{ $t('pages.resetPassword.description') }}
            </CardDescription>
            <ErrorAndNotificationDisplay />
          </CardHeader>
          <CardContent>
            <div class="grid gap-4">
              <div class="grid gap-2">
                <Label for="password" :invalid="!!form.errors.password">
                  {{ $t('fields.newPassword') }}
                </Label>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  v-model="form.password"
                />
                <InputError v-for="error in form.errors.password ?? []">
                  {{ error }}
                </InputError>
              </div>

              <Button type="submit" class="w-full" :loading="form.processing">
                {{ $t('auth.resetPassword') }}
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
