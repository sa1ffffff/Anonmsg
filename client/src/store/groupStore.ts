import { create } from 'zustand';
import { apiFetch } from '../lib/api';

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
  fetchGroups: (token: string) => Promise<void>;
  createGroup: (token: string, payload: { name: string; description?: string }) => Promise<Group>;
  joinGroup: (token: string, inviteCode: string) => Promise<Group>;
  fetchGroup: (token: string, groupId: string) => Promise<Group>;
  fetchGroupPreview: (inviteCode: string) => Promise<GroupPreview>;
}

export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],
  loading: false,
  fetchGroups: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch<Group[]>('/api/groups', token);
      set({ groups: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  createGroup: async (token, payload) => {
    const data = await apiFetch<Group>('/api/groups', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    set((state) => ({ groups: [data, ...state.groups] }));
    return data;
  },
  joinGroup: async (token, inviteCode) => {
    const data = await apiFetch<{ group: Group }>(`/api/groups/join/${inviteCode}`, token, {
      method: 'POST',
    });
    set((state) => {
      const exists = state.groups.find((g) => g.id === data.group.id);
      return { groups: exists ? state.groups : [data.group, ...state.groups] };
    });
    return data.group;
  },
  fetchGroup: async (token, groupId) => {
    return apiFetch<Group>(`/api/groups/${groupId}`, token);
  },
  fetchGroupPreview: async (inviteCode) => {
    return apiFetch<GroupPreview>(`/api/groups/invite/${inviteCode}`);
  },
}));
