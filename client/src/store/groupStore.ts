import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { useAuthStore } from './authStore';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code?: string;
  member_count?: number;
  created_by?: string;
}

export interface GroupPreview {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  member_avatars: { id: string; avatar_url: string | null; username: string }[];
}

interface GroupStore {
  groups: Group[];
  loading: boolean;
  fetchGroups: () => Promise<void>;
  createGroup: (payload: { name: string; description?: string }) => Promise<Group>;
  joinGroup: (inviteCode: string) => Promise<Group>;
  fetchGroup: (groupId: string) => Promise<Group>;
  fetchGroupPreview: (inviteCode: string) => Promise<GroupPreview>;
}

function getToken(): string | null {
  return useAuthStore.getState().token;
}

export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],
  loading: false,
  fetchGroups: async () => {
    set({ loading: true });
    try {
      const groups = await apiFetch<Group[]>('/api/groups', getToken());
      set({ groups: groups ?? [], loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  createGroup: async (payload) => {
    const group = await apiFetch<Group>('/api/groups', getToken(), {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    set((state) => ({ groups: [group, ...state.groups] }));
    return group;
  },
  joinGroup: async (inviteCode) => {
    const result = await apiFetch<{ message: string; group: Group }>(
      `/api/groups/join/${inviteCode}`,
      getToken(),
      { method: 'POST' },
    );
    const group = result.group;

    set((state) => {
      const exists = state.groups.find((g) => g.id === group.id);
      return { groups: exists ? state.groups : [group, ...state.groups] };
    });
    return group;
  },
  fetchGroup: async (groupId) => {
    const group = await apiFetch<Group>(`/api/groups/${groupId}`, getToken());
    return group;
  },
  fetchGroupPreview: async (inviteCode) => {
    const preview = await apiFetch<GroupPreview>(
      `/api/groups/invite/${inviteCode}`,
      getToken(),
    );
    return preview;
  },
}));
