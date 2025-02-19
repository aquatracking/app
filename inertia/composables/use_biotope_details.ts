import { computed, MaybeRefOrGetter, toValue } from 'vue'
import { BiotopeDto } from '../../app/dto/biotope_dto'
import { useI18n } from 'vue-i18n'

export function useBiotopeDetails(biotopeRef: MaybeRefOrGetter<BiotopeDto>) {
  const { t } = useI18n()

  const thumbnailUrl = computed(() => {
    const biotope = toValue(biotopeRef)

    if (biotope.type === 'aquarium') {
      return '../../images/illustrations/aquarium.jpg'
    } else if (biotope.type === 'terrarium') {
      return '../../images/illustrations/terrarium.jpg'
    }
  })

  const subtitleItems = computed(() => {
    const biotope = toValue(biotopeRef)

    const content = []
    if (biotope.volume) {
      content.push({ text: t('biotopes.volume', { volume: biotope.volume }) })
    }

    if (biotope.type === 'aquarium') {
      if (biotope.saltwater) {
        content.push({ text: t('biotopes.aquarium.saltwater') })
      } else {
        content.push({ text: t('biotopes.aquarium.freshwater') })
      }
    }

    return content
  })

  return {
    subtitleItems,
    thumbnailUrl,
  }
}
