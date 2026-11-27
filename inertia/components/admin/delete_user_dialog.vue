<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

/**
 * Deletion of an account, confirmed by typing its email.
 */
const props = defineProps<{ user: { id: string; email: string; displayName: string } }>()

const { t } = useI18n()
const open = ref(false)
const typed = ref('')
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="destructive" size="sm">{{ t('admin.users.delete') }}</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-lg">
      <Form
        v-slot="{ errors, processing }"
        route="admin.users.destroy"
        :params="{ id: props.user.id }"
        @success="open = false"
      >
        <DialogHeader>
          <DialogTitle>{{
            t('admin.users.delete_title', { name: props.user.displayName })
          }}</DialogTitle>
          <DialogDescription>{{ t('admin.users.delete_description') }}</DialogDescription>
        </DialogHeader>
        <FieldGroup class="my-4">
          <Field :data-invalid="!!errors.email">
            <FieldLabel :for="`delete-${props.user.id}`">
              {{ t('admin.users.delete_confirm', { email: props.user.email }) }}
            </FieldLabel>
            <Input
              :id="`delete-${props.user.id}`"
              v-model="typed"
              name="email"
              type="email"
              autocomplete="off"
              data-1p-ignore
              data-bwignore
              data-lpignore="true"
              data-form-type="other"
              required
              :aria-invalid="!!errors.email"
            />
            <FieldError :errors="[errors.email]" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">
            {{ t('admin.cancel') }}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            :disabled="processing || typed.trim().toLowerCase() !== props.user.email"
          >
            {{ t('admin.users.delete_submit') }}
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  </Dialog>
</template>
