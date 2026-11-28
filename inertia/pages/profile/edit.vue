<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '~/layouts/app.vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import NameFields from '~/components/users/name_fields.vue'
import PasswordFields from '~/components/users/password_fields.vue'
import PreferenceFields from '~/components/users/preference_fields.vue'
import { browserTimezone, listedTimezone } from '~/timezones'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const props = defineProps<{ locales: string[]; timezones: string[] }>()

const { t } = useI18n()
const page = usePage()

/**
 * The page reads the shared user, language and time zone.
 */
const user = page.props.user!
const timezone = ref(page.props.timezone)

/**
 * The saved zone as an entry of the list: a name saved before the list
 * ("Asia/Calcutta", "America/Montreal") becomes the entry that designates
 * the same zone ("Asia/Kolkata", "America/Toronto"). Kept as is when no
 * entry matches: saving it is then refused.
 */
function listedSavedTimezone() {
  return listedTimezone(page.props.timezone, props.timezones) ?? page.props.timezone
}

/**
 * The browser's time zone, known once mounted. When its zone differs from
 * the saved one (after a move, for example), the page offers to use it;
 * nothing changes until the user saves. Both are compared as entries of
 * the list, and with the saved zone, not with the field being edited.
 */
const browserZone = ref<string | null>(null)
const suggestedTimezone = computed(() =>
  browserZone.value && browserZone.value !== listedSavedTimezone() ? browserZone.value : null
)

onMounted(() => {
  browserZone.value = browserTimezone(props.timezones)
  timezone.value = listedSavedTimezone()
})
</script>

<template>
  <Head :title="t('profile.title')" />
  <div class="mx-auto flex max-w-md flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle
          ><h1>{{ t('profile.title') }}</h1></CardTitle
        >
        <CardDescription>{{ t('profile.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form v-slot="{ errors, processing }" route="profile.update">
          <FieldGroup>
            <Field>
              <FieldLabel for="email">{{ t('auth.email') }}</FieldLabel>
              <!-- Not submitted: the email cannot be changed in 2.0 -->
              <Input id="email" type="email" :model-value="user.email" disabled />
              <FieldDescription>{{ t('profile.email_hint') }}</FieldDescription>
            </Field>

            <NameFields :errors="errors" :first-name="user.firstName" :last-name="user.lastName" />

            <PreferenceFields
              v-model:timezone="timezone"
              :errors="errors"
              :locales="props.locales"
              :timezones="props.timezones"
            >
              <div v-if="suggestedTimezone" class="flex flex-wrap items-center gap-2 text-sm">
                <span>{{ t('profile.timezone_suggestion', { timezone: suggestedTimezone }) }}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="timezone = suggestedTimezone"
                >
                  {{ t('profile.use_timezone', { timezone: suggestedTimezone }) }}
                </Button>
              </div>
            </PreferenceFields>

            <Button type="submit" :disabled="processing">{{ t('profile.submit') }}</Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle
          ><h2>{{ t('profile.password.title') }}</h2></CardTitle
        >
        <CardDescription>{{ t('profile.password.description') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form v-slot="{ errors, processing }" route="profile.update_password" reset-on-success>
          <FieldGroup>
            <Field :data-invalid="!!errors.currentPassword">
              <FieldLabel for="currentPassword">{{ t('profile.password.current') }}</FieldLabel>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autocomplete="current-password"
                required
                :aria-invalid="!!errors.currentPassword"
              />
              <FieldError :errors="[errors.currentPassword]" />
            </Field>

            <PasswordFields :errors="errors" :label="t('profile.password.new')" />

            <Button type="submit" :disabled="processing">
              {{ t('profile.password.submit') }}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  </div>
</template>
