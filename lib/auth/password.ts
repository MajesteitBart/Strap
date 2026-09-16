import { compare } from "bcryptjs";
import { hashPassword, verifyPassword } from "better-auth/crypto";

export const isLegacyPasswordHash = (hash: string) => /^\$2[aby]\$\d{2}\$/.test(hash);

export const password = {
  hash: hashPassword,
  async verify(input: { hash: string; password: string }) {
    if (isLegacyPasswordHash(input.hash)) {
      return compare(input.password, input.hash.replace(/^\$2y\$/, "$2b$"));
    }
    return verifyPassword(input);
  },
};
