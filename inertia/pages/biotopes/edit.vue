<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import { Input, InputError } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '~/components/ui/number-field'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { BiotopeDto } from '../../../app/dto/biotope_dto'
import { Button } from '~/components/ui/button'
import { Save } from 'lucide-vue-next'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const form = useForm({
  name: props.biotope.name,
  description: props.biotope.description as string | undefined,
  volume: props.biotope.volume,
  saltwater: props.biotope.type === 'aquarium' ? Boolean(props.biotope.saltwater) : false,
})

console.log(props.biotope)

function submit() {
  form.clearErrors()
  form.patch(`/biotopes/${props.biotope.id}`)
}
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <PageContent>
      <TitleBar
        :title="$t('pages.biotopes.edit.title')"
        :breadcrumb="[
          { label: $t('pages.biotopes.title'), href: '/' },
          { label: biotope.name, href: `/biotopes/${biotope.id}` },
          { label: $t('pages.biotopes.edit.shortTitle'), href: `/biotopes/${biotope.id}/edit` },
        ]"
      >
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <form @submit.prevent="submit">
        <div class="grid gap-4 max-w-4xl">
          <div class="grid gap-2">
            <Label for="name" :invalid="!!form.errors.name">
              {{ $t('fields.name') }}
            </Label>
            <Input id="name" name="name" type="text" v-model="form.name" />
            <InputError v-for="error in form.errors.name ?? []">
              {{ error }}
            </InputError>
          </div>

          <div class="grid gap-2">
            <Label for="description" :invalid="!!form.errors.description">
              {{ $t('fields.description') }}
            </Label>
            <Textarea id="description" name="description" type="text" v-model="form.description" />
            <InputError v-for="error in form.errors.description ?? []">
              {{ error }}
            </InputError>
          </div>

          <NumberField id="volume" name="volume" v-model="form.volume">
            <Label>
              {{ $t('fields.volume') }}
            </Label>
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
            <InputError v-for="error in form.errors.volume ?? []">
              {{ error }}
            </InputError>
          </NumberField>

          <div class="flex items-center space-x-2" v-if="biotope.type === 'aquarium'">
            <Switch id="saltwater" v-model="form.saltwater" />
            <Label for="saltwater">
              {{ $t('biotopes.aquarium.saltwater') }}
            </Label>
          </div>
        </div>

        <div class="flex py-6 gap-2">
          <Button icon="pi pi-save" type="submit">
            <Save class="w-4 h-4 mr-2" />
            {{ $t('pages.biotopes.edit.title') }}
          </Button>
        </div>
      </form>
    </PageContent>
  </NavigationLayout>
</template>
