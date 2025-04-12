<script lang="ts" setup>
import { useForm } from '@inertiajs/vue3'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { MeasureType } from '../../../app/constant'
import { BiotopeDto } from '../../../app/dto/biotope_dto'

const props = defineProps<{
  biotope: BiotopeDto
  availableMeasureTypes: MeasureType[]
}>()

const form = useForm({
  value: 0,
  measureTypeCode: 'temperature',
})

function submit() {
  form.clearErrors()
  form.post(`/biotopes/${props.biotope.id}/measures`)
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
          {{ $t('pages.biotopes.measures.create.title') }}
        </DialogTitle>
        <DialogDescription> </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="submit">
        <div class="grid gap-4 max-w-4xl">
          <div class="grid gap-2">
            <Label for="measure" :invalid="!!form.errors.measureTypeCode">
              {{ $t('fields.measure') }}
            </Label>
            <Select v-model="form.measureTypeCode" id="measure">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="measureType in availableMeasureTypes"
                    :value="measureType.code"
                  >
                    {{ $t(`measures.types.${measureType.code}.name`) }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <InputError v-if="form.errors.measureTypeCode">
              {{ form.errors.measureTypeCode }}
            </InputError>
          </div>

          <div class="grid gap-2">
            <Label for="value" :invalid="!!form.errors.value">
              {{ $t('fields.value') }}
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              inputmode="numeric"
              step="0.01"
              v-model="form.value"
            />
            <InputError v-for="error in form.errors.value ?? []">
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
            {{ $t('create') }}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
