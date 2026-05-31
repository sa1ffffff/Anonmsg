import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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

export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],
  loading: false,
  fetchGroups: async () => {
    set({ loading: true });
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('group_members')
        .select('group:groups(id, name, description, invite_code, created_by), joined_at')
        .eq('user_id', userData.user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const groups =
        data
          ?.map((row) => row.group)
          .filter((group): group is Group => Boolean(group)) ?? [];
      set({ groups, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  createGroup: async (payload) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not signed in');

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        created_by: userData.user.id,
      })
      .select('id, name, description, invite_code, created_by')
      .single();

    if (groupError || !group) throw groupError ?? new Error('Failed to create group');

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: userData.user.id });

    if (memberError) throw memberError;

    set((state) => ({ groups: [group, ...state.groups] }));
    return group;
  },
  joinGroup: async (inviteCode) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not signed in');

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, description, invite_code, created_by')
      .eq('invite_code', inviteCode)
      .single();

    if (groupError || !group) throw groupError ?? new Error('Invalid invite code');

    const { error: memberError } = await supabase
      .from('group_members')
      .upsert({ group_id: group.id, user_id: userData.user.id }, { onConflict: 'group_id,user_id' });

    if (memberError) throw memberError;

    set((state) => {
      const exists = state.groups.find((g) => g.id === group.id);
      return { groups: exists ? state.groups : [group, ...state.groups] };
    });
    return group;
  },
  fetchGroup: async (groupId) => {
    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name, description, invite_code, created_by')
      .eq('id', groupId)
      .single();

    if (error || !group) throw error ?? new Error('Group not found');

    const { count, error: countError } = await supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (countError) throw countError;

    return { ...group, member_count: count ?? 0 };
  },
  fetchGroupPreview: async (inviteCode) => {
    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name, description')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !group) throw error ?? new Error('Invalid invite code');

    const { data: members, error: memberError } = await supabase
      .from('group_members')
      .select('user_id, profiles(id, username, avatar_url)')
      .eq('group_id', group.id);

    if (memberError) throw memberError;

    const member_avatars =
      members
        ?.map((row) =>
          Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
        )
        .filter(Boolean)
        .map((profile) => ({
          id: profile!.id,
          username: profile!.username,
          avatar_url: profile!.avatar_url,
        })) ?? [];

    return {
      ...group,
      member_count: member_avatars.length,
      member_avatars,
    };
  },
}));
