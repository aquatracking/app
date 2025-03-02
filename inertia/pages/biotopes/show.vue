<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { Edit2, Trash } from 'lucide-vue-next'
import { toRefs } from 'vue'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { useBiotopeDetails } from '~/composables/use_biotope_details'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { BiotopeDto } from '../../../app/dto/biotope_dto'
import { Link } from '@inertiajs/vue3'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const { biotope } = toRefs(props)

const { subtitleItems } = useBiotopeDetails(biotope)

function deleteBiotope() {
  router.delete(`/biotopes/${biotope.value.id}`)
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
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="destructive">
                <Trash class="w-4 h-4 mr-2" />
                {{ $t('pages.biotopes.delete.title') }}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {{ $t('dialogs.delete.title') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {{ $t('dialogs.delete.message', { name: biotope.name }) }}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {{ $t('dialogs.delete.reject') }}
                </AlertDialogCancel>
                <AlertDialogAction variant="destructive" @click="deleteBiotope">
                  {{ $t('dialogs.delete.accept') }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button :as="Link" :href="`/biotopes/${biotope.id}/edit`">
            <Edit2 class="w-4 h-4 mr-2" />
            {{ $t('pages.biotopes.edit.title') }}
          </Button>
        </template>
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <p class="m-0">
        {{ biotope.description }}
      </p>
    </PageContent>
  </NavigationLayout>
</template>
