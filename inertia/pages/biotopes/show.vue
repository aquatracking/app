<script setup lang="ts">
import type BiotopesController from '#controllers/biotopes_controller'
import { InferPageProps } from '@adonisjs/inertia/types'
import { Link, router } from '@inertiajs/vue3'
import { Edit2, Plus, Trash } from 'lucide-vue-next'
import { toRefs } from 'vue'
import CreateMeasureDialog from '~/components/dialogs/CreateMeasureDialog.vue'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import LocaleTimeAgo from '~/components/LocaleTimeAgo.vue'
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
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useBiotopeDetails } from '~/composables/use_biotope_details'
import NavigationLayout from '~/layouts/NavigationLayout.vue'

type PageProps = InferPageProps<BiotopesController, 'show'>
const props = defineProps<{
  biotope: PageProps['biotope']
  measures: PageProps['measures']
  availableMeasureTypes: PageProps['availableMeasureTypes']
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

          <Button variant="secondary" :as="Link" :href="`/biotopes/${biotope.id}/edit`">
            <Edit2 class="w-4 h-4 mr-2" />
            {{ $t('pages.biotopes.edit.title') }}
          </Button>

          <CreateMeasureDialog :biotope :availableMeasureTypes>
            <Button variant="default">
              <Plus class="w-4 h-4 mr-2" />
              {{ $t('pages.biotopes.measures.create.title') }}
            </Button>
          </CreateMeasureDialog>
        </template>
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <p class="m-0">
        {{ biotope.description }}
      </p>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card v-for="measure in measures" class="w-">
          <CardHeader class="pb-2">
            <CardTitle class="tracking-tight text-sm font-medium">
              {{ $t(`measures.types.${measure.type.code}.name`) }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <template v-if="measure.last">
              <div class="text-2xl font-bold">{{ measure.last.value }} {{ measure.type.unit }}</div>
              <p class="text-xs text-muted-foreground first-letter:uppercase">
                <LocaleTimeAgo :date="measure.last.measuredAt" />
              </p>
            </template>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  </NavigationLayout>
</template>
