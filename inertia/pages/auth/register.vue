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
  fullName: '',
  email: '',
  password: '',
})

function submit() {
  form.clearErrors()
  form.post('/auth/register')
}
</script>
<template>
  <BaseLayout :title="$t('pages.register.title')">
    <form @submit.prevent="submit">
      <div class="w-full h-screen flex items-center justify-center px-4">
        <Card class="mx-auto max-w-sm w-full">
          <CardHeader>
            <CardTitle class="text-2xl">
              {{ $t('pages.register.title') }}
            </CardTitle>
            <CardDescription>
              {{ $t('pages.register.description') }}
            </CardDescription>
            <ErrorAndNotificationDisplay />
          </CardHeader>
          <CardContent>
            <div class="grid gap-4">
              <div class="grid gap-2">
                <Label for="fullName" :invalid="!!form.errors.fullName">
                  {{ $t('fields.fullName') }}
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  v-model="form.fullName"
                  placeholder="Basil"
                />
                <InputError v-for="error in form.errors.fullName ?? []">
                  {{ error }}
                </InputError>
              </div>

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
                <Label for="password" :invalid="!!form.errors.password">
                  {{ $t('fields.password') }}
                </Label>

                <Input id="password" name="password" type="password" v-model="form.password" />
                <InputError v-for="error in form.errors.password ?? []">
                  {{ error }}
                </InputError>
              </div>

              <Button type="submit" class="w-full" :loading="form.processing">
                {{ $t('auth.signUp') }}
              </Button>
            </div>
            <div class="mt-4 text-center text-sm">
              {{ $t('auth.alreadyRegistered') }}
              <Link href="/auth/login">{{ $t('auth.signIn') }}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  </BaseLayout>
</template>
