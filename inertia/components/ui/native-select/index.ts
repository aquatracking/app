import type { Ref } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import { createContext } from 'reka-ui'

export { default as NativeSelect } from './NativeSelect.vue'
export { default as NativeSelectOptGroup } from './NativeSelectOptGroup.vue'
export { default as NativeSelectOption } from './NativeSelectOption.vue'

/**
 * Value of the select, given to its options. The options come from a
 * slot, so v-model on the select cannot mark the selected one when the
 * page is rendered on the server: each option sets its own `selected`.
 */
export const [injectNativeSelectValue, provideNativeSelectValue] =
  createContext<Ref<AcceptableValue | AcceptableValue[] | undefined>>('NativeSelect')
