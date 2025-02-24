<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarIcon, Save } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import { Input, InputError } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '~/components/ui/number-field'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { cn } from '~/lib/utils'

const { locale } = useI18n()

const df = new DateFormatter(locale.value, {
  dateStyle: 'long',
})

const form = useForm({
  name: '',
  description: '',
  startedDate: today(getLocalTimeZone()),
  type: 'aquarium',
  volume: null,
  saltwater: false,
})

function submit() {
  form.clearErrors()
  form
    .transform((data) => ({
      ...data,
      startedDate: data.startedDate.toString(),
    }))
    .post('/biotopes')
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
            <Textarea
              id="description"
              name="description"
              type="text"
              v-model="form.description"
              rows="5"
            />
            <InputError v-for="error in form.errors.description ?? []">
              {{ error }}
            </InputError>
          </div>

          <div class="grid gap-2">
            <Label for="startedDate" :invalid="!!form.errors.startedDate">
              {{ $t('fields.startedDate') }}
            </Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :class="
                    cn(
                      'w-[280px] justify-start text-left font-normal',
                      !form.startedDate && 'text-muted-foreground'
                    )
                  "
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    form.startedDate
                      ? df.format(form.startedDate.toDate(getLocalTimeZone()))
                      : $t('selectDate')
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model="form.startedDate" initial-focus :locale="locale" />
              </PopoverContent>
            </Popover>
            <InputError v-for="error in form.errors.startedDate ?? []">
              {{ error }}
            </InputError>
          </div>

          <NumberField id="volume" name="volume" v-model="form.volume" :min="0">
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

          <div class="grid gap-2">
            <Label for="type" :invalid="!!form.errors.type">
              {{ $t('fields.type') }}
            </Label>
            <Select v-model="form.type" id="type">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="aquarium">
                    {{ $t('biotopes.aquarium.name') }}
                  </SelectItem>
                  <SelectItem value="terrarium">
                    {{ $t('biotopes.terrarium.name') }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <InputError v-for="error in form.errors.type ?? []">
              {{ error }}
            </InputError>
          </div>

          <div class="flex items-center space-x-2" v-if="form.type === 'aquarium'">
            <Switch id="saltwater" v-model="form.saltwater" />
            <Label for="saltwater">
              {{ $t('biotopes.aquarium.saltwater') }}
            </Label>
          </div>
        </div>

        <div class="flex py-6 gap-2">
          <Button type="submit">
            <Save class="w-4 h-4 mr-2" />
            {{ $t('pages.biotopes.create.title') }}
          </Button>
        </div>
      </form>
    </PageContent>
  </NavigationLayout>
</template>
