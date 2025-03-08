<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Input, InputError } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import Link from '~/components/ui/Link.vue'
import BaseLayout from '~/layouts/BaseLayout.vue'

defineProps<{
  requireInvitation: boolean
}>()

const form = useForm({
  email: '',
  password: '',
  rememberMe: false,
})

function submit() {
  form.clearErrors()
  form.post('/auth/login')
}
</script>

<template>
  <BaseLayout :title="$t('pages.login.title')">
    <form @submit.prevent="submit">
      <div class="w-full h-screen flex items-center justify-center px-4">
        <Card class="mx-auto max-w-sm w-full">
          <CardHeader>
            <CardTitle class="text-2xl">
              {{ $t('pages.login.title') }}
            </CardTitle>
            <CardDescription>
              {{ $t('pages.login.description') }}
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
              <div class="grid gap-2">
                <div class="flex items-center">
                  <Label for="password" :invalid="!!form.errors.password">
                    {{ $t('fields.password') }}
                  </Label>

                  <Link href="/auth/password/forgot" class="ml-auto inline-block text-sm underline">
                    {{ $t('auth.forgotPassword') }}
                  </Link>
                </div>
                <Input id="password" name="password" type="password" v-model="form.password" />
                <InputError v-for="error in form.errors.password ?? []">
                  {{ error }}
                </InputError>
              </div>
              <div class="flex items-center space-x-2">
                <Checkbox id="rememberme" v-model="form.rememberMe" />
                <label
                  for="rememberme"
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {{ $t('fields.rememberMe') }}
                </label>
              </div>
              <Button type="submit" class="w-full" :loading="form.processing">
                {{ $t('auth.signIn') }}
              </Button>
            </div>
            <div class="mt-4 text-center text-sm" v-if="!requireInvitation">
              {{ $t('auth.noAccount') }}
              <Link href="/auth/register">{{ $t('auth.signUp') }}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  </BaseLayout>
</template>
