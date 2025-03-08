<script lang="ts" setup>
import { useForm } from '@inertiajs/vue3'
import { Send } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input, InputError } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

const form = useForm({
  email: '',
})

function submit() {
  form.clearErrors()
  form.post(`/admin/invitations`)
}
</script>

<template>
  <Dialog>
    <DialogTrigger>
      <slot />
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {{ $t('pages.admin.users.invite.title') }}
        </DialogTitle>
        <DialogDescription> </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="submit">
        <div class="grid gap-4 max-w-4xl">
          <div class="grid gap-2">
            <Label for="email" :invalid="!!form.errors.email">
              {{ $t('fields.email') }}
            </Label>
            <Input id="email" name="email" type="email" v-model="form.email" />
            <InputError v-for="error in form.errors.email ?? []">
              {{ error }}
            </InputError>
          </div>
        </div>
      </form>

      <DialogFooter>
        <DialogClose>
          <Button variant="secondary">
            {{ $t('cancel') }}
          </Button>
        </DialogClose>

        <DialogClose>
          <Button variant="default" @click="submit">
            <Send class="w-4 h-4 mr-2" />
            {{ $t('send') }}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
