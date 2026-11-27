<script setup lang="ts">
import { ref, watch } from 'vue'
import { Head } from '@inertiajs/vue3'
import AppLayout from '~/layouts/app.vue'
import type { Data } from '@generated/data'
import { Button } from '~/components/ui/button'
import { VueDraggable } from 'vue-draggable-plus'
import { useI18n } from '~/composables/use_i18n'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Form, Link, useRouter } from '@adonisjs/inertia/vue'
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from '@lucide/vue'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

/**
 * Tracked measures of a vivarium: add, remove, reorder by drag and drop
 * (touch included) or with the arrows. Each move is saved at once.
 * Read-only on an archived vivarium (docs/features/05-tracked-measures.md).
 */
const props = defineProps<{
  vivarium: Data.Vivarium
  trackedMeasures: Data.TrackedMeasure[]
  addableTypes: Data.MeasureType[]
}>()

const { t } = useI18n()
const router = useRouter()

/**
 * Local copy reordered at once, then reset by the props the server
 * sends back, including after a refused order.
 */
const items = ref([...props.trackedMeasures])
watch(
  () => props.trackedMeasures,
  (trackedMeasures) => (items.value = [...trackedMeasures])
)

function label(measureType: Data.MeasureType) {
  return t(`measure_types.${measureType.code}.label`)
}

function saveOrder() {
  router.put(
    { route: 'tracked_measures.reorder', routeParams: { id: props.vivarium.id } },
    { ids: items.value.map((item) => item.id) },
    { preserveScroll: true }
  )
}

function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= items.value.length) {
    return
  }
  const reordered = [...items.value]
  const [item] = reordered.splice(index, 1)
  reordered.splice(target, 0, item)
  items.value = reordered
  saveOrder()
}
</script>

<template>
  <Head :title="t('tracked_measures.title')" />
  <div class="flex max-w-2xl flex-col gap-6">
    <Link
      route="vivariums.show"
      :params="{ id: props.vivarium.id }"
      class="text-sm text-muted-foreground hover:underline"
    >
      {{ t('tracked_measures.back', { name: props.vivarium.name }) }}
    </Link>

    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">{{ t('tracked_measures.title') }}</h1>
      <p class="text-muted-foreground">{{ t('tracked_measures.description') }}</p>
    </div>

    <Alert v-if="props.vivarium.isArchived">
      <AlertDescription>{{ t('tracked_measures.archived') }}</AlertDescription>
    </Alert>

    <p v-if="items.length === 0" class="rounded-lg border border-dashed p-6 text-center">
      {{ t('tracked_measures.empty') }}
    </p>

    <ul v-else-if="props.vivarium.isArchived" class="divide-y rounded-lg border">
      <li v-for="item in items" :key="item.id" class="flex items-center gap-3 px-4 py-3">
        <span class="flex min-w-0 flex-1 flex-col">
          <span>{{ label(item.measureType) }}</span>
          <span class="text-sm text-muted-foreground">{{
            t(`measure_types.${item.measureType.code}.description`)
          }}</span>
        </span>
        <span class="text-sm text-muted-foreground">{{ item.measureType.unit }}</span>
      </li>
    </ul>

    <VueDraggable
      v-else
      v-model="items"
      tag="ul"
      handle="[data-drag-handle]"
      :animation="150"
      class="divide-y rounded-lg border"
      @end="saveOrder"
    >
      <li
        v-for="(item, index) in items"
        :key="item.id"
        class="flex items-center gap-2 bg-background px-2 py-2"
      >
        <span
          data-drag-handle
          class="cursor-grab touch-none p-2 text-muted-foreground"
          :aria-label="t('tracked_measures.drag', { name: label(item.measureType) })"
        >
          <GripVertical class="size-4" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span>{{ label(item.measureType) }}</span>
          <span class="text-sm text-muted-foreground">{{
            t(`measure_types.${item.measureType.code}.description`)
          }}</span>
        </span>
        <span class="text-sm text-muted-foreground">{{ item.measureType.unit }}</span>
        <Button
          variant="ghost"
          size="icon"
          :disabled="index === 0"
          :aria-label="t('tracked_measures.move_up', { name: label(item.measureType) })"
          @click="move(index, -1)"
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :disabled="index === items.length - 1"
          :aria-label="t('tracked_measures.move_down', { name: label(item.measureType) })"
          @click="move(index, 1)"
        >
          <ArrowDown />
        </Button>
        <Form
          route="tracked_measures.destroy"
          :params="{ id: props.vivarium.id, trackedMeasureId: item.id }"
          :options="{ preserveScroll: true }"
        >
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            :aria-label="t('tracked_measures.remove', { name: label(item.measureType) })"
          >
            <X />
          </Button>
        </Form>
      </li>
    </VueDraggable>

    <template v-if="!props.vivarium.isArchived">
      <p v-if="props.addableTypes.length === 0" class="text-sm text-muted-foreground">
        {{ t('tracked_measures.add.none') }}
      </p>
      <Form
        v-else
        v-slot="{ errors, processing }"
        route="tracked_measures.store"
        :params="{ id: props.vivarium.id }"
        :options="{ preserveScroll: true }"
        reset-on-success
        class="flex flex-col gap-2"
      >
        <Field :data-invalid="!!errors.code">
          <FieldLabel for="code">{{ t('tracked_measures.add.label') }}</FieldLabel>
          <div class="flex gap-2">
            <NativeSelect
              id="code"
              name="code"
              class="w-full"
              required
              :aria-invalid="!!errors.code"
            >
              <NativeSelectOption value="">{{
                t('tracked_measures.add.choose')
              }}</NativeSelectOption>
              <NativeSelectOption
                v-for="measureType in props.addableTypes"
                :key="measureType.code"
                :value="measureType.code"
              >
                {{ label(measureType) }}{{ measureType.unit ? ` (${measureType.unit})` : '' }}
              </NativeSelectOption>
            </NativeSelect>
            <Button type="submit" :disabled="processing"
              ><Plus />{{ t('tracked_measures.add.submit') }}</Button
            >
          </div>
          <FieldError :errors="[errors.code]" />
        </Field>
      </Form>
    </template>
  </div>
</template>
