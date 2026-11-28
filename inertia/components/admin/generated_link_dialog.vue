<script setup lang="ts">
/**
 * Shows the flash `generatedLink` (invitation or password reset link) in
 * a window with a "copy" button. It is the only moment the link is known:
 * the server stores its token hashed.
 */
import { ref, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

const { t } = useI18n()
const page = usePage()

const field = ref<HTMLElement | null>(null)
const open = ref(false)
const copied = ref(false)
const link = ref(page.flash.generatedLink)

watch(
  () => page.flash.generatedLink,
  (generatedLink) => {
    if (!generatedLink) return
    link.value = generatedLink
    copied.value = false
    open.value = true
  },
  { immediate: true }
)

/**
 * The clipboard needs a secure context (HTTPS, localhost). Otherwise the
 * link stays selected in the field, ready to copy by hand.
 */
async function copy() {
  field.value?.querySelector('input')?.select()
  try {
    await navigator.clipboard.writeText(link.value!.url)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="link" class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ t(`admin.generated_link.${link.kind}.title`) }}</DialogTitle>
        <DialogDescription class="wrap-anywhere">
          {{ t(`admin.generated_link.${link.kind}.description`, { email: link.email }) }}
        </DialogDescription>
      </DialogHeader>
      <div ref="field" class="flex gap-2">
        <Input
          :model-value="link.url"
          class="min-w-0"
          readonly
          :aria-label="t('admin.generated_link.url')"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <Button type="button" @click="copy">
          {{ copied ? t('admin.generated_link.copied') : t('admin.generated_link.copy') }}
        </Button>
      </div>
      <p class="text-muted-foreground text-sm wrap-anywhere">
        {{ t('admin.generated_link.once') }}
        <template v-if="link.emailed">{{
          t('admin.generated_link.emailed', { email: link.email })
        }}</template>
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" @click="open = false">
          {{ t('admin.generated_link.close') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
