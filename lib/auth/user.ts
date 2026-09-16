// Application identity. Passwords and provider tokens never cross this shape.
export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }>;
};
