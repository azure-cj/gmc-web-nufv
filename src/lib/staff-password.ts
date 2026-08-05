import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export async function hashStaffPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyStaffPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
