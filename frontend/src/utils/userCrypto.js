/**
 * Стабильная соль для разблокировки crypto vault (см. бэкенд: userId не меняется при смене username).
 */
export function userCryptoSalt(user) {
  if (!user) return 'default-salt';
  return user.userId || user.username || 'default-salt';
}
