import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

export function useQueryParams() {
  const page = usePage()
  return computed<Record<string, any>>(() => page.props.queryString as Record<string, any>)
}
