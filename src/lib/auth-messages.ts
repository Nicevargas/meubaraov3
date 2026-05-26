export function translateAuthError(error: unknown, fallback = "Ocorreu um erro de autenticação. Tente novamente."): string {
  if (!error) return fallback;

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : String(error);

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials") || normalized.includes("invalid email or password") || normalized.includes("invalid login") || normalized.includes("invalid password") || normalized.includes("wrong password")) {
    return "Email ou senha incorretos.";
  }

  if (normalized.includes("invalid email")) {
    return "Email inválido.";
  }

  if (normalized.includes("missing password") || normalized.includes("password missing") || normalized.includes("password is required")) {
    return "Informe sua senha.";
  }

  if (normalized.includes("password should be at least") || normalized.includes("must be at least") || normalized.includes("password must be at least") || normalized.includes("senha deve ter")) {
    return "A senha precisa ter no mínimo 6 caracteres.";
  }

  if (normalized.includes("user not found") || normalized.includes("no user") || normalized.includes("not found")) {
    return "Usuário não encontrado.";
  }

  if (normalized.includes("already registered") || normalized.includes("duplicate email") || normalized.includes("email already exists") || normalized.includes("email already registered")) {
    return "Este email já está em uso.";
  }

  if (normalized.includes("token is invalid") || normalized.includes("invalid token") || normalized.includes("token inválido")) {
    return "O link é inválido ou expirou.";
  }

  if (normalized.includes("expired") || normalized.includes("token expired") || normalized.includes("link expired")) {
    return "O link expirou. Solicite um novo.";
  }

  if (normalized.includes("email not confirmed") || normalized.includes("confirmation")) {
    return "Email não confirmado. Verifique sua caixa de entrada.";
  }

  if (normalized.includes("access denied") || normalized.includes("not authorized") || normalized.includes("not authorized")) {
    return "Acesso negado.";
  }

  if (normalized.includes("network request failed") || normalized.includes("network error") || normalized.includes("failed to fetch")) {
    return "Falha na conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}
