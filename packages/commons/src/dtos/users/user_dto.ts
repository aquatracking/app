export type UserDto = {
  id: string;
  fullName: string | null;
  email: string;
  verified: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string | null;
};
