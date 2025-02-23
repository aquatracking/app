<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
import { computed } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { usePageErrorsBag } from '~/composables/use_page_errors_bag'
import { usePageNotification } from '~/composables/use_page_notifications'

const errorsBag = usePageErrorsBag()
const notification = usePageNotification()

const errors = computed(() =>
  Object.entries(errorsBag.value ?? {})
    .filter(([key]) => key !== 'E_VALIDATION_ERROR' && key !== 'E_UNAUTHORIZED_ACCESS')
    .map(([, value]) => value)
)
</script>

<template>
  <div v-if="errors.length > 0 || notification">
    <Alert variant="destructive" v-for="error in errors">
      <AlertCircle class="w-4 h-4" />
      <AlertTitle>{{ $t('error') }}</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert :variant="notification.type === 'error' ? 'destructive' : 'default'" v-if="notification">
      <AlertCircle class="w-4 h-4" />
      <AlertTitle>
        <template v-if="notification.type === 'error'">{{ $t('error') }}</template>
        <template v-else-if="notification.type === 'success'">{{ $t('success') }}</template>
        <template v-else-if="notification.type === 'info'">{{ $t('info') }}</template>
        <template v-else-if="notification.type === 'warn'">{{ $t('warning') }}</template>
      </AlertTitle>
      <AlertDescription>{{ notification.message }}</AlertDescription>
    </Alert>
  </div>
</template>
