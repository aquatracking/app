<script setup lang="ts">
import Button from 'primevue/button'
import { toRefs } from 'vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import { useBiotopeDetails } from '~/composables/use_biotope_details'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { BiotopeDto } from '../../../app/dto/biotope_dto'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const { biotope } = toRefs(props)

const { subtitleItems } = useBiotopeDetails(biotope)
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
            :label="$t('pages.biotopes.edit.title')"
            type="button"
            :href="`/biotopes/${biotope.id}/edit`"
            icon="pi pi-pencil"
          />
        </template>
      </TitleBar>

      <p class="m-0">
        {{ biotope.description }}
      </p>
    </PageContent>
  </NavigationLayout>
</template>
