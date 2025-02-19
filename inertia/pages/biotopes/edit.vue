<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { BiotopeDto } from '../../../app/dto/biotope_dto'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const form = useForm({
  name: props.biotope.name,
  description: props.biotope.description,
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
        <div class="flex flex-col gap-8 pt-6 max-w-4xl">
          <FloatLabel>
            <InputText
              id="name"
              type="text"
              name="name"
              class="w-full"
              :invalid="!!form.errors.name"
              v-model="form.name"
            />
            <label for="name">
              {{ $t('fields.name') }}
            </label>
            <Message
              v-for="error in form.errors.name ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>

          <FloatLabel>
            <Textarea
              id="description"
              name="description"
              class="w-full"
              auto-resize
              :rows="5"
              :invalid="!!form.errors.description"
              v-model="form.description"
            />
            <label for="description">
              {{ $t('fields.description') }}
            </label>
            <Message
              v-for="error in form.errors.description ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>

          <FloatLabel>
            <InputNumber
              id="volume"
              name="volume"
              suffix="L"
              class="w-full"
              :invalid="!!form.errors.volume"
              v-model="form.volume"
            />
            <label for="volume"> {{ $t('fields.volume') }}</label>
            <Message
              v-for="error in form.errors.volume ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>

          <SelectButton
            v-if="biotope.type === 'aquarium'"
            id="saltwater"
            name="saltwater"
            class="w-full"
            :invalid="!!form.errors.saltwater"
            v-model="form.saltwater"
            option-value="value"
            option-label="name"
            :options="[
              { name: $t('biotopes.aquarium.freshwater'), value: false },
              { name: $t('biotopes.aquarium.saltwater'), value: true },
            ]"
          />
        </div>

        <div class="flex py-6 gap-2">
          <Button :label="$t('pages.biotopes.edit.title')" icon="pi pi-save" type="submit" />
        </div>
      </form>
    </PageContent>
  </NavigationLayout>
</template>
