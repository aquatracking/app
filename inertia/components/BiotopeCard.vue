<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { toRefs } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useBiotopeDetails } from '~/composables/use_biotope_details'
import { BiotopeDto } from '../../app/dto/biotope_dto'

const props = defineProps<{
  biotope: BiotopeDto
}>()

const { biotope } = toRefs(props)

const { subtitleItems, thumbnailUrl } = useBiotopeDetails(biotope)
</script>
<template>
  <Link :href="'/biotopes/' + biotope.id">
    <Card class="min-w-72 md:max-w-96 overflow-hidden h-full hover:bg-accent">
      <div>
        <div class="flex absolute flex-wrap gap-2 p-2">
          <Badge variant="secondary">
            {{ $t(`biotopes.${biotope.type}.name`) }}
          </Badge>
        </div>

        <img alt="" class="aspect-video object-cover" :src="thumbnailUrl" />
      </div>
      <CardHeader>
        <CardTitle>
          {{ biotope.name }}
        </CardTitle>
        <CardDescription>
          {{ subtitleItems.map((item) => item.text).join(' - ') }}
        </CardDescription>
      </CardHeader>

      <CardContent>{{ biotope.description }}</CardContent>
    </Card>
  </Link>
</template>
