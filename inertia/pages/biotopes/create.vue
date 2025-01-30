<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Step from 'primevue/step'
import StepItem from 'primevue/stepitem'
import StepPanel from 'primevue/steppanel'
import Stepper from 'primevue/stepper'
import Textarea from 'primevue/textarea'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import NavigationLayout from '~/layouts/NavigationLayout.vue'

const form = useForm({
  name: '',
  description: '',
  startedDate: new Date(),
  type: 'aquarium',
  volume: null,
})

function submit() {
  form.clearErrors()
  form.post('/biotopes')
}
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <PageContent>
      <TitleBar
        :title="$t('pages.biotopes.create.title')"
        :breadcrumb="[
          { label: $t('pages.biotopes.title'), href: '/' },
          { label: $t('pages.biotopes.create.shortTitle'), href: '/biotopes/create' },
        ]"
      >
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <form @submit.prevent="submit">
        <Stepper value="1">
          <StepItem value="1">
            <Step>
              <span
                :class="
                  Object.keys(form.errors).some((key) =>
                    ['name', 'description', 'startedDate'].includes(key)
                  )
                    ? 'text-red-500'
                    : ''
                "
                >{{ $t('pages.biotopes.create.steps.informations.title') }}</span
              >
            </Step>
            <StepPanel v-slot="{ activateCallback }">
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
                  <DatePicker
                    id="startedDate"
                    name="startedDate"
                    class="w-full"
                    :invalid="!!form.errors.startedDate"
                    autocomplete="username"
                    v-model="form.startedDate"
                    showButtonBar
                  />
                  <label for="startedDate">
                    {{ $t('fields.startedDate') }}
                  </label>
                  <Message
                    v-for="error in form.errors.startedDate ?? []"
                    severity="error"
                    variant="simple"
                    size="small"
                    class="pt-1"
                  >
                    {{ error }}
                  </Message>
                </FloatLabel>
              </div>
              <div class="py-6">
                <Button :label="$t('next')" @click="activateCallback('2')" type="button" />
              </div>
            </StepPanel>
          </StepItem>
          <StepItem value="2">
            <Step>{{ $t('pages.biotopes.create.steps.details.title') }}</Step>
            <StepPanel v-slot="{ activateCallback }">
              <div class="flex flex-col gap-8 pt-6 max-w-4xl">
                <FloatLabel>
                  <Select
                    id="type"
                    name="type"
                    class="w-full"
                    :invalid="!!form.errors.type"
                    v-model="form.type"
                    option-value="value"
                    option-label="name"
                    :options="[
                      { name: $t('biotopes.aquarium.name'), value: 'aquarium' },
                      { name: $t('biotopes.terrarium.name'), value: 'terrarium' },
                    ]"
                  />
                  <label for="type">
                    {{ $t('fields.type') }}
                  </label>
                  <Message
                    v-for="error in form.errors.type ?? []"
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
              </div>

              <div class="flex py-6 gap-2">
                <Button
                  :label="$t('back')"
                  severity="secondary"
                  @click="activateCallback('1')"
                  type="button"
                />
                <Button
                  :label="$t('pages.biotopes.create.title')"
                  icon="pi pi-save"
                  type="submit"
                />
              </div>
            </StepPanel>
          </StepItem>
        </Stepper>
      </form>
    </PageContent>
  </NavigationLayout>
</template>
