<script setup lang="ts">
import { ref } from 'vue'
import { Archive } from '@lucide/vue'
import { Form } from '@adonisjs/inertia/vue'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

const props = defineProps<{ vivarium: { id: string; name: string } }>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline" size="sm">
        <Archive />
        {{ t('vivariums.archive') }}
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-lg">
      <Form
        v-slot="{ processing }"
        route="vivariums.archive"
        :params="{ id: props.vivarium.id }"
        @success="open = false"
      >
        <DialogHeader>
          <DialogTitle>{{
            t('vivariums.archive_confirm.title', { name: props.vivarium.name })
          }}</DialogTitle>
          <DialogDescription>{{ t('vivariums.archive_confirm.description') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4">
          <Button type="button" variant="outline" @click="open = false">
            {{ t('vivariums.form.cancel') }}
          </Button>
          <Button type="submit" :disabled="processing">
            {{ t('vivariums.archive_confirm.submit') }}
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  </Dialog>
</template>
