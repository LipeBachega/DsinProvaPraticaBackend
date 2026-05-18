import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  // A senha nunca e armazenada em texto puro no banco.
  return argon2.hash(password);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  // Na autenticacao, comparamos a senha digitada com o hash persistido.
  return argon2.verify(hash, password);
}
