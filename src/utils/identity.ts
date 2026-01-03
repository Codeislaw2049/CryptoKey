const STORAGE_KEY_USER_ID = 'app_user_id';
const STORAGE_KEY_INVITER_ID = 'app_inviter_id';

export interface UserIdentity {
  userId: string;
  inviteCode: string;
  inviterId?: string;
}

export const getIdentity = (): UserIdentity => {
  let userId = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (!userId) {
    // Use native crypto.randomUUID() if available, or fallback to a simple random string
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      userId = crypto.randomUUID();
    } else {
      userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
  }

  const inviterId = localStorage.getItem(STORAGE_KEY_INVITER_ID) || undefined;
  
  // Simple invite code generation (first 8 chars of uuid)
  const inviteCode = userId.slice(0, 8).toUpperCase();

  return {
    userId,
    inviteCode,
    inviterId
  };
};

export const setInviter = (code: string): boolean => {
  // Prevent self-referral
  const { inviteCode } = getIdentity();
  if (code === inviteCode) {
    return false;
  }
  
  // Verify code format (simple check)
  if (!code || code.length !== 8) {
    return false;
  }

  // In a real offline app, we can't verify if the code really belongs to someone else 
  // without a list of valid codes, but we can store it.
  localStorage.setItem(STORAGE_KEY_INVITER_ID, code);
  return true;
};
