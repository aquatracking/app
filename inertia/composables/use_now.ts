import { usePage } from '@inertiajs/vue3'
import { computed, onMounted, onUnmounted, ref } from 'vue'

/**
 * Clock of the browser, in milliseconds, refreshed every minute while a
 * component uses it. Null before the first mount (and always on the
 * server).
 */
const clock = ref<number | null>(null)
let users = 0
let timer: ReturnType<typeof setInterval> | undefined

/**
 * Now, in milliseconds, for relative times and today's date. During the
 * server rendering and the hydration, it is "now" shared by the server
 * (the instant of the response): both render the same text. Once
 * mounted, it follows the clock of the browser, every minute, including
 * on a page restored from history without request.
 */
export function useNow() {
  const page = usePage()
  const mounted = ref(false)

  onMounted(() => {
    mounted.value = true
    if (users++ === 0) {
      clock.value = Date.now()
      timer = setInterval(() => (clock.value = Date.now()), 60_000)
    }
  })

  onUnmounted(() => {
    if (--users === 0) {
      clearInterval(timer)
    }
  })

  return computed(() =>
    mounted.value && clock.value !== null ? clock.value : Date.parse(page.props.now)
  )
}
