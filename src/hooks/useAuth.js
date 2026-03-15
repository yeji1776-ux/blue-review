import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    return { data, error };
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  };

  const resetPasswordForEmail = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    return { error };
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return { data, error };
  };

  const deleteAccount = async () => {
    // Supabase에 delete_user RPC 함수가 있으면 사용, 없으면 로그아웃만
    try {
      await supabase.rpc('delete_user');
    } catch (_) { /* RPC 미설정 시 무시 */ }
    // 로컬 데이터 초기화
    ['blogger_profile', 'blogger_templates', 'blogSchedules', 'blogger_saved_texts',
      'blogger_hashtags', 'blogger_font_size', 'theme_color', 'rememberMe',
      'biometric_enabled', 'biometric_cred_id'].forEach(k => localStorage.removeItem(k));
    await supabase.auth.signOut();
    return {};
  };

  return {
    user,
    loading,
    signInWithProvider,
    signUpWithEmail,
    verifyOtp,
    signInWithEmail,
    signOut,
    updatePassword,
    resetPasswordForEmail,
    refreshSession,
    deleteAccount,
  };
}
