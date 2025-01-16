<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import Link from '~/components/ui/Link.vue'

const form = useForm({
  email: '',
})

function submit() {
  form.clearErrors()
  form.post('/auth/password/forgot')
}
</script>

<template>
  <Head :title="$t('pages.forgotPassword.title')" />

  <form @submit.prevent="submit">
    <div class="bg-neutral-50 dark:bg-neutral-950 px-6 py-20 md:px-12 lg:px-20 h-screen">
      <div
        class="bg-surface-0 dark:bg-surface-900 p-6 shadow rounded-border max-w-xl mx-auto flex flex-col gap-8"
      >
        <div class="text-center">
          <div class="text-3xl font-medium">
            {{ $t('pages.forgotPassword.title') }}
          </div>
        </div>

        <ErrorAndNotificationDisplay />

        <div class="flex flex-col gap-8">
          <FloatLabel>
            <InputText
              id="email"
              type="email"
              name="email"
              class="w-full"
              :invalid="!!form.errors.email"
              v-model="form.email"
            />
            <label for="email">
              {{ $t('fields.email') }}
            </label>
            <Message
              v-for="error in form.errors.email ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>
        </div>

        <div class="text-center flex flex-col gap-4">
          <Button
            :label="$t('auth.sendResetMail')"
            icon="pi pi-envelope"
            class="w-full"
            type="submit"
            :loading="form.processing"
          />

          <span class="text-surface-600 dark:text-surface-200 font-medium leading-normal">
            {{ $t('returnTo') }}
            <Link href="/auth/login">
              {{ $t('pages.login.title') }}
            </Link>
          </span>
        </div>
      </div>
    </div>
  </form>
</template>
