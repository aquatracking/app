<script setup lang="ts">
import { Check, MailPlus, Trash } from 'lucide-vue-next'
import InviteUserDialog from '~/components/dialogs/InviteUserDialog.vue'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import LocaleTimeAgo from '~/components/LocaleTimeAgo.vue'
import PageContent from '~/components/PageContent.vue'
import TitleBar from '~/components/TitleBar.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import NavigationLayout from '~/layouts/NavigationLayout.vue'
import { UserDto } from '../../../../app/dto/user_dto'
import { UserInvitationDto } from '../../../../app/dto/user_invitation_dto'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { router } from '@inertiajs/vue3'
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

defineProps<{
  users: UserDto[]
  invitations: UserInvitationDto[]
}>()

function deleteInvitation(id: string) {
  router.delete(`/admin/invitations/${id}`)
}

function renewInvitation(email: string) {
  router.post(`/admin/invitations`, { email })
}
</script>

<template>
  <NavigationLayout :title="$t('pages.home.title')">
    <PageContent>
      <TitleBar
        :title="$t('pages.admin.users.title')"
        :breadcrumb="[
          { label: $t('pages.home.title'), href: '/' },
          { label: $t('pages.admin.users.title'), href: '/admin/users' },
        ]"
      >
        <template #cta>
          <InviteUserDialog>
            <Button variant="secondary">
              <MailPlus class="w-4 h-4 mr-2" />
              {{ $t('pages.admin.users.invite.title') }}
            </Button>
          </InviteUserDialog>
        </template>
      </TitleBar>

      <ErrorAndNotificationDisplay />

      <Tabs default-value="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            {{ $t('pages.admin.users.tabs.accounts') }}
          </TabsTrigger>
          <TabsTrigger value="invitations">
            {{ $t('pages.admin.users.tabs.invitations') }}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {{ $t('fields.email') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.fullName') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.admin') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.status') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.createdAt') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.updatedAt') }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="user in users" :key="user.id">
                <TableCell class="font-medium">
                  {{ user.email }}
                </TableCell>
                <TableCell>{{ user.fullName }}</TableCell>
                <TableCell>
                  <Check v-if="user.isAdmin" class="w-4 h-4 text-primary" />
                </TableCell>
                <TableCell>
                  <Badge :variant="user.verified ? 'default' : 'destructive'">
                    {{ user.verified ? $t('auth.status.verified') : $t('auth.status.notVerified') }}
                  </Badge>
                </TableCell>
                <TableCell> {{ $d(user.createdAt) }}</TableCell>
                <TableCell> {{ $d(user.updatedAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="invitations">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {{ $t('fields.email') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.status') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.expiresAt') }}
                </TableHead>
                <TableHead>
                  {{ $t('fields.createdAt') }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="invitation in invitations" :key="invitation.id">
                <TableCell class="font-medium">
                  {{ invitation.email }}
                </TableCell>

                <TableCell>
                  {{}}
                  <Badge v-if="new Date(invitation.expiresAt) > new Date()">
                    {{ $t('auth.status.invitationPending') }}
                  </Badge>
                  <Badge variant="destructive" v-else>
                    {{ $t('auth.status.invitationExpired') }}
                  </Badge>
                </TableCell>
                <TableCell>
                  {{ $d(invitation.expiresAt) }}
                  (<LocaleTimeAgo :date="invitation.expiresAt" />)
                </TableCell>
                <TableCell> {{ $d(invitation.createdAt) }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex space-x-2 justify-end">
                    <Button
                      variant="secondary"
                      size="xs"
                      @click="renewInvitation(invitation.email)"
                    >
                      <MailPlus class="w-4 h-4 mr-2" />
                      {{ $t('pages.admin.users.invite.renew') }}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button variant="destructive" size="xs">
                          <Trash class="w-4 h-4 mr-2" />
                          {{ $t('pages.admin.users.invite.cancel') }}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {{ $t('dialogs.deleteInvitation.title') }}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {{
                              $t('dialogs.deleteInvitation.message', {
                                email: invitation.email,
                              })
                            }}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {{ $t('dialogs.deleteInvitation.reject') }}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            @click="deleteInvitation(invitation.id)"
                          >
                            {{ $t('dialogs.deleteInvitation.accept') }}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </PageContent>
  </NavigationLayout>
</template>
