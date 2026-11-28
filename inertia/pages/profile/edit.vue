<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '~/layouts/app.vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useI18n } from '~/composables/use_i18n'
import TimezoneSelect from '~/components/timezone_select.vue'
import { browserTimezone, listedTimezone } from '~/timezones'
import { NativeSelect, NativeSelectOption } from '~/components/ui/native-select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'

defineOptions({ layout: AppLayout })

const props = defineProps<{ timezones: string[] }>()

const { t } = useI18n()
const page = usePage()

/**
 * The page reads the shared user, language and time zone.
 */
const user = page.props.user!
const locales = ['en', 'fr'] as const
const timezone = ref(page.props.timezone)

/**
 * The browser's time zone, known once mounted. When it differs from the
 * saved one (after a move, for example), the page offers to use it;
 * nothing changes until the user saves. The comparison is with the saved
 * zone, not with the field being edited.
 */
const browserZone = ref<string | null>(null)
const suggestedTimezone = computed(() =>
  browserZone.value && browserZone.value !== page.props.timezone ? browserZone.value : null
)

onMounted(() => {
  browserZone.value = browserTimezone(props.timezones)
  /**
   * A zone saved under a name that is no longer in the list (renamed by
   * an update of the runtime) is shown under its name in the list.
   */
  timezone.value = listedTimezone(timezone.value, props.timezones) ?? timezone.value
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

            <Field :data-invalid="!!errors.firstName">
              <FieldLabel for="firstName">{{ t('auth.first_name') }}</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                autocomplete="given-name"
                required
                :default-value="user.firstName"
                :aria-invalid="!!errors.firstName"
              />
              <FieldError :errors="[errors.firstName]" />
            </Field>

            <Field :data-invalid="!!errors.lastName">
              <FieldLabel for="lastName">
                {{ t('auth.last_name') }}
                <span class="text-muted-foreground font-normal">({{ t('auth.optional') }})</span>
              </FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                autocomplete="family-name"
                :default-value="user.lastName ?? ''"
                :aria-invalid="!!errors.lastName"
              />
              <FieldError :errors="[errors.lastName]" />
            </Field>

            <Field :data-invalid="!!errors.locale">
              <FieldLabel for="locale">{{ t('auth.locale') }}</FieldLabel>
              <NativeSelect
                id="locale"
                name="locale"
                class="w-full"
                :model-value="page.props.locale"
                :aria-invalid="!!errors.locale"
              >
                <NativeSelectOption v-for="locale in locales" :key="locale" :value="locale">
                  {{ t(`app.locales.${locale}`) }}
                </NativeSelectOption>
              </NativeSelect>
              <FieldError :errors="[errors.locale]" />
            </Field>

            <Field :data-invalid="!!errors.timezone">
              <FieldLabel for="timezone">{{ t('auth.timezone') }}</FieldLabel>
              <TimezoneSelect
                id="timezone"
                v-model="timezone"
                name="timezone"
                :timezones="props.timezones"
                :invalid="!!errors.timezone"
              />
              <FieldDescription>{{ t('auth.timezone_hint') }}</FieldDescription>
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
              <FieldError :errors="[errors.timezone]" />
            </Field>

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

            <Field :data-invalid="!!errors.password">
              <FieldLabel for="password">{{ t('profile.password.new') }}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                :aria-invalid="!!errors.password"
              />
              <FieldDescription>{{ t('auth.password_hint') }}</FieldDescription>
              <FieldError :errors="[errors.password]" />
            </Field>

            <Field :data-invalid="!!errors.passwordConfirmation">
              <FieldLabel for="passwordConfirmation">
                {{ t('auth.password_confirmation') }}
              </FieldLabel>
              <Input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autocomplete="new-password"
                required
                :aria-invalid="!!errors.passwordConfirmation"
              />
              <FieldError :errors="[errors.passwordConfirmation]" />
            </Field>

            <Button type="submit" :disabled="processing">
              {{ t('profile.password.submit') }}
            </Button>
          </FieldGroup>
        </Form>
      </CardContent>
    </Card>
  </div>
</template>
