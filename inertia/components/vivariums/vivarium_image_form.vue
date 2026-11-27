<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { ImagePlus } from '@lucide/vue'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'

/**
 * Upload, replacement and removal of the photo of a vivarium.
 */
const props = defineProps<{ vivarium: { id: string; imageUrl: string | null } }>()

const { t } = useI18n()
const chosen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-3">
    <Form
      v-slot="{ errors, processing }"
      route="vivarium_images.update"
      :params="{ id: props.vivarium.id }"
      reset-on-success
      @success="chosen = false"
    >
      <Field :data-invalid="!!errors.image">
        <FieldLabel for="image">
          {{ props.vivarium.imageUrl ? t('vivariums.image.change') : t('vivariums.image.add') }}
        </FieldLabel>
        <div class="flex flex-wrap gap-2">
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="flex-1"
            :aria-invalid="!!errors.image"
            @change="chosen = true"
          />
          <Button type="submit" variant="outline" :disabled="processing || !chosen">
            <ImagePlus />
            {{ t('vivariums.image.submit') }}
          </Button>
        </div>
        <FieldDescription>{{ t('vivariums.image.hint') }}</FieldDescription>
        <FieldError :errors="[errors.image]" />
      </Field>
    </Form>
    <Form
      v-if="props.vivarium.imageUrl"
      v-slot="{ processing }"
      route="vivarium_images.destroy"
      :params="{ id: props.vivarium.id }"
    >
      <Button type="submit" variant="ghost" size="sm" :disabled="processing">
        {{ t('vivariums.image.remove') }}
      </Button>
    </Form>
  </div>
</template>
