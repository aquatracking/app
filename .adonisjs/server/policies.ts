export const policies = {
  InvitationPolicy: () => import('#policies/invitation_policy'),
  UserPolicy: () => import('#policies/user_policy'),
  VivariumPolicy: () => import('#policies/vivarium_policy'),
}

