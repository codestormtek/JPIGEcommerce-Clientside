import { getSecureItem, setSecureItem, deleteSecureItem } from './secureStorage';
import { StaffPushTokenRequestRolePreference } from '@workspace/api-client-react';

const TOKEN_ID_KEY = 'jiggling_pig_push_token_id';
const ROLE_PREF_KEY = 'jiggling_pig_push_preference';

export const getPushTokenId = () => getSecureItem(TOKEN_ID_KEY);
export const getPushPreference = async () => (await getSecureItem(ROLE_PREF_KEY)) as StaffPushTokenRequestRolePreference | null;

export const clearPushStorage = async () => {
  await deleteSecureItem(TOKEN_ID_KEY);
  await deleteSecureItem(ROLE_PREF_KEY);
};

export const setPushStorage = async (tokenId: string, preference: StaffPushTokenRequestRolePreference) => {
  await setSecureItem(TOKEN_ID_KEY, tokenId);
  await setSecureItem(ROLE_PREF_KEY, preference);
};
