export interface PasswordItem {
  id: string;
  title: string;
  ciphertext: string;
  hash: string;
  realRowIndex: number;
  createdAt: number;
  category?: string;
}

const STORAGE_KEY = 'cryptokey_passwords';

export const savePassword = (item: Omit<PasswordItem, 'id' | 'createdAt'>): PasswordItem => {
  const passwords = getPasswords();
  const newItem: PasswordItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  passwords.unshift(newItem); // Add to top
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
  return newItem;
};

export const getPasswords = (): PasswordItem[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse passwords', e);
    return [];
  }
};

export const deletePassword = (id: string): void => {
  const passwords = getPasswords().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
};

export const updatePassword = (id: string, updates: Partial<Omit<PasswordItem, 'id' | 'createdAt'>>): PasswordItem | null => {
  const passwords = getPasswords();
  const index = passwords.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updatedItem = { ...passwords[index], ...updates };
  passwords[index] = updatedItem;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
  return updatedItem;
};
