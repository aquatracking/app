<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import { useBiotopeDetails } from '~/composables/use_biotope_details'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { BiotopeDto } from '../../../app/dto/biotope_dto'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const { t } = useI18n()

const { biotope } = toRefs(props)

const { subtitleItems } = useBiotopeDetails(biotope)

const confirmDelete = useConfirm()

function showDeleteDialog() {
  confirmDelete.require({
    header: t('dialogs.delete.title'),
    message: t('dialogs.delete.message', { name: biotope.value.name }),
    acceptClass: 'p-button-danger',
    acceptLabel: t('dialogs.delete.accept'),
    rejectClass: 'p-button-secondary',
    rejectLabel: t('dialogs.delete.reject'),
    accept: () => {
      router.delete(`/biotopes/${biotope.value.id}`)
    },
  })
}
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <PageContent>
      <TitleBar
        :title="biotope.name"
        :breadcrumb="[
          { label: $t('pages.biotopes.title'), href: '/' },
          { label: biotope.name, href: `/biotopes/${biotope.id}` },
        ]"
      >
        <template #subtitle>
          <div class="mr-8 flex items-center mt-4" v-for="item in subtitleItems">
            <span>{{ item.text }}</span>
          </div>
        </template>
        <template #cta>
          <Button
            as="a"
            :label="$t('pages.biotopes.delete.title')"
            type="button"
            @click="showDeleteDialog"
            icon="pi pi-trash"
            class="p-button-danger"
            variant="outlined"
          />

          <Button
            as="a"
            :label="$t('pages.biotopes.edit.title')"
            type="button"
            :href="`/biotopes/${biotope.id}/edit`"
            icon="pi pi-pencil"
          />
        </template>
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <p class="m-0">
        {{ biotope.description }}
      </p>
    </PageContent>
  </NavigationLayout>
</template>
