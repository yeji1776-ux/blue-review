import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import {
  Calendar, Clock, MapPin, Phone, Copy, Plus, LogOut,
  ClipboardList, ExternalLink, Calculator, BarChart3,
  CheckCircle2, Globe, Map as MapIcon, DollarSign, Sun, Star, X, Check,
  ChevronRight, Hash, Eye, Heart, Type, Gift, AlertTriangle, CalendarDays,
  Download, ChevronLeft, User, Save, Instagram, Pencil, Cloud, CloudRain, CloudSun, Snowflake,
  Wallet, PenTool, Youtube, Mail, Settings, Trash2, FileText, MessageCircle, Upload
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import { supabase } from './lib/supabase';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STORAGE_KEYS } from './constants/storageKeys'
import { AppErrorBoundary } from './components/ui/ErrorBoundary'
import { PLAN_LIMITS, PLAN_META } from './constants/plans'
import { ADMIN_EMAILS } from './constants/admin'
import { parseWithSchema } from './lib/parseWithSchema'
import { profileSchema } from './features/profile/schemas'
import { templatesSchema, ftcTemplatesSchema } from './features/template/schemas'
import { schedulesSchema, geminiParsedSchema } from './features/schedule/schemas'
import { gcalSelectedSchema } from './features/calendar/schemas'
import { hashtagsSchema, savedTextsSchema } from './features/settings/schemas'

const SortableTemplateItem = ({ t, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2">
      <div {...attributes} {...listeners} className="p-2 text-slate-300 cursor-grab active:cursor-grabbing touch-none shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </div>
      <button onClick={() => onEdit(t.id)} className="flex-1 text-left px-4 py-3 rounded-xl bg-sky-50/50 active:bg-sky-100 transition-all min-w-0">
        <p className="text-sm font-bold text-slate-600 truncate">{t.title}</p>
        {t.content && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{t.content}</p>}
      </button>
    </div>
  );
};

const SortableHomeTemplateButton = ({ t, colorClass, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-1">
      <div {...attributes} {...listeners} className="text-slate-300 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 px-0.5 py-2">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/>
          <circle cx="2" cy="7" r="1.5"/><circle cx="6" cy="7" r="1.5"/>
          <circle cx="2" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/>
        </svg>
      </div>
      <button onClick={() => onEdit(t.id)}
        className={`flex-1 text-left px-3 py-2 rounded-xl text-xs font-bold border active:scale-95 transition-all truncate ${colorClass}`}>
        {t.title}
      </button>
    </div>
  );
};

const AdminSubscriptionControl = ({ u, onSet }) => {
  const [plan, setPlan] = useState(u.plan || 'free');
  const [months, setMonths] = useState('1');
  const [done, setDone] = useState(false);
  const handleApply = async () => {
    await onSet(u.user_id, plan, months);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 pt-1">
      <select value={plan} onChange={e => setPlan(e.target.value)}
        className={`flex-1 text-xs font-black px-2.5 py-2 rounded-xl border outline-none cursor-pointer ${plan === 'pro' ? 'bg-amber-50 border-amber-200 text-amber-600' : plan === 'standard' ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
        <option value="free">무료</option>
        <option value="standard">스탠다드</option>
        <option value="pro">프로</option>
      </select>
      <select value={months} onChange={e => setMonths(e.target.value)}
        className="text-xs font-bold px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 outline-none cursor-pointer">
        <option value="1">1개월</option>
        <option value="3">3개월</option>
        <option value="6">6개월</option>
        <option value="12">12개월</option>
      </select>
      <button onClick={handleApply}
        className={`shrink-0 text-xs font-black px-3 py-2 rounded-xl transition-all active:scale-95 ${done ? 'bg-green-500 text-white' : 'bg-sky-500 text-white'}`}>
        {done ? '완료!' : '적용'}
      </button>
    </div>
  );
};

const PasswordResetScreen = ({ onUpdate, email }) => {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (pw.length < 6) return setMsg({ text: '비밀번호는 6자 이상이어야 합니다.', type: 'error' });
    if (pw !== pw2) return setMsg({ text: '비밀번호가 일치하지 않아요.', type: 'error' });
    setLoading(true);
    const { error } = await onUpdate(pw);
    setLoading(false);
    if (error) setMsg({ text: error.message || '오류가 발생했습니다.', type: 'error' });
    else setMsg({ text: '비밀번호가 변경되었습니다!', type: 'success' });
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="ambient-blob bg-sky-300 w-96 h-96 top-[-10%] left-[-10%]"></div>
      <div className="ambient-blob bg-pink-200 w-80 h-80 bottom-[-10%] right-[-10%] [animation-delay:2s]"></div>
      <div className="max-w-sm w-full jelly-card shadow-2xl p-10 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800">새 비밀번호 설정</h2>
          {email && <p className="text-xs font-bold text-sky-500 mt-1 bg-sky-50 px-3 py-1.5 rounded-xl">{email}</p>}
          <p className="text-xs text-slate-500 mt-1">안전한 비밀번호로 변경해주세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="새 비밀번호 (6자 이상)" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
            className="w-full px-5 py-4 rounded-2xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm font-bold transition-all placeholder:font-medium placeholder:text-slate-500" />
          <input type="password" placeholder="비밀번호 확인" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password"
            className="w-full px-5 py-4 rounded-2xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm font-bold transition-all placeholder:font-medium placeholder:text-slate-500" />
          {msg.text && (
            <p className={`text-xs font-bold text-center py-3 rounded-2xl ${msg.type === 'error' ? 'text-rose-500 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>{msg.text}</p>
          )}
          <button disabled={loading} className="w-full jelly-button py-4 rounded-2xl font-black text-base shadow-xl shadow-sky-200/50 disabled:opacity-60">
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
};

const BiometricLockScreen = ({ onUnlock, onSkip }) => {
  const [error, setError] = useState('');
  const [trying, setTrying] = useState(false);

  const attempt = async () => {
    setError('');
    setTrying(true);
    try {
      await onUnlock();
    } catch {
      setError('인증에 실패했습니다. 다시 시도해주세요.');
    }
    setTrying(false);
  };

  useEffect(() => { attempt(); }, []);

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="ambient-blob bg-sky-300 w-96 h-96 top-[-10%] left-[-10%]"></div>
      <div className="ambient-blob bg-pink-200 w-80 h-80 bottom-[-10%] right-[-10%] [animation-delay:2s]"></div>
      <div className="max-w-sm w-full jelly-card shadow-2xl p-10 flex flex-col items-center gap-6">
        <div className="w-[100px] h-[100px]">
          <img src="/favicon.png" alt="Blue Review" className="w-full h-full object-contain filter drop-shadow-lg drop-shadow-sky-300" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-1">Blue <span className="text-sky-500">Review</span></h1>
          <p className="text-xs text-slate-500">생체 인증으로 잠금을 해제하세요</p>
        </div>

        {/* 얼굴/지문 아이콘 버튼 */}
        <button
          onClick={attempt}
          disabled={trying}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-xl shadow-sky-200 active:scale-95 transition-all disabled:opacity-60"
        >
          {trying ? (
            <div className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
              <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.5-.82 2.81-2.04 3.5"/>
              <path d="M12 8v1M8.46 9.46l.7.7M15.54 9.46l-.7.7M7 12h1M16 12h1"/>
              <circle cx="12" cy="14" r="1.5" fill="white" stroke="none"/>
            </svg>
          )}
        </button>

        <p className="text-sm font-bold text-slate-500">
          {trying ? '인증 중...' : '버튼을 눌러 얼굴 / 지문 인증'}
        </p>

        {error && (
          <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 px-4 rounded-2xl w-full">{error}</p>
        )}

        <button
          onClick={onSkip}
          className="text-xs font-bold text-slate-500 underline underline-offset-2 hover:text-slate-600 transition-colors"
        >
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
};

const BloggerMasterApp = () => {
  // --- 인증 ---
  const { user, loading, isRecovery, setIsRecovery, signInWithProvider, signUpWithEmail, verifyOtp, signInWithEmail, signOut, updatePassword, resetPasswordForEmail, refreshSession, deleteAccount } = useAuth();
  const [authError, setAuthError] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // 탭 전환 시 최상단 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // 자동 로그인 해제: 탭 닫을 때 세션 제거
  useEffect(() => {
    if (!loading && user && sessionStorage.getItem('noRemember') === '1') {
      signOut();
    }
  }, [loading, user]);

  // --- 생체 인증 ---
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('biometric_enabled') === '1');
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then(ok => setBiometricSupported(ok))
        .catch(() => setBiometricSupported(false));
    }
  }, []);

  useEffect(() => {
    if (!loading && user && biometricEnabled && !sessionStorage.getItem('biometricUnlocked')) {
      setBiometricLocked(true);
    }
  }, [loading, user, biometricEnabled]);

  const handleBiometricUnlock = async () => {
    try {
      const credIdStr = localStorage.getItem('biometric_cred_id');
      if (!credIdStr) { setBiometricLocked(false); return; }
      const credId = Uint8Array.from(atob(credIdStr), c => c.charCodeAt(0));
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      sessionStorage.setItem('biometricUnlocked', '1');
      setBiometricLocked(false);
    } catch (e) {
      // 자격증명이 없거나 기기/도메인 변경 → stale 데이터 정리 후 잠금 해제
      localStorage.removeItem('biometric_cred_id');
      localStorage.removeItem('biometric_enabled');
      setBiometricEnabled(false);
      setBiometricLocked(false);
    }
  };

  const handleBiometricRegister = async () => {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Blue Review', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email,
            displayName: profile.nickname || user.email,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      });
      const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem('biometric_cred_id', rawIdBase64);
      localStorage.setItem('biometric_enabled', '1');
      setBiometricEnabled(true);
    } catch (e) {
      if (e.name !== 'NotAllowedError') alert('생체 인증 등록에 실패했습니다. 기기가 지원하는지 확인해주세요.');
    }
  };

  const handleBiometricDisable = () => {
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_cred_id');
    setBiometricEnabled(false);
  };

  // --- 날씨 ---
  const [weather, setWeather] = useState({ temp: '', desc: '', icon: 'sun', score: 95, tip: '채광이 완벽해요! 오늘 맛집 사진 최고입니다.', location: '서울' });
  const [locationPopup, setLocationPopup] = useState(false);

  const fetchWeather = (loc, locationName) => {
    fetch(`https://wttr.in/${loc}?format=j1`)
      .then(r => r.json())
      .then(data => {
        const cur = data.current_condition?.[0];
        if (!cur) return;
        const code = parseInt(cur.weatherCode);
        const temp = cur.temp_C;
        const cloud = parseInt(cur.cloudcover);
        const humidity = parseInt(cur.humidity);
        let score = Math.max(20, 100 - cloud);
        let tip, icon;
        if (code === 113) { icon = 'sun'; tip = '채광이 완벽해요! 맛집 사진 찍기 최고의 날!'; }
        else if (code <= 122) { icon = 'cloud-sun'; tip = '구름 살짝! 부드러운 자연광으로 촬영하세요.'; score = Math.max(60, score); }
        else if (code <= 200) { icon = 'cloud'; tip = '흐린 날이지만 실내 촬영은 괜찮아요!'; score = Math.max(40, score); }
        else if (code <= 399) { icon = 'rain'; tip = '비 오는 날, 아늑한 카페 촬영 추천!'; score = Math.max(30, score); }
        else { icon = 'snow'; tip = '눈 오는 감성! 따뜻한 음식 촬영 추천!'; score = Math.max(35, score); }
        if (humidity > 80) tip += ' 습도 높아요, 렌즈 김서림 주의!';
        const name = locationName || data.nearest_area?.[0]?.areaName?.[0]?.value || '서울';
        setWeather({ temp, desc: cur.weatherDesc?.[0]?.value || '', icon, score, tip, location: name });
      })
      .catch(() => { });
  };

  const requestLocation = (mode) => {
    if (mode === 'always') localStorage.setItem('location_perm', 'always');
    if (mode === 'session') sessionStorage.setItem('location_perm', 'session');
    setLocationPopup(false);
    if (mode === 'deny') return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ko`)
          .then(r => r.json())
          .then(geo => {
            const addr = geo.address || {};
            const locName = [addr.city || addr.state || '', addr.borough || addr.suburb || addr.county || ''].filter(Boolean).join(' ') || '현재 위치';
            fetchWeather(`${latitude},${longitude}`, locName);
          })
          .catch(() => fetchWeather(`${latitude},${longitude}`));
      },
      () => { }
    );
  };

  useEffect(() => {
    const alwaysPerm = localStorage.getItem('location_perm');
    const sessionPerm = sessionStorage.getItem('location_perm');
    if (alwaysPerm === 'always' || sessionPerm === 'session') {
      requestLocation(alwaysPerm || sessionPerm);
    } else {
      fetchWeather('Seoul', '서울');
    }
  }, []);

  // --- 프로필 ---
  const [profile, setProfile] = useState(() => {
    const defaults = {
      nickname: '',
      blogUrl: '',
      blogClipUrl: '',
      blogClipId: '',
      instaId: '',
      reelsUrl: '',
      facebookUrl: '',
      youtubeUrl: '',
      phone: '',
      email: '',
      enabledPlatforms: { blogUrl: true, blogClipUrl: false, instaId: true, reelsUrl: false, facebookUrl: false, youtubeUrl: false, email: false },
    };
    const parsed = parseWithSchema(profileSchema, localStorage.getItem(STORAGE_KEYS.PROFILE), null);
    if (!parsed) return defaults;
    // 기존 저장 데이터에 enabledPlatforms 없으면 기본값 병합
    if (!parsed.enabledPlatforms) parsed.enabledPlatforms = defaults.enabledPlatforms;
    // 신규 필드 병합
    if (parsed.enabledPlatforms.blogClipUrl === undefined) parsed.enabledPlatforms.blogClipUrl = false;
    if (!parsed.blogClipUrl) parsed.blogClipUrl = '';
    return parsed;
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState('platform'); // 'basic' | 'platform'
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  const saveProfile = () => {
    localStorage.setItem('blogger_profile', JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const updateProfile = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  // --- 협찬 신청 문구 템플릿 ---
  const [templates, setTemplates] = useState(() => {
    const defaults = [
      { id: 1, title: '기본 신청 문구', content: '안녕하세요! 블로그 체험단 신청합니다.\n일일 방문자 수: \n블로그 주소: \n인스타그램: \n정성스럽게 리뷰하겠습니다!' },
    ];
    return parseWithSchema(templatesSchema, localStorage.getItem(STORAGE_KEYS.TEMPLATES), defaults);
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const saveTemplates = (updated) => {
    setTemplates(updated);
    localStorage.setItem('blogger_templates', JSON.stringify(updated));
  };

  const addTemplate = () => {
    if (templates.length >= PLAN_LIMITS.template[userPlan]) {
      setUpgradeReason('template');
      setShowUpgradeModal(true);
      return;
    }
    const newT = { id: Date.now(), title: '새 문구', content: '' };
    saveTemplates([...templates, newT]);
    setEditingTemplateId(newT.id);
  };

  const updateTemplate = (id, field, value) => {
    saveTemplates(templates.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteTemplate = (id) => {
    saveTemplates(templates.filter(t => t.id !== id));
    if (editingTemplateId === id) setEditingTemplateId(null);
  };

  const closeTemplateModal = () => {
    const t = templates.find(x => x.id === editingTemplateId);
    if (t && !t.content.trim() && t.title === '새 문구') {
      deleteTemplate(t.id);
    } else {
      setEditingTemplateId(null);

    }
  };

  // --- 공정위 문구 템플릿 ---
  const [ftcTemplates, setFtcTemplates] = useState(() => {
    const defaults = [
      { id: 1, title: '기본 공정위 문구', content: '본 포스팅은 업체로부터 제품/서비스를 무상으로 제공받아 작성된 솔직한 리뷰입니다.' },
    ];
    return parseWithSchema(ftcTemplatesSchema, localStorage.getItem(STORAGE_KEYS.FTC_TEMPLATES), defaults);
  });
  const [editingFtcTemplateId, setEditingFtcTemplateId] = useState(null);

  const saveFtcTemplates = (updated) => {
    setFtcTemplates(updated);
    localStorage.setItem('blogger_ftc_templates', JSON.stringify(updated));
  };
  const addFtcTemplate = () => {
    const newT = { id: Date.now(), title: '새 공정위 문구', content: '' };
    saveFtcTemplates([...ftcTemplates, newT]);
    setEditingFtcTemplateId(newT.id);
  };
  const updateFtcTemplate = (id, field, value) => {
    saveFtcTemplates(ftcTemplates.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const deleteFtcTemplate = (id) => {
    saveFtcTemplates(ftcTemplates.filter(t => t.id !== id));
    if (editingFtcTemplateId === id) setEditingFtcTemplateId(null);
  };
  const closeFtcTemplateModal = () => {
    const t = ftcTemplates.find(x => x.id === editingFtcTemplateId);
    if (t && !t.content.trim() && t.title === '새 공정위 문구') deleteFtcTemplate(t.id);
    else setEditingFtcTemplateId(null);
  };

  // --- 해시태그 모음 ---
  const [hashtags, setHashtags] = useState(() => {
    const defaults = {
      '맛집': ['#맛집추천', '#맛집탐방', '#먹스타그램', '#맛스타그램', '#푸드스타그램', '#맛집리뷰', '#오늘뭐먹지', '#맛집블로거'],
      '뷰티': ['#뷰티블로거', '#뷰티리뷰', '#화장품추천', '#스킨케어', '#데일리메이크업', '#뷰티스타그램'],
      '카페': ['#카페추천', '#카페스타그램', '#카페투어', '#디저트맛집', '#브런치카페', '#감성카페'],
      '숙박': ['#호텔추천', '#숙소추천', '#여행숙소', '#호캉스', '#펜션추천', '#숙박리뷰'],
      '체험': ['#체험단', '#협찬', '#블로거체험단', '#리뷰어', '#체험단모집', '#인플루언서'],
    };
    return parseWithSchema(hashtagsSchema, localStorage.getItem(STORAGE_KEYS.HASHTAGS), defaults);
  });
  const [editingHashtagCat, setEditingHashtagCat] = useState(null);
  const [newHashtag, setNewHashtag] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [renamingCat, setRenamingCat] = useState(null);
  const [renameCatValue, setRenameCatValue] = useState('');
  const [toolSubTab, setToolSubTab] = useState(null); // null | 'count' | 'savedTexts' | 'hashtags'

  const saveHashtags = (updated) => {
    setHashtags(updated);
    localStorage.setItem('blogger_hashtags', JSON.stringify(updated));
  };

  // --- 글씨 크기 ---
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('blogger_font_size');
    if (saved) return parseInt(saved);
    return window.innerWidth >= 640 ? 22 : 18; // 모바일 기본 +2
  });

  // --- 테마 색상 ---
  const COLOR_THEMES = {
    sky:    { label: '스카이', hex: '#38bdf8', palette: null },
    blue:   { label: '블루', hex: '#3b82f6', palette: { 50:'oklch(0.970 0.014 237.32)',100:'oklch(0.932 0.032 254.59)',200:'oklch(0.882 0.059 254.13)',300:'oklch(0.809 0.105 251.81)',400:'oklch(0.707 0.165 254.62)',500:'oklch(0.623 0.214 259.82)',600:'oklch(0.546 0.245 262.88)',700:'oklch(0.488 0.243 264.38)' } },
    indigo: { label: '인디고', hex: '#6366f1', palette: { 50:'oklch(0.962 0.018 272.31)',100:'oklch(0.930 0.034 272.79)',200:'oklch(0.870 0.065 274.04)',300:'oklch(0.785 0.115 274.71)',400:'oklch(0.673 0.182 276.94)',500:'oklch(0.585 0.233 277.12)',600:'oklch(0.511 0.262 276.97)',700:'oklch(0.457 0.240 277.02)' } },
    cyan:   { label: '아쿠아', hex: '#06b6d4', palette: { 50:'oklch(0.984 0.019 200.87)',100:'oklch(0.956 0.045 203.39)',200:'oklch(0.917 0.080 205.04)',300:'oklch(0.865 0.127 207.08)',400:'oklch(0.789 0.154 211.53)',500:'oklch(0.715 0.143 215.22)',600:'oklch(0.609 0.126 221.72)',700:'oklch(0.520 0.105 223.13)' } },
    navy:   { label: '네이비', hex: '#1d4ed8', palette: { 50:'oklch(0.970 0.014 237.32)',100:'oklch(0.932 0.032 254.59)',200:'oklch(0.882 0.059 254.13)',300:'oklch(0.809 0.105 251.81)',400:'oklch(0.650 0.175 255.0)',500:'oklch(0.530 0.230 262.0)',600:'oklch(0.440 0.260 265.0)',700:'oklch(0.380 0.240 268.0)' } },
  };
  const [themeColor, setThemeColor] = useState(() => {
    const saved = localStorage.getItem('theme_color');
    return (saved && ['sky','blue','indigo','cyan','navy'].includes(saved)) ? saved : 'sky';
  });
  useEffect(() => {
    const theme = COLOR_THEMES[themeColor];
    let styleEl = document.getElementById('theme-color-override');
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'theme-color-override'; document.head.appendChild(styleEl); }
    if (!theme?.palette) { styleEl.textContent = ''; }
    else { styleEl.textContent = `:root { ${Object.entries(theme.palette).map(([k,v]) => `--color-sky-${k}: ${v};`).join(' ')} }`; }
    localStorage.setItem('theme_color', themeColor);
  }, [themeColor]);

  // --- 구글 캘린더 연동 ---
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const refreshGcalToken = async () => {
    const refreshToken = localStorage.getItem('gcal_refresh_token');
    if (!refreshToken) return null;
    try {
      const res = await fetch('/api/gcal-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json();
      if (data.access_token) {
        const newExpiry = Date.now() + data.expires_in * 1000;
        localStorage.setItem('gcal_token', data.access_token);
        localStorage.setItem('gcal_token_expiry', String(newExpiry));
        return data.access_token;
      }
    } catch {}
    return null;
  };

  const [gcalToken, setGcalToken] = useState(() => {
    // 서버 콜백에서 해시로 전달된 토큰 처리
    if (window.location.hash.includes('gcal_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get('gcal_token');
      const expiry = params.get('gcal_expiry');
      const refresh = params.get('gcal_refresh');
      if (token) {
        localStorage.setItem('gcal_token', token);
        localStorage.setItem('gcal_token_expiry', expiry);
        if (refresh) localStorage.setItem('gcal_refresh_token', refresh);
        window.history.replaceState({}, document.title, window.location.pathname);
        return token;
      }
    }
    const token = localStorage.getItem('gcal_token');
    const expiry = localStorage.getItem('gcal_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) return token;
    if (localStorage.getItem('gcal_refresh_token')) return 'needs_refresh';
    return null;
  });
  const [gcalConnecting, setGcalConnecting] = useState(false);

  useEffect(() => {
    if (gcalToken === 'needs_refresh') {
      refreshGcalToken().then(newToken => {
        setGcalToken(newToken);
      });
    }
  }, [gcalToken]);

  const connectGoogleCalendar = () => {
    if (!GOOGLE_CLIENT_ID) return;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: 'https://www.blue-review.com/api/gcal-callback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const [gcalCalendars, setGcalCalendars] = useState([]);
  const [gcalSelectedCal, setGcalSelectedCal] = useState(() => {
    const savedProfile = parseWithSchema(profileSchema, localStorage.getItem(STORAGE_KEYS.PROFILE), {});
    const fromProfile = savedProfile?.gcalSelectedCal;
    // gcal_selected_cal은 평문 문자열로 저장되어 있어 직접 검증
    const rawKey = localStorage.getItem(STORAGE_KEYS.GCAL_SELECTED_CAL);
    const fromKey = gcalSelectedSchema.safeParse(rawKey).success ? rawKey : null;
    return fromProfile || fromKey || 'primary';
  });

  const disconnectGoogleCalendar = () => {
    localStorage.removeItem('gcal_token');
    localStorage.removeItem('gcal_token_expiry');
    localStorage.removeItem('gcal_refresh_token');
    localStorage.removeItem('gcal_selected_cal');
    setGcalToken(null);
    setGcalCalendars([]);
    setGcalSelectedCal('primary');
    setProfile(prev => ({ ...prev, gcalSelectedCal: '' }));
  };

  const getValidGcalToken = async () => {
    const token = localStorage.getItem('gcal_token');
    const expiry = localStorage.getItem('gcal_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) return token;
    const newToken = await refreshGcalToken();
    if (newToken) setGcalToken(newToken);
    return newToken;
  };

  // 캘린더 목록 가져오기
  useEffect(() => {
    if (!gcalToken) return;
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${gcalToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          const writable = data.items.filter(c => c.accessRole === 'owner' || c.accessRole === 'writer');
          setGcalCalendars(writable);
          // 저장된 선택이 없거나 'primary'면 실제 기본 캘린더 ID로 설정
          const savedProfile = parseWithSchema(profileSchema, localStorage.getItem(STORAGE_KEYS.PROFILE), {});
          const saved = savedProfile?.gcalSelectedCal || localStorage.getItem(STORAGE_KEYS.GCAL_SELECTED_CAL);
          if (!saved || saved === 'primary') {
            const primary = writable.find(c => c.primary);
            if (primary) {
              setGcalSelectedCal(primary.id);
              localStorage.setItem('gcal_selected_cal', primary.id);
            }
          }
        }
      })
      .catch(() => {});
  }, [gcalToken]);

  const syncToGoogleCalendar = async (schedule, visitDate, visitTime) => {
    const token = await getValidGcalToken();
    if (!token) return null;
    const [h, m] = (visitTime || '12:00').split(':');
    const endHour = String(parseInt(h) + 1).padStart(2, '0');
    const calId = localStorage.getItem('gcal_selected_cal') || 'primary';
    const event = {
      summary: `[협찬] ${schedule.title || schedule.brand}`,
      location: schedule.address || '',
      description: [
        schedule.mission ? `📋 기본미션:\n${schedule.mission}` : '',
        schedule.personalMission ? `\n✨ 개인미션:\n${schedule.personalMission}` : '',
        schedule.contact ? `\n📞 연락처: ${schedule.contact}` : '',
      ].filter(Boolean).join(''),
      start: { dateTime: `${visitDate}T${h.padStart(2, '0')}:${m || '00'}:00`, timeZone: 'Asia/Seoul' },
      end: { dateTime: `${visitDate}T${endHour}:${m || '00'}:00`, timeZone: 'Asia/Seoul' },
    };
    try {
      const existingEventId = schedule.gcalEventId;
      const url = existingEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(existingEventId)}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;
      const res = await fetch(url, {
        method: existingEventId ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id || true;
      }
      return null;
    } catch { return null; }
  };

  // 초안/최종 마감을 구글 캘린더에 종일 이벤트로 등록/수정
  // kind: 'draft' | 'final'
  const syncDeadlineToGoogleCalendar = async (schedule, deadlineStr, kind, existingId) => {
    const token = await getValidGcalToken();
    if (!token) return null;
    const date = parseDeadlineToDate(deadlineStr);
    if (!date) return null;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);
    const endStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
    const calId = localStorage.getItem('gcal_selected_cal') || 'primary';
    const title = schedule.title || schedule.brand || '협찬';
    const tag = kind === 'draft' ? '초안 마감' : '최종 마감';
    const event = {
      summary: `[${tag}] ${title}`,
      description: [
        schedule.mission ? `📋 기본미션:\n${schedule.mission}` : '',
        schedule.personalMission ? `\n✨ 개인미션:\n${schedule.personalMission}` : '',
      ].filter(Boolean).join(''),
      start: { date: dateStr },
      end: { date: endStr },
    };
    try {
      const url = existingId
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(existingId)}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;
      const res = await fetch(url, {
        method: existingId ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id || true;
      }
      return null;
    } catch { return null; }
  };

  const deleteFromGoogleCalendar = async (gcalEventId) => {
    if (!gcalEventId) return;
    const token = await getValidGcalToken();
    if (!token) return;
    const calId = localStorage.getItem('gcal_selected_cal') || 'primary';
    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(gcalEventId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {}
  };

  // --- 설정 패널 ---
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const s = fontSize / 16;
    // 본문 내용 텍스트만 스케일 (named sizes: xs ~ 3xl)
    // UI 라벨용 pixel 크기(text-[7px]~text-[12px])는 스케일하지 않음
    const root = document.documentElement.style;
    root.setProperty('--text-xs', `${0.75 * s}rem`);
    root.setProperty('--text-sm', `${0.875 * s}rem`);
    root.setProperty('--text-base', `${s}rem`);
    root.setProperty('--text-lg', `${1.125 * s}rem`);
    root.setProperty('--text-xl', `${1.25 * s}rem`);
    root.setProperty('--text-2xl', `${1.5 * s}rem`);
    root.setProperty('--text-3xl', `${1.875 * s}rem`);
    // 픽셀 고정 오버라이드 제거 (UI 라벨은 항상 원래 크기)
    const styleEl = document.getElementById('font-scale-override');
    if (styleEl) styleEl.textContent = '';
    localStorage.setItem('blogger_font_size', String(fontSize));
  }, [fontSize]);

  const [userPlan, setUserPlan] = useState('free');
  const [planExpiresAt, setPlanExpiresAt] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('schedule');
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const fetchAdminUsers = async () => {
    setAdminLoading(true);
    const { data, error } = await supabase.rpc('get_all_users_admin');
    if (!error && data) setAdminUsers(data);
    setAdminLoading(false);
  };

  const handleSetSubscription = async (targetUserId, newPlan, months) => {
    await supabase.rpc('set_user_subscription', {
      target_user_id: targetUserId,
      new_plan: newPlan,
      months: parseInt(months),
    });
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(months));
    setAdminUsers(prev => prev.map(u =>
      u.user_id === targetUserId ? { ...u, plan: newPlan, plan_expires_at: expiresAt.toISOString() } : u
    ));
  };

  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [textToCount, setTextToCount] = useState('');
  const [editingTextId, setEditingTextId] = useState(null);
  const [showSaveTextToast, setShowSaveTextToast] = useState(false);
  const [savedTexts, setSavedTexts] = useState(() => {
    return parseWithSchema(savedTextsSchema, localStorage.getItem(STORAGE_KEYS.SAVED_TEXTS), []);
  });
  const [showSavedTexts, setShowSavedTexts] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [confirmDoneId, setConfirmDoneId] = useState(null); // 리뷰 등록 확인 팝업용
  const [confirmVisitDate, setConfirmVisitDate] = useState(null); // { id, date } 체험일 등록 확인 팝업용
  const [notePopupId, setNotePopupId] = useState(null); // 체험 느낌 메모 팝업
  const [showTemplatePickerId, setShowTemplatePickerId] = useState(null); // 스케줄 상세 신청문구 복사 팝업
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // 삭제 확인 팝업용
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState(null); // 신청문구 삭제 확인 팝업용
  const [manageOngoingOpen, setManageOngoingOpen] = useState(true);
  const [manageDoneOpen, setManageDoneOpen] = useState(false);
  const [homeSchedulesOpen, setHomeSchedulesOpen] = useState(true);
  const [homeQuickCopyOpen, setHomeQuickCopyOpen] = useState(true);
  const [homeTemplatesOpen, setHomeTemplatesOpen] = useState(true);
  const [homeFtcOpen, setHomeFtcOpen] = useState(true);
  const [collapsedBrands, setCollapsedBrands] = useState({});
  const toggleBrand = (brand) => setCollapsedBrands(prev => ({ ...prev, [brand]: !prev[brand] }));
  const [expandedBrands, setExpandedBrands] = useState({});
  const toggleExpandBrand = (brand) => setExpandedBrands(prev => ({ ...prev, [brand]: !prev[brand] }));
  const [detailSections, setDetailSections] = useState({ extraInfo: true, caution: true, mission: true, personalMission: true, publishedContent: false });

  const deleteSchedule = (id) => {
    const target = schedules.find(s => s.id === id);
    if (target?.gcalEventId && gcalToken) deleteFromGoogleCalendar(target.gcalEventId);
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem('blogSchedules', JSON.stringify(updated));
    if (selectedScheduleId === id) setSelectedScheduleId(null);
    setConfirmDeleteId(null);
  };
  const [editingScheduleId, setEditingScheduleId] = useState(null); // 스케줄 수정 모드

  // 체험단 일정 데이터
  const EXAMPLE_SCHEDULES = [
    {
      id: 1, brand: '레뷰', type: '맛집', title: '청담동 파스타 맛집',
      address: '서울 강남구 청담동 123', contact: '010-1234-5678',
      mission: '사진 15장 이상, 영상 필수',
      experiencePeriod: '2026-03-20 ~ 2026-03-24',
      deadline: '2026-03-25',
      provided: '2인 식사권 (파스타 2 + 음료 2)',
      visitDays: '화~일', visitTime: '11:00 ~ 21:00',
      caution: '예약 필수, 노쇼 시 패널티',
      isDone: false
    },
    {
      id: 2, brand: '강남맛집', type: '헤어', title: '역삼역 레이어드컷',
      address: '서울 강남구 역삼동 456', contact: '02-555-7777',
      mission: 'Before/After 사진 확실하게',
      experiencePeriod: '2026-03-22 ~ 2026-03-26',
      deadline: '2026-03-28',
      provided: '레이어드컷 + 클리닉',
      visitDays: '월~토', visitTime: '10:00 ~ 19:00',
      caution: '당일 예약 불가',
      isDone: true
    }
  ];

  const [schedules, setSchedules] = useState(() => {
    const parsed = parseWithSchema(schedulesSchema, localStorage.getItem(STORAGE_KEYS.SCHEDULES), null);
    if (parsed && parsed.length > 0) {
      // 예시 데이터(id 1,2)만 있으면 빈 배열로 초기화 (로그인 유저용 정리)
      const isOnlyExamples = parsed.every(s => s.id === 1 || s.id === 2);
      if (isOnlyExamples) {
        localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
        return [];
      }
      return parsed;
    }
    return [];
  });

  // schedules가 바뀔 때마다 자동으로 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('blogSchedules', JSON.stringify(schedules));
  }, [schedules]);

  // --- Supabase 연동 ---
  const dbLoaded = useRef(false);

  // 로그인 시 Supabase에서 데이터 불러오기
  useEffect(() => {
    if (!user || isGuest) return;
    dbLoaded.current = false;
    const load = async () => {
      const { data } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        if (data.schedules?.length) setSchedules(data.schedules);
        if (data.templates?.length) setTemplates(data.templates);
        if (data.hashtags && Object.keys(data.hashtags).length) setHashtags(data.hashtags);
        if (data.profile && Object.keys(data.profile).length) {
          setProfile(prev => ({ ...prev, ...data.profile }));
          if (data.profile) localStorage.setItem('blogger_profile', JSON.stringify({ ...profile, ...data.profile }));
          if (data.profile.gcalSelectedCal) {
            setGcalSelectedCal(data.profile.gcalSelectedCal);
            localStorage.setItem('gcal_selected_cal', data.profile.gcalSelectedCal);
          }
        }
        if (data.saved_texts?.length) setSavedTexts(data.saved_texts);
        if (data.plan) setUserPlan(data.plan);
        if (data.plan_expires_at) setPlanExpiresAt(data.plan_expires_at);
        if (data.is_admin) setIsAdmin(data.is_admin);
      }
      // 관리자 이메일은 항상 프로+관리자
      if (ADMIN_EMAILS.includes(user.email)) {
        setUserPlan('pro');
        setIsAdmin(true);
      }
      dbLoaded.current = true;
    };
    load();
  }, [user?.id]);

  // 데이터 변경 시 Supabase에 저장 (1.5초 debounce)
  useEffect(() => {
    if (!user || isGuest || !dbLoaded.current) return;
    const timer = setTimeout(async () => {
      await supabase.from('user_data').upsert({
        user_id: user.id,
        schedules,
        templates,
        hashtags,
        profile,
        saved_texts: savedTexts,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }, 1500);
    return () => clearTimeout(timer);
  }, [schedules, templates, hashtags, profile, savedTexts]);

  useEffect(() => {
    setDetailSections({ extraInfo: true, caution: true, mission: true, personalMission: true });
  }, [selectedScheduleId]);

  const emptyParsed = {
    brand: '리뷰노트', type: '맛집', title: '', address: '', contact: '',
    mission: '', personalMission: '', experiencePeriod: '', deadline: '', draftDeadline: '', provided: '',
    visitDays: '', visitTime: '', visitDate: '', visitSetTime: '', caution: '', ftcImageUrl: '',
    keywords: '', placeUrl: '',
    platforms: [],
    gcalEventId: '',
  };

  // 임시 파싱 데이터
  const [parsedData, setParsedData] = useState({ ...emptyParsed });

  // 카드 ref 맵
  const cardRefs = useRef({});
  const imageCardRefs = useRef({});
  const monthListRef = useRef(null);

  // --- D-Day 계산 ---
  const getDday = (deadlineStr) => {
    if (!deadlineStr) return null;
    const deadlineDate = parseDeadlineToDate(deadlineStr);
    if (!deadlineDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getBrandBadge = (brand) => {
    const map = {
      '리뷰노트': 'bg-teal-500 text-white border-teal-500',
      '강남맛집': 'bg-orange-500 text-white border-orange-500',
      '레뷰': 'bg-rose-500 text-white border-rose-500',
      '슈퍼멤버스': 'bg-violet-500 text-white border-violet-500',
      '디너의여왕': 'bg-amber-500 text-white border-amber-500',
      '리뷰플레이스': 'bg-emerald-500 text-white border-emerald-500',
      'WE:U': 'bg-cyan-500 text-white border-cyan-500',
    };
    return map[brand] || 'bg-slate-400 text-white border-slate-400';
  };

  // 카테고리에 따라 활성 마감일 결정: 기자단/제품에서 초안 미경과면 초안, 아니면 최종
  const getActiveDeadline = (item) => {
    if (!item || typeof item !== 'object') return { dateStr: item, prefix: '' };
    const isTwoStage = item.type === '기자단' || item.type === '제품';
    if (isTwoStage && item.draftDeadline) {
      const draftDiff = getDday(item.draftDeadline);
      if (draftDiff !== null && draftDiff >= 0) {
        return { dateStr: item.draftDeadline, prefix: '초안 ' };
      }
    }
    return { dateStr: item.deadline, prefix: isTwoStage && item.draftDeadline ? '최종 ' : '' };
  };

  const getDdayLabel = (input) => {
    const { dateStr, prefix } = typeof input === 'string' ? { dateStr: input, prefix: '' } : getActiveDeadline(input);
    const diff = getDday(dateStr);
    if (diff === null) return null;
    const label = (suffix) => `${prefix}${suffix}`;
    if (diff === 0) return { text: label('D-Day'), color: 'bg-red-500' };
    if (diff < 0) return { text: label(`D+${Math.abs(diff)}`), color: 'bg-slate-400' };
    if (diff <= 3) return { text: label(`D-${diff}`), color: 'bg-red-500' };
    if (diff <= 7) return { text: label(`D-${diff}`), color: 'bg-orange-500' };
    return { text: label(`D-${diff}`), color: 'bg-sky-500' };
  };

  // --- 이미지 저장 ---
  const saveCardAsImage = async (id) => {
    const card = imageCardRefs.current[id];
    if (!card) return;
    try {
      // 원본 요소를 잠시 화면에 보이게 한 뒤 캡처
      const origStyle = card.style.cssText;
      const isShareCard = id.toString().startsWith('share_');
      card.style.cssText = isShareCard
        ? 'position:fixed;left:0;top:0;width:480px;height:480px;z-index:-1;'
        : 'position:fixed;left:0;top:0;width:420px;z-index:-1;';
      await new Promise(r => setTimeout(r, 150));
      const dataUrl = await domToPng(card, {
        scale: 2,
        backgroundColor: '#ffffff',
        filter: (node) => node.dataset?.noImage !== 'true',
      });
      card.style.cssText = origStyle;
      // dataUrl → Blob 변환
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `체험단_${id}.png`, { type: 'image/png' });
      // 모바일: navigator.share, PC: 다운로드
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = file.name;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('이미지 저장 실패:', err);
      alert('이미지 저장에 실패했습니다.');
      // 실패 시에도 원래 위치로 복원
      if (card) card.style.cssText = 'position:absolute;left:-9999px;top:0;width:420px;';
    }
  };

  // --- 앱 내 캘린더 ---
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'blog' | 'insta' | 'reels' | 'facebook' | 'youtube'

  // 날짜 선택 시 월 일정 리스트 스크롤
  useEffect(() => {
    if (!selectedDate || !monthListRef.current) return;
    const target = monthListRef.current.querySelector(`[data-day="${selectedDate}"]`);
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedDate]);

  // 캘린더 탭 진입 시 오늘 날짜 기준으로 스크롤
  useEffect(() => {
    if (activeTab !== 'calendar') return;
    const today = new Date();
    const isCurrentMonth = calendarMonth.year === today.getFullYear() && calendarMonth.month === today.getMonth();
    setTimeout(() => {
      if (!monthListRef.current) return;
      if (isCurrentMonth) {
        // 오늘 날짜 이후 가장 가까운 항목으로 스크롤
        const allItems = Array.from(monthListRef.current.querySelectorAll('[data-day]'));
        const target = allItems.find(el => parseInt(el.dataset.day) >= today.getDate());
        if (target) { target.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      }
      monthListRef.current.scrollTop = 0;
    }, 150);
  }, [activeTab, calendarMonth]);

  // 날짜 문자열 → Date 변환
  const parseExperienceStartDate = (str) => {
    if (!str) return null;
    // "3/17 ~ 3/30" or "2026-03-17 ~ 2026-03-30" 등에서 시작일만 추출
    const startPart = str.split(/[~–]/)[0].trim();
    return parseDeadlineToDate(startPart);
  };

  // 월별 카운트 기준일: 체험기간 시작일 → 없으면 마감일
  const getScheduleMonthDate = (s) => parseExperienceStartDate(s.experiencePeriod) || parseDeadlineToDate(s.deadline);

  const parseDeadlineToDate = (str) => {
    if (!str) return null;
    // 범위 형식 "3/6 ~ 3/14" → 끝날짜만 사용
    let s = str;
    if (s.includes('~') || s.includes('–') || s.includes('-')) {
      const parts = s.split(/[~–]/).map(p => p.trim());
      if (parts.length > 1) s = parts[parts.length - 1];
    }
    const cleaned = s.replace(/\(.*?\)/g, '').replace(/[까지년]/g, '').trim();
    // YYYY-MM-DD / YYYY.MM.DD
    if (cleaned.match(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/)) {
      return new Date(cleaned.replace(/[./]/g, '-'));
    }
    // M/D or M.D (optional trailing 일, e.g. "3/14일")
    if (cleaned.match(/^\d{1,2}[\/\.]\d{1,2}일?$/)) {
      const [m, d] = cleaned.replace(/일$/, '').split(/[\/\.]/);
      return new Date(new Date().getFullYear(), parseInt(m) - 1, parseInt(d));
    }
    // 한국어 형식 "3월 14일"
    const ko = cleaned.match(/^(\d{1,2})월\s*(\d{1,2})일?$/);
    if (ko) {
      return new Date(new Date().getFullYear(), parseInt(ko[1]) - 1, parseInt(ko[2]));
    }
    return null;
  };

  // 해당 날짜의 스케줄 목록
  const getSchedulesForDate = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const results = [];
    schedules.forEach(s => {
      let added = false;
      // 마감일 매칭 (빨간 점)
      const d = parseDeadlineToDate(s.deadline);
      if (d) {
        const sStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (sStr === dateStr) {
          results.push({ ...s, _dotType: 'deadline' });
          added = true;
        }
      }
      // 협찬 방문일 매칭 (파란 점) - visitDate가 있으면 이것만 표시
      if (!added && s.visitDate && s.visitDate === dateStr) {
        results.push({ ...s, _dotType: 'experience' });
      }
    });
    return results;
  };

  // 달력 데이터 생성
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calendarMonth]);

  // 선택한 날짜의 스케줄
  const selectedSchedules = useMemo(() => {
    if (!selectedDate) return [];
    return getSchedulesForDate(calendarMonth.year, calendarMonth.month, selectedDate);
  }, [selectedDate, calendarMonth, schedules]);

  // --- 리뷰 등록 완료 처리 ---
  const [scheduledPublishDate, setScheduledPublishDate] = useState(''); // 예약 발행 날짜 선택용
  const markAsDone = (id) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isDone: true, doneAt: new Date().toISOString() } : s));
    setConfirmDoneId(null);
  };
  const markAsScheduled = (id, date) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, scheduledPublishDate: date } : s));
    setConfirmDoneId(null);
    setScheduledPublishDate('');
  };

  // 예약 발행일 도래 시 자동 완료 처리
  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const updated = schedules.map(s => {
      if (s.scheduledPublishDate && !s.isDone && s.scheduledPublishDate <= todayStr) {
        return { ...s, isDone: true, doneAt: s.scheduledPublishDate + 'T00:00:00' };
      }
      return s;
    });
    if (JSON.stringify(updated) !== JSON.stringify(schedules)) {
      setSchedules(updated);
    }
  }, [schedules]);

  // --- 유틸리티 함수 ---
  const [copyWarning, setCopyWarning] = useState('');
  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };
  const copyWithCheck = (value, label) => {
    if (!value || !value.trim()) {
      setCopyWarning(`${label} 주소가 입력되지 않았어요.\n프로필에서 먼저 입력해주세요.`);
      return;
    }
    navigator.clipboard.writeText(value);
  };

  const handleEmailSignIn = async (email, password, rememberMe = true) => {
    setAuthError('');
    const { error } = await signInWithEmail(email, password);
    if (error) { setAuthError(error.message); return; }
    if (!rememberMe) {
      // 탭/브라우저 닫을 때 세션 해제
      sessionStorage.setItem('noRemember', '1');
    } else {
      sessionStorage.removeItem('noRemember');
    }
  };

  const handleEmailSignUp = async (email, password, nickname) => {
    setAuthError('');
    const { error } = await signUpWithEmail(email, password);
    if (error) { setAuthError(error.message); return { error }; }
    if (nickname) {
      updateProfile('nickname', nickname);
      const updated = { ...profile, nickname };
      localStorage.setItem('blogger_profile', JSON.stringify(updated));
    }
    return {};
  };

  const handleForgotPassword = async (email) => {
    const { error } = await resetPasswordForEmail(email);
    return { error };
  };

  const handleVerifyOtp = async (email, token) => {
    setAuthError('');
    const { error } = await verifyOtp(email, token);
    if (error) return { error };
    return {};
  };

  const [confirmDeleteTextId, setConfirmDeleteTextId] = useState(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  // dnd-kit sensors (Rules of Hooks: 항상 최상단에서 호출)
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const [isPulling, setIsPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const pullStartY = useRef(0);
  const PULL_THRESHOLD = 38;
  const isAnyModalOpen = () => (
    !!selectedScheduleId || !!notePopupId || !!confirmDeleteId || !!confirmDoneId ||
    isModalOpen || !!editingTemplateId || !!editingFtcTemplateId || !!showTemplatePickerId ||
    !!confirmVisitDate || !!confirmDeleteTemplateId || showUpgradeModal || locationPopup
  );
  const handleTouchStart = (e) => { if (window.scrollY === 0 && !isAnyModalOpen()) pullStartY.current = e.touches[0].clientY; else pullStartY.current = 0; };
  const handleTouchMove = (e) => {
    if (window.scrollY !== 0 || isAnyModalOpen()) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) { setIsPulling(true); setPullY(Math.min(dy, PULL_THRESHOLD + 20)); }
  };
  const handleTouchEnd = () => {
    if (pullY >= PULL_THRESHOLD && !isAnyModalOpen()) window.location.reload();
    setIsPulling(false); setPullY(0);
  };
  const [confirmDeleteAccount2, setConfirmDeleteAccount2] = useState(false);
  const handleDeleteAccount = async () => {
    await deleteAccount();
    setConfirmDeleteAccount(false);
    setConfirmDeleteAccount2(false);
  };

  const handleBiometricLoginFromPage = async () => {
    try {
      const credIdStr = localStorage.getItem('biometric_cred_id');
      if (!credIdStr) return { error: '등록된 생체 인증이 없습니다.' };
      const credId = Uint8Array.from(atob(credIdStr), c => c.charCodeAt(0));
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      // 생체 인증 성공 → 세션 복원 시도
      const { data } = await refreshSession();
      if (data?.session) {
        sessionStorage.setItem('biometricUnlocked', '1');
        return {};
      }
      return { error: '세션이 만료되었어요. 이메일/비밀번호로 로그인해주세요.' };
    } catch (e) {
      // 저장된 자격증명이 없거나 기기/도메인이 바뀐 경우 → stale 데이터 정리
      localStorage.removeItem('biometric_cred_id');
      localStorage.removeItem('biometric_enabled');
      if (e.name === 'NotAllowedError') {
        return { error: '생체 인증 정보가 초기화되었습니다. 로그인 후 프로필에서 다시 등록해주세요.', credentialCleared: true };
      }
      return { error: '생체 인증에 실패했습니다. 로그인 후 프로필에서 다시 등록해주세요.', credentialCleared: true };
    }
  };

  const handleSocialLogin = async (provider) => {
    setAuthError('');
    const { error } = await signInWithProvider(provider);
    if (error) setAuthError(error.message);
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setSchedules(EXAMPLE_SCHEDULES);
  };

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false);
      setSchedules([]);
    } else {
      await signOut();
    }
    setAuthError('');
  };

  // --- Gemini AI 스마트 파서 ---
  const parseWithGemini = async (text) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `너는 블로그 체험단 정보 추출 전문가야. 아래 텍스트에서 체험단 관련 정보를 정확하게 추출해서 JSON으로 반환해.

규칙:
- mission(기본 미션)은 "키워드 삽입, 사진 15장 이상, 1000자 이상, 지도첨부, 동영상, 공정위표기" 같은 블로거가 지켜야 할 작성 조건/규칙만 정리
- personalMission(개인 미션)은 업체 소개, 음식/서비스 설명, 특징, 홍보 포인트 등 블로거가 포스팅에 녹여야 하는 업체 관련 내용을 그대로 추출 (홍보 문구 포함)
- 주의사항은 "예약 필수, 당일 방문 불가, 최소 하루 전 연락" 같은 예약/방문 관련 주의사항만 정리
- 값이 없으면 빈 문자열 ""로 반환
- 반드시 아래 JSON 형식만 반환 (다른 텍스트 없이 JSON만)

{
  "brand": "체험단 플랫폼명 (레뷰, 강남맛집, 리뷰노트, 미블, WE:U 등. 모르면 '기타')",
  "type": "카테고리 (맛집, 헤어, 뷰티, 운동, 제품, 기자단 중 하나)",
  "title": "업체명 (지역 접두사 제외, 순수 상호명만)",
  "address": "방문 주소 (전체 주소)",
  "contact": "담당자 연락처 (전화번호)",
  "experiencePeriod": "체험 기간 (예: 3/10 ~ 3/23)",
  "deadline": "최종 리뷰 마감일",
  "draftDeadline": "초안 제출 마감일 (기자단/제품 카테고리에 주로 있음. 초안 검수 후 최종 등록하는 형태일 때만 추출. 없으면 빈 문자열)",
  "provided": "제공 서비스/물품 (실제 제공되는 메뉴나 서비스)",
  "visitDays": "체험 가능 요일",
  "visitTime": "체험 가능 시간",
  "caution": "예약 시 주의사항 (줄바꿈 대신 / 로 구분)",
  "keywords": "업체가 요구하는 검색 키워드 (예: 연남동맛집, 파스타맛집, 데이트코스 등. 없으면 빈 문자열)",
  "mission": "기본 미션 (사진 수, 글자 수, 키워드, 동영상 등 작성 조건. 항목별로 줄바꿈(\\n)하여 정리)",
  "personalMission": "개인 미션 (업체 소개, 음식/서비스 설명 등 포스팅에 담아야 할 내용. 문장 단위로 줄바꿈(\\n)하여 가독성 좋게 추출)",
  "ftcImageUrl": "공정위 문구 이미지 URL (http/https로 시작하는 이미지 주소. 없으면 빈 문자열)",
  "extraInfo": "위 항목에 담기 어려운 기타 중요 정보 (예: 상세 영업시간 설명, 예약 방법, 특이사항 등. 없으면 빈 문자열)"
}

텍스트:
${text}`
            }]
          }]
        })
      }
    );

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const raw = JSON.parse(jsonMatch[1]);
        const result = geminiParsedSchema.safeParse(raw);
        if (result.success) return result.data;
        console.warn('[parseWithSchema] Gemini 응답 스키마 검증 실패, 기본값 사용:', result.error);
        return {};
      } catch (err) {
        console.warn('[parseWithSchema] Gemini 응답 JSON 파싱 실패, 기본값 사용:', err);
        return {};
      }
    }
    throw new Error('JSON 파싱 실패');
  };

  const applyParseResult = (result) => {
    const KNOWN_BRANDS = ['리뷰노트','강남맛집','레뷰','슈퍼멤버스','디너의여왕','리뷰플레이스','WE:U'];
    setParsedData({
      brand: KNOWN_BRANDS.includes(result.brand) ? result.brand : (parsedData.brand || '리뷰노트'),
      brandCustom: KNOWN_BRANDS.includes(result.brand) ? '' : (parsedData.brandCustom || ''),
      type: result.type || '맛집',
      title: result.title || '',
      address: result.address || '',
      contact: result.contact || '',
      experiencePeriod: result.experiencePeriod || '',
      deadline: result.deadline || '',
      draftDeadline: result.draftDeadline || '',
      provided: result.provided || '',
      visitDays: result.visitDays || '',
      visitTime: result.visitTime || '',
      caution: result.caution || '',
      keywords: result.keywords || '',
      mission: result.mission || '',
      personalMission: result.personalMission || '',
      ftcImageUrl: result.ftcImageUrl || '',
      extraInfo: result.extraInfo || '',
    });
  };

  const handleSmartParsing = async (text) => {
    setRawText(text);
    if (text.trim().length < 20) return; // 너무 짧으면 무시

    setIsParsing(true);
    try {
      const result = await parseWithGemini(text);
      applyParseResult(result);
    } catch (err) {
      console.error('Gemini 파싱 에러:', err);
      alert('AI 분석에 실패했습니다. 다시 시도해주세요.\n' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // --- PDF/Word 파일 업로드 파서 ---
  const parsePdfWithGemini = async (file) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const prompt = `너는 블로그 체험단 정보 추출 전문가야. 첨부된 PDF의 내용에서 체험단 관련 정보를 정확하게 추출해서 JSON으로 반환해.

규칙:
- mission(기본 미션)은 "키워드 삽입, 사진 15장 이상, 1000자 이상, 지도첨부, 동영상, 공정위표기" 같은 블로거가 지켜야 할 작성 조건/규칙만 정리
- personalMission(개인 미션)은 업체 소개, 음식/서비스 설명, 특징, 홍보 포인트 등 블로거가 포스팅에 녹여야 하는 업체 관련 내용을 그대로 추출 (홍보 문구 포함)
- 주의사항은 "예약 필수, 당일 방문 불가, 최소 하루 전 연락" 같은 예약/방문 관련 주의사항만 정리
- 값이 없으면 빈 문자열 ""로 반환
- 반드시 아래 JSON 형식만 반환 (다른 텍스트 없이 JSON만)

{
  "brand": "체험단 플랫폼명 (레뷰, 강남맛집, 리뷰노트, 미블, WE:U 등. 모르면 '기타')",
  "type": "카테고리 (맛집, 헤어, 뷰티, 운동, 제품, 기자단 중 하나)",
  "title": "업체명 (지역 접두사 제외, 순수 상호명만)",
  "address": "방문 주소 (전체 주소)",
  "contact": "담당자 연락처 (전화번호)",
  "experiencePeriod": "체험 기간 (예: 3/10 ~ 3/23)",
  "deadline": "최종 리뷰 마감일",
  "draftDeadline": "초안 제출 마감일 (기자단/제품 카테고리에 주로 있음. 초안 검수 후 최종 등록하는 형태일 때만 추출. 없으면 빈 문자열)",
  "provided": "제공 서비스/물품 (실제 제공되는 메뉴나 서비스)",
  "visitDays": "체험 가능 요일",
  "visitTime": "체험 가능 시간",
  "caution": "예약 시 주의사항 (줄바꿈 대신 / 로 구분)",
  "keywords": "업체가 요구하는 검색 키워드 (예: 연남동맛집, 파스타맛집, 데이트코스 등. 없으면 빈 문자열)",
  "mission": "기본 미션 (사진 수, 글자 수, 키워드, 동영상 등 작성 조건. 항목별로 줄바꿈(\\n)하여 정리)",
  "personalMission": "개인 미션 (업체 소개, 음식/서비스 설명 등 포스팅에 담아야 할 내용. 문장 단위로 줄바꿈(\\n)하여 가독성 좋게 추출)",
  "ftcImageUrl": "공정위 문구 이미지 URL (http/https로 시작하는 이미지 주소. 없으면 빈 문자열)",
  "extraInfo": "위 항목에 담기 어려운 기타 중요 정보 (예: 상세 영업시간 설명, 예약 방법, 특이사항 등. 없으면 빈 문자열)"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
            ],
          }],
        }),
      }
    );
    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const raw = JSON.parse(jsonMatch[1]);
        const result = geminiParsedSchema.safeParse(raw);
        if (result.success) return result.data;
        console.warn('[parseWithSchema] Gemini PDF 응답 스키마 검증 실패:', result.error);
        return {};
      } catch (err) {
        console.warn('[parseWithSchema] Gemini PDF 응답 JSON 파싱 실패:', err);
        return {};
      }
    }
    throw new Error('JSON 파싱 실패');
  };

  // 공통 파일 파서: File → Gemini 결과 객체 반환
  const parseFileToResult = async (file) => {
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      alert('파일이 너무 큽니다. 20MB 이하로 업로드해주세요.');
      return null;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    if (!isPdf && !isDocx) {
      alert('PDF 또는 Word(.docx) 파일만 지원됩니다.');
      return null;
    }
    if (isPdf) return await parsePdfWithGemini(file);
    const mammoth = (await import('mammoth/mammoth.browser')).default;
    const arrayBuffer = await file.arrayBuffer();
    const { value: text } = await mammoth.extractRawText({ arrayBuffer });
    if (!text || text.trim().length < 20) {
      alert('Word 파일에서 텍스트를 충분히 추출하지 못했습니다.');
      return null;
    }
    return await parseWithGemini(text);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsParsing(true);
    try {
      const result = await parseFileToResult(file);
      if (!result) return;
      setRawText(`[업로드: ${file.name}]`);
      applyParseResult(result);
    } catch (err) {
      console.error('파일 파싱 에러:', err);
      alert('파일 분석에 실패했습니다.\n' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // 수정 모드 전용: 기존 일정에 파일에서 추출한 값 병합 (빈 값은 덮어쓰지 않음)
  const handleFileUpdateForItem = async (file, scheduleId) => {
    if (!file) return;
    setIsParsing(true);
    try {
      const result = await parseFileToResult(file);
      if (!result) return;
      const KNOWN_BRANDS = ['리뷰노트','강남맛집','레뷰','슈퍼멤버스','디너의여왕','리뷰플레이스','WE:U'];
      setSchedules(prev => prev.map(s => {
        if (s.id !== scheduleId) return s;
        const patch = {};
        const fields = ['type','title','address','contact','experiencePeriod','deadline','draftDeadline','provided','visitDays','visitTime','caution','keywords','mission','personalMission','ftcImageUrl','extraInfo','placeUrl'];
        fields.forEach(k => { if (result[k]) patch[k] = result[k]; });
        if (result.brand && KNOWN_BRANDS.includes(result.brand)) patch.brand = result.brand;
        return { ...s, ...patch };
      }));
      alert('파일에서 추출한 정보로 업데이트되었습니다.');
    } catch (err) {
      console.error('파일 파싱 에러:', err);
      alert('파일 분석에 실패했습니다.\n' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // 이번 달 신규 협찬 건수
  const thisMonthScheduleCount = useMemo(() => {
    const now = new Date();
    return schedules.filter(s => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [schedules]);

  const saveNewSchedule = () => {
    if (!parsedData.title) return alert('최소한 업체명은 있어야 합니다!');
    const limit = PLAN_LIMITS.schedule[userPlan];
    if (thisMonthScheduleCount >= limit) {
      setUpgradeReason('schedule');
      setShowUpgradeModal(true);
      return;
    }
    const finalBrand = parsedData.brand === '기타(수기)' ? (parsedData.brandCustom || '기타') : parsedData.brand;
    const newItem = { ...parsedData, brand: finalBrand, id: Date.now(), isDone: false, createdAt: new Date().toISOString() };
    delete newItem.brandCustom;
    setSchedules([...schedules, newItem]);
    setIsModalOpen(false);
    setRawText('');
    setActiveTab('calendar');
  };

  // --- 통계 데이터 ---
  const stats = useMemo(() => {
    const counts = { 맛집: 0, 헤어: 0, 뷰티: 0, 운동: 0, 제품: 0, 기자단: 0, 기타: 0 };
    schedules.forEach(s => {
      if (s.type.includes('뷰티')) counts.뷰티++;
      else if (counts[s.type] !== undefined) counts[s.type]++;
      else counts.기타++;
    });
    return counts;
  }, [schedules]);

  // --- 메인 화면 렌더링 ---
  if (loading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-bold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isRecovery) {
    return <PasswordResetScreen email={user?.email} onUpdate={async (pw) => {
      const { error } = await updatePassword(pw);
      if (!error) { setIsRecovery(false); window.location.hash = ''; }
      return { error };
    }} />;
  }

  if (biometricLocked) {
    return (
      <BiometricLockScreen
        onUnlock={handleBiometricUnlock}
        onSkip={() => { setBiometricLocked(false); signOut(); }}
      />
    );
  }

  if (!user && !isGuest) {
    return (
      <LoginPage
        onEmailSignIn={handleEmailSignIn}
        onEmailSignUp={handleEmailSignUp}
        onVerifyOtp={handleVerifyOtp}
        onSocialLogin={handleSocialLogin}
        onGuestLogin={handleGuestLogin}
        onForgotPassword={handleForgotPassword}
        onBiometricLogin={handleBiometricLoginFromPage}
        authError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 pb-28 sm:pb-36 font-sans select-none relative overflow-hidden z-0"
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Pull-to-refresh 인디케이터 */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-200"
        style={{ transform: `translateY(${isPulling ? Math.min(pullY - 40, 40) : -60}px)`, opacity: isPulling ? Math.min(pullY / PULL_THRESHOLD, 1) : 0 }}>
        <div className={`mt-3 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-sky-100 transition-all ${pullY >= PULL_THRESHOLD ? 'scale-110 border-sky-400' : ''}`}>
          <svg className={`w-5 h-5 text-sky-500 transition-transform duration-300 ${pullY >= PULL_THRESHOLD ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </div>
      {/* Ambient Blobs */}
      <div className="ambient-blob bg-sky-300/40 w-[500px] h-[500px] top-[-10%] left-[-10%]"></div>
      <div className="ambient-blob bg-pink-200/40 w-[400px] h-[400px] top-[40%] right-[-10%] [animation-delay:2s]"></div>
      <div className="ambient-blob bg-violet-200/30 w-[600px] h-[600px] bottom-[-10%] left-[20%] [animation-delay:4s]"></div>
      {/* 1. 상단 날씨 & 퀵 버튼 */}
      <header className="bg-white/80 backdrop-blur-md px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 sticky top-0 z-30 border-b border-sky-100">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/favicon.png" alt="logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain hover:scale-110 transition-transform cursor-pointer" onClick={() => setActiveTab('home')} />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => setActiveTab('home')}>Blue Review</h2>
              <p className="text-[10px] sm:text-[12px] font-bold text-slate-500 mt-0.5 hidden sm:block">블로거를 위한 협찬 관리</p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 items-center">
            <a href="https://adpost.naver.com/" target="_blank" className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-sm">
              <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-[7px] sm:text-[9px] font-bold leading-tight">애드포스트</span>
            </a>
            <a href="https://blog.naver.com/" target="_blank" className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-sky-50 text-sky-600 rounded-xl sm:rounded-2xl border border-sky-100 shadow-sm">
              <PenTool size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-[7px] sm:text-[9px] font-bold leading-tight">블로그</span>
            </a>
            <button
              onClick={() => setShowSettings(v => !v)}
              className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-slate-100 text-slate-500 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:bg-sky-50 hover:text-sky-600 transition-colors"
            >
              <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-[7px] sm:text-[9px] font-bold leading-tight">설정</span>
            </button>
          </div>
        </div>
        {activeTab === 'home' && <button onClick={() => setLocationPopup(true)} className={`w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-lg flex items-center gap-3 sm:gap-4 text-left active:scale-[0.99] transition-all ${weather.icon === 'sun' ? 'bg-gradient-to-r from-blue-400 to-sky-400 shadow-sky-200' :
          weather.icon === 'cloud-sun' ? 'bg-gradient-to-r from-sky-400 to-slate-400 shadow-slate-200' :
            weather.icon === 'cloud' ? 'bg-gradient-to-r from-slate-400 to-slate-500 shadow-slate-200' :
              weather.icon === 'rain' ? 'bg-gradient-to-r from-slate-500 to-blue-600 shadow-blue-200' :
                'bg-gradient-to-r from-blue-300 to-indigo-400 shadow-indigo-200'
          }`}>
          {weather.icon === 'sun' && <Sun size={28} className="shrink-0" />}
          {weather.icon === 'cloud-sun' && <CloudSun size={28} className="shrink-0" />}
          {weather.icon === 'cloud' && <Cloud size={28} className="shrink-0" />}
          {weather.icon === 'rain' && <CloudRain size={28} className="shrink-0" />}
          {weather.icon === 'snow' && <Snowflake size={28} className="shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">
              촬영 지수 {weather.score}% {weather.temp && `· ${weather.temp}°C`} · <MapPin size={10} className="inline -mt-0.5" />{weather.location}
            </p>
            <p className="font-bold text-xs sm:text-base leading-snug">{weather.tip}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg sm:text-2xl font-black leading-tight">{new Date().getMonth() + 1}/{new Date().getDate()}</p>
            <p className="text-[10px] sm:text-xs font-bold opacity-80">{['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]}요일</p>
          </div>
        </button>}
      </header>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="fixed inset-0 z-50" onClick={() => setShowSettings(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 pb-10 animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-base font-black text-slate-800 mb-5">설정</h3>

            {/* 글씨 크기 */}
            <div className="mb-5">
              <p className="text-xs font-black text-slate-500 mb-3">글씨 크기</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setFontSize(f => Math.max(13, f - 1))} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-600 font-black text-lg active:scale-90 transition-all">−</button>
                <div className="flex-1 bg-slate-50 rounded-2xl py-2 text-center">
                  <span className="font-black text-slate-700">{fontSize}</span>
                  <span className="text-xs text-slate-500 ml-1">px</span>
                </div>
                <button onClick={() => setFontSize(f => Math.min(24, f + 1))} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-600 font-black text-lg active:scale-90 transition-all">+</button>
                <button onClick={() => setFontSize(window.innerWidth >= 640 ? 22 : 18)} className="text-xs font-bold text-sky-500 underline underline-offset-2">초기화</button>
              </div>
            </div>

            {/* 테마 색상 */}
            <div className="mb-6">
              <p className="text-xs font-black text-slate-500 mb-3">Blue Review 색상</p>
              <div className="flex gap-3">
                {Object.entries(COLOR_THEMES).map(([key, { label, hex }]) => (
                  <button
                    key={key}
                    onClick={() => setThemeColor(key)}
                    className="flex flex-col items-center gap-1.5 flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl shadow-md transition-all ${themeColor === key ? 'scale-110 ring-2 ring-offset-2' : 'active:scale-95'}`}
                      style={{ backgroundColor: hex, ringColor: hex }}
                    />
                    <span className={`text-[10px] font-bold ${themeColor === key ? 'text-slate-700' : 'text-slate-500'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 구글 캘린더 연동 */}
            <div className="mb-5">
              <p className="text-xs font-black text-slate-500 mb-3">구글 캘린더 연동</p>
              {gcalToken ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-xs font-bold text-green-600">연동됨</span>
                    </div>
                    <button onClick={disconnectGoogleCalendar} className="text-[10px] font-bold text-slate-400 active:scale-95">해제</button>
                  </div>
                  {gcalCalendars.length > 0 && (
                    <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold text-slate-500 mb-2">일정 추가할 캘린더</p>
                      <select
                        value={gcalSelectedCal}
                        onChange={(e) => { setGcalSelectedCal(e.target.value); localStorage.setItem('gcal_selected_cal', e.target.value); setProfile(prev => ({ ...prev, gcalSelectedCal: e.target.value })); }}
                        className="w-full px-3 py-2 rounded-xl bg-white ring-1 ring-sky-200 text-xs font-bold text-slate-700 outline-none"
                      >
                        {gcalCalendars.map(c => (
                          <option key={c.id} value={c.id}>{c.summary}{c.primary ? ' (기본)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={connectGoogleCalendar}
                  disabled={gcalConnecting}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-50 text-sky-600 font-black text-sm active:scale-95 transition-all border border-sky-100 disabled:opacity-50"
                >
                  <Calendar size={16} /> {gcalConnecting ? '연결 중...' : '구글 캘린더 연결하기'}
                </button>
              )}
            </div>

            {/* 로그아웃 */}
            <button
              onClick={() => { setShowSettings(false); handleLogout(); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-50 text-rose-500 font-black text-sm active:scale-95 transition-all border border-rose-100"
            >
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        </div>
      )}

      {/* 위치 동의 팝업 */}
      {locationPopup && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setLocationPopup(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-sky-100 rounded-2xl"><MapPin size={24} className="text-sky-500" /></div>
              <div>
                <h3 className="font-black text-slate-900">위치 정보 사용</h3>
                <p className="text-[11px] text-slate-500 font-bold">정확한 날씨와 촬영 지수를 위해</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              현재 위치 기반으로 정확한 날씨와 촬영 지수를 제공합니다. 위치 정보는 날씨 조회에만 사용되며 저장되지 않습니다.
            </p>
            <div className="space-y-2">
              <button onClick={() => requestLocation('always')} className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-bold text-sm active:scale-95 transition-all shadow-md">
                항상 허용
              </button>
              <button onClick={() => requestLocation('session')} className="w-full py-3.5 rounded-2xl bg-sky-50 text-sky-600 font-bold text-sm active:scale-95 transition-all border border-sky-100">
                앱 사용 중에만 허용
              </button>
              <button onClick={() => { setLocationPopup(false); }} className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm active:scale-95 transition-all">
                거부
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-3 font-bold">현재: {weather.location} 기준</p>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-10">

        {/* 탭 메뉴 */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* 인사말 + 문구 버튼 */}
            <div className="flex items-center justify-between px-1">
              {profile.nickname && (
                <p className="text-[11px] font-black text-slate-700">안녕하세요! <span className="text-sky-500">{profile.nickname}</span>님 :)</p>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingTemplateId('list')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-600 active:scale-95 transition-all">
                  <FileText size={12} />
                  <span className="text-[10px] font-black">신청문구</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-sky-200 text-sky-700 text-[9px] font-black">{templates.length}</span>
                </button>
                <button onClick={() => setEditingFtcTemplateId('list')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 active:scale-95 transition-all">
                  <FileText size={12} />
                  <span className="text-[10px] font-black">공정위 문구</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-orange-200 text-orange-700 text-[9px] font-black">{ftcTemplates.length}</span>
                </button>
              </div>
            </div>
            {/* 방문일정 미등록 알림 배너 */}
            {(() => {
              const now = new Date();
              const unscheduled = schedules.filter(s => {
                if (s.isDone || s.visitDate) return false;
                if (!s.createdAt) return false;
                const created = new Date(s.createdAt);
                const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                return diffDays >= 2;
              });
              if (unscheduled.length === 0) return null;
              return (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black text-violet-500 px-1 flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-violet-400" />
                    방문 일정을 잡아주세요!
                  </p>
                  {unscheduled.map(item => (
                    <button key={item.id} onClick={() => setSelectedScheduleId(item.id)} className="w-full flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl text-left active:scale-[0.99] transition-all bg-violet-50 border border-violet-200 shadow-sm">
                      <p className="flex-1 text-sm font-bold text-slate-700 truncate">{item.title}</p>
                      {item.brand && item.brand !== '기타' && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black border ${getBrandBadge(item.brand)}`}>{item.brand}</span>}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* 마감 알림 배너 */}
            {(() => {
              const urgent = schedules.filter(s => {
                if (s.isDone) return false;
                const diff = getDday(s.deadline);
                return diff !== null && diff >= 0 && diff <= 3;
              }).sort((a, b) => getDday(a.deadline) - getDday(b.deadline));
              if (urgent.length === 0) return null;
              return (
                <div className="space-y-2">
                  {urgent.map(item => {
                    const d = getDday(item.deadline);
                    const isToday = d === 0;
                    return (
                      <button key={item.id} onClick={() => setSelectedScheduleId(item.id)} className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-2xl text-left active:scale-[0.99] transition-all ${isToday ? 'bg-rose-50 border border-rose-200 shadow-rose-100' : 'bg-amber-50 border border-amber-200 shadow-amber-100'} shadow-md`}>
                        <div className={`p-2 rounded-xl ${isToday ? 'bg-rose-100' : 'bg-amber-100'}`}>
                          <AlertTriangle size={18} className={isToday ? 'text-rose-500' : 'text-amber-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-black ${isToday ? 'text-rose-500' : 'text-amber-500'}`}>
                            {isToday ? '오늘 마감!' : `D-${d} 마감 임박`}
                          </p>
                          <p className="text-sm font-bold text-slate-700 truncate">{item.title}</p>
                        </div>
                        {item.brand && item.brand !== '기타' && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black border ${getBrandBadge(item.brand)}`}>{item.brand}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* 3일치 할일 */}
            {(() => {
              const _now = new Date();
              const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const days = [0, 1, 2].map(offset => {
                const d = new Date(_now);
                d.setDate(d.getDate() + offset);
                return { date: toStr(d), label: offset === 0 ? '오늘' : offset === 1 ? '내일' : '모레', day: d };
              });
              const allEmpty = days.every(({ date }) => schedules.filter(s => !s.isDone && (s.deadline === date || s.visitDate === date)).length === 0);
              return (
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-sky-600 px-1">📋 3일 일정</p>
                  {allEmpty ? (
                    <div className="w-full p-4 rounded-2xl bg-sky-50 border border-sky-100 text-center text-xs text-sky-300 font-bold">
                      3일간 예정된 일정이 없어요 🎉
                    </div>
                  ) : days.map(({ date, label, day }) => {
                    const tasks = schedules.filter(s => !s.isDone && (s.deadline === date || s.visitDate === date))
                      .sort((a, b) => {
                        // 체험일이 오늘인 것 우선, 그 안에서 시간순
                        const aVisit = a.visitDate === date ? 0 : 1;
                        const bVisit = b.visitDate === date ? 0 : 1;
                        if (aVisit !== bVisit) return aVisit - bVisit;
                        const aTime = (a.visitSetTime || '99:99').replace(':', '');
                        const bTime = (b.visitSetTime || '99:99').replace(':', '');
                        return aTime.localeCompare(bTime);
                      });
                    if (tasks.length === 0) return null;
                    const isToday = label === '오늘';
                    return (
                      <div key={date} className="space-y-1.5">
                        <p className="text-[10px] font-black px-1 text-slate-400">
                          {isToday ? '🟡' : '⚪'} {label} <span className="font-medium">{day.getMonth() + 1}/{day.getDate()}</span>
                          <span className={`ml-1 ${isToday ? 'text-amber-500' : 'text-slate-400'}`}>({tasks.length})</span>
                        </p>
                        {tasks.map(task => (
                          <button key={task.id} onClick={() => setSelectedScheduleId(task.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.99] transition-all shadow-sm ${isToday ? 'bg-amber-50 border border-amber-200 shadow-amber-100' : 'bg-slate-50 border border-slate-200 shadow-slate-100'}`}>
                            {task.brand && task.brand !== '기타' && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black border ${getBrandBadge(task.brand)}`}>{task.brand}</span>}
                            <p className="flex-1 text-sm font-bold text-slate-700 truncate">{task.title}</p>
                            {task.visitDate === date && task.visitSetTime && (() => {
                              const now = new Date(); const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                              if (date < todayStr) return null;
                              if (isToday) { const [hh, mm] = (task.visitSetTime || '').split(':').map(Number); if (now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= (mm || 0))) return null; }
                              return <span className={`shrink-0 text-[10px] font-black ${isToday ? 'text-amber-600' : 'text-slate-500'}`}>{task.visitSetTime}</span>;
                            })()}
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isToday ? 'text-amber-600 bg-amber-100' : 'text-slate-500 bg-slate-100'}`}>
                              {task.visitDate === date ? '체험일' : '마감일'}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* 일정 리스트 - 브랜드별 분할 */}
            <section>
              <div className="flex items-center gap-3 mb-4 px-1">
                <button onClick={() => setHomeSchedulesOpen(o => !o)} className="flex items-center gap-2 flex-1">
                  <h3 className="text-[13px] font-black text-slate-500 uppercase tracking-tighter">Schedules</h3>
                  <ChevronRight size={13} className={`text-slate-500 transition-transform ${homeSchedulesOpen ? 'rotate-90' : ''}`} />
                </button>
                <button onClick={() => setActiveTab('scheduleManage')} className="flex items-center gap-1 text-[10px] font-bold text-sky-500 active:scale-95 transition-all">
                  전체 관리 <ChevronRight size={12} />
                </button>
              </div>
              {homeSchedulesOpen && (() => {
                const ongoing = schedules.filter(s => !s.isDone && (getDday(s.deadline) === null || getDday(s.deadline) >= 0));
                const brandGroups = {};
                ongoing.forEach(item => {
                  const brand = item.brand || '기타';
                  if (!brandGroups[brand]) brandGroups[brand] = [];
                  brandGroups[brand].push(item);
                });
                // 각 브랜드 그룹 내에서: 체험일 있는 건 날짜+시간순 → 없으면 마감일순 → 둘 다 없으면 맨 아래
                Object.values(brandGroups).forEach(arr => arr.sort((a, b) => {
                  const dateA = a.visitDate || '';
                  const dateB = b.visitDate || '';
                  if (dateA && dateB) {
                    const cmp = dateA.localeCompare(dateB);
                    if (cmp !== 0) return cmp;
                    // 같은 날이면 시간순
                    const tA = (a.visitSetTime || '99:99').replace(':', '');
                    const tB = (b.visitSetTime || '99:99').replace(':', '');
                    return tA.localeCompare(tB);
                  }
                  if (dateA && !dateB) return -1;
                  if (!dateA && dateB) return 1;
                  const dlA = a.deadline || '';
                  const dlB = b.deadline || '';
                  if (dlA && dlB) return dlA.localeCompare(dlB);
                  if (dlA && !dlB) return -1;
                  if (!dlA && dlB) return 1;
                  return 0;
                }));
                const brandNames = Object.keys(brandGroups);
                const brandColors = {
                  '리뷰노트': { bg: 'bg-white', border: 'border-l-4 border-l-teal-500 border-slate-100', text: 'text-teal-600', badge: 'bg-teal-500 text-white', dot: 'bg-teal-500', typeText: 'text-teal-500' },
                  '강남맛집': { bg: 'bg-white', border: 'border-l-4 border-l-orange-500 border-slate-100', text: 'text-orange-600', badge: 'bg-orange-500 text-white', dot: 'bg-orange-500', typeText: 'text-orange-500' },
                  '레뷰': { bg: 'bg-white', border: 'border-l-4 border-l-rose-500 border-slate-100', text: 'text-rose-600', badge: 'bg-rose-500 text-white', dot: 'bg-rose-500', typeText: 'text-rose-500' },
                  '슈퍼멤버스': { bg: 'bg-white', border: 'border-l-4 border-l-violet-500 border-slate-100', text: 'text-violet-600', badge: 'bg-violet-500 text-white', dot: 'bg-violet-500', typeText: 'text-violet-500' },
                  '디너의여왕': { bg: 'bg-white', border: 'border-l-4 border-l-amber-500 border-slate-100', text: 'text-amber-600', badge: 'bg-amber-500 text-white', dot: 'bg-amber-500', typeText: 'text-amber-500' },
                  '리뷰플레이스': { bg: 'bg-white', border: 'border-l-4 border-l-emerald-500 border-slate-100', text: 'text-emerald-600', badge: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', typeText: 'text-emerald-500' },
                  'WE:U': { bg: 'bg-white', border: 'border-l-4 border-l-cyan-500 border-slate-100', text: 'text-cyan-600', badge: 'bg-cyan-500 text-white', dot: 'bg-cyan-500', typeText: 'text-cyan-500' },
                  '기타': { bg: 'bg-white', border: 'border-l-4 border-l-slate-400 border-slate-100', text: 'text-slate-600', badge: 'bg-slate-400 text-white', dot: 'bg-slate-400', typeText: 'text-slate-500' },
                };
                const getColor = (brand) => brandColors[brand] || { bg: 'bg-white', border: 'border-l-4 border-l-blue-500 border-slate-100', text: 'text-blue-600', badge: 'bg-blue-500 text-white', dot: 'bg-blue-500', typeText: 'text-blue-500' };
                const colClass = brandNames.length <= 2 ? 'sm:grid-cols-2' : brandNames.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';

                return brandNames.length > 0 ? (
                  <div className={`grid grid-cols-2 ${colClass} gap-2 sm:gap-3 items-start`}>
                    {brandNames.map(brand => {
                      const c = getColor(brand);
                      return (
                        <div key={brand} className={`jelly-card p-2.5 sm:p-4 ${c.bg} ${c.border} border shadow-sm`}>
                          <button onClick={() => toggleBrand(brand)} className="w-full flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${c.dot}`}></span>
                            <h4 className={`text-[10px] sm:text-xs font-black ${c.text} truncate`}>{brand}</h4>
                            <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>{brandGroups[brand].length}</span>
                            <ChevronRight size={11} className={`${c.text} transition-transform shrink-0 ${collapsedBrands[brand] ? '' : 'rotate-90'}`} />
                          </button>
                          {!collapsedBrands[brand] && <div className="space-y-2">
                            {(expandedBrands[brand] ? brandGroups[brand] : brandGroups[brand].slice(0, 3)).map(item => {
                              const dday = getDdayLabel(item);
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => setSelectedScheduleId(item.id)}
                                  className="w-full flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/80 active:bg-white transition-all text-left shadow-sm"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[9px] sm:text-[10px] font-bold ${c.typeText} mb-0.5`}>{item.type}</p>
                                    <div className="flex items-center gap-1">
                                      {item.visitDate
                                        ? <span className={`shrink-0 w-2 h-2 rounded-full ${c.dot}`}></span>
                                        : <span className={`shrink-0 w-2 h-2 rounded-full border-2 ${c.dot.replace('bg-', 'border-')}`}></span>
                                      }
                                      <p className="text-sm font-bold text-slate-700 truncate">{item.title}</p>
                                    </div>
                                  </div>
                                  {dday && <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                                </button>
                              );
                            })}
                            {brandGroups[brand].length > 3 && (
                              <button
                                onClick={() => toggleExpandBrand(brand)}
                                className={`w-full py-1.5 rounded-lg text-[9px] font-bold ${c.text} bg-slate-50 border border-slate-200 active:opacity-70 transition-all`}
                              >
                                {expandedBrands[brand] ? '▲ 접기' : `▼ 더보기 +${brandGroups[brand].length - 3}`}
                              </button>
                            )}
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="jelly-card p-8 text-center text-slate-500 text-sm font-bold">진행중인 일정이 없습니다</div>
                );
              })()}
            </section>
          </div>
        )}

        {/* 스케줄 전체 관리 */}
        {activeTab === 'scheduleManage' && (() => {
          const { year, month } = calendarMonth;
          const platformMatch = (s) => platformFilter === 'all' || (s.platforms || []).includes(platformFilter);
          const monthFiltered = schedules.filter(s => {
            const d = getScheduleMonthDate(s);
            if (!d) return false;
            return d.getFullYear() === year && d.getMonth() === month && platformMatch(s);
          });
          const yearFiltered = schedules.filter(s => {
            const d = getScheduleMonthDate(s);
            if (!d) return false;
            return d.getFullYear() === year && platformMatch(s);
          });
          const mOngoing = monthFiltered.filter(s => !s.isDone);
          const mDone = monthFiltered.filter(s => s.isDone);

          return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setActiveTab('home')} className="p-2 bg-sky-50 rounded-xl"><ChevronLeft size={20} /></button>
                <h3 className="text-lg font-black text-slate-900">스케줄 관리</h3>
              </div>

              {/* 연도 네비게이션 */}
              <div className="flex justify-center items-center gap-4">
                <button onClick={() => setCalendarMonth(prev => ({ ...prev, year: prev.year - 1 }))} className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-slate-600"><ChevronLeft size={16} /></button>
                <h3 className="font-black text-lg text-slate-800">{year}년</h3>
                <button onClick={() => setCalendarMonth(prev => ({ ...prev, year: prev.year + 1 }))} className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-slate-600"><ChevronRight size={16} /></button>
              </div>

              {/* 플랫폼 필터 - 프로필 활성 채널만 표시 */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: 'all',      label: '전체',       profileKey: null },
                  { key: 'blog',     label: '블로그',     profileKey: 'blogUrl' },
                  { key: 'blogClip', label: '클립',profileKey: 'blogClipUrl' },
                  { key: 'insta',    label: '인스타',     profileKey: 'instaId' },
                  { key: 'reels',    label: '릴스',       profileKey: 'reelsUrl' },
                  { key: 'facebook', label: '페이스북',   profileKey: 'facebookUrl' },
                  { key: 'youtube',  label: '유튜브',     profileKey: 'youtubeUrl' },
                ].filter(({ profileKey }) => !profileKey || profile.enabledPlatforms?.[profileKey]).map(({ key, label }) => (
                  <button key={key} onClick={() => setPlatformFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${platformFilter === key ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 월 선택 탭 */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                  const mCount = schedules.filter(s => {
                    const d = getScheduleMonthDate(s);
                    return d && d.getFullYear() === year && d.getMonth() === i;
                  }).length;
                  return (
                    <button
                      key={i}
                      onClick={() => setCalendarMonth(prev => ({ ...prev, month: i }))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all relative ${month === i ? 'bg-sky-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-sky-200'}`}
                    >
                      {i + 1}월
                      {mCount > 0 && <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${month === i ? 'bg-white text-sky-500' : 'bg-sky-100 text-sky-500'}`}>{mCount}</span>}
                    </button>
                  );
                })}
              </div>

              {/* 요약 */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="jelly-card p-3 sm:p-4 text-center">
                  <p className="text-[8px] sm:text-[9px] font-black text-slate-500 mb-1">전체</p>
                  <p className="text-lg sm:text-2xl font-black text-slate-800">{monthFiltered.length}</p>
                </div>
                <div className="jelly-card p-3 sm:p-4 text-center">
                  <p className="text-[8px] sm:text-[9px] font-black text-sky-400 mb-1">진행중</p>
                  <p className="text-lg sm:text-2xl font-black text-sky-600">{mOngoing.length}</p>
                </div>
                <div className="jelly-card p-3 sm:p-4 text-center">
                  <p className="text-[8px] sm:text-[9px] font-black text-emerald-400 mb-1">완료</p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600">{mDone.length}</p>
                </div>
              </div>

              {/* 진행중 */}
              <section>
                <button onClick={() => setManageOngoingOpen(o => !o)} className="w-full flex items-center justify-between px-1 mb-2">
                  <h4 className="text-xs font-black text-sky-500 flex items-center gap-1"><Clock size={14} /> 진행중 ({mOngoing.length})</h4>
                  <ChevronRight size={14} className={`text-sky-400 transition-transform ${manageOngoingOpen ? 'rotate-90' : ''}`} />
                </button>
                {manageOngoingOpen && (
                  <div className="jelly-card overflow-hidden divide-y divide-slate-100">
                    {mOngoing.length > 0 ? (
                      mOngoing.map(item => {
                        const dday = getDdayLabel(item);
                        return (
                          <div key={item.id} className="flex items-center gap-1 pr-2 active:bg-sky-50 transition-all">
                            <button onClick={() => setSelectedScheduleId(item.id)} className="flex-1 flex items-center gap-2 px-3 py-3 text-left min-w-0">
                              {item.brand && <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black border ${getBrandBadge(item.brand)}`}>{item.brand}</span>}
                              <span className="text-xs font-bold truncate flex-1 text-slate-700">{item.title}</span>
                              {dday && <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                            </button>
                            <button onClick={() => setConfirmDeleteId(item.id)} className="shrink-0 p-1.5 rounded-lg text-rose-300 active:scale-90"><Trash2 size={13} /></button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm font-bold">진행중인 일정이 없습니다</div>
                    )}
                  </div>
                )}
              </section>

              {/* 완료 */}
              <section>
                <button onClick={() => setManageDoneOpen(o => !o)} className="w-full flex items-center justify-between px-1 mb-2">
                  <h4 className="text-xs font-black text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> 완료 ({mDone.length})</h4>
                  <ChevronRight size={14} className={`text-emerald-400 transition-transform ${manageDoneOpen ? 'rotate-90' : ''}`} />
                </button>
                {manageDoneOpen && (
                  <div className="jelly-card overflow-hidden divide-y divide-slate-100">
                    {mDone.length > 0 ? (
                      mDone.map(item => (
                        <div key={item.id} className="flex items-center gap-1 pr-2 active:bg-sky-50 transition-all">
                          <button onClick={() => setSelectedScheduleId(item.id)} className="flex-1 flex items-center gap-2 px-3 py-3 text-left min-w-0">
                            {item.brand && <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black border ${getBrandBadge(item.brand)}`}>{item.brand}</span>}
                            <span className="text-xs font-bold truncate flex-1 text-slate-500 line-through">{item.title}</span>
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(item.id)} className="shrink-0 p-1.5 rounded-lg text-rose-300 active:scale-90"><Trash2 size={13} /></button>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 text-sm font-bold">완료된 일정이 없습니다</div>
                    )}
                  </div>
                )}
              </section>

              {/* 협찬 분석 */}
              <section>
                <h4 className="text-xs font-black text-slate-500 mb-3 px-1 flex items-center gap-1 uppercase tracking-tighter"><BarChart3 size={14} /> {year}년 {month + 1}월 협찬 분석</h4>
                {(() => {
                  const brandStats = {};
                  const typeStats = {};
                  monthFiltered.forEach(s => {
                    const brand = s.brand || '기타';
                    const type = s.type || '기타';
                    brandStats[brand] = (brandStats[brand] || 0) + 1;
                    typeStats[type] = (typeStats[type] || 0) + 1;
                  });
                  const brandColors = {
                    '리뷰노트': 'bg-teal-400', '강남맛집': 'bg-orange-400', '레뷰': 'bg-pink-400',
                    '슈퍼멤버스': 'bg-violet-400', '디너의여왕': 'bg-amber-400', '기타': 'bg-slate-400',
                  };
                  const typeColors = {
                    '맛집': 'bg-orange-400', '뷰티': 'bg-rose-400', '숙박': 'bg-indigo-400',
                    '체험': 'bg-emerald-400', '배송': 'bg-sky-400', '기타': 'bg-slate-400',
                  };
                  const maxBrand = Math.max(...Object.values(brandStats), 1);
                  const maxType = Math.max(...Object.values(typeStats), 1);

                  return monthFiltered.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {/* 브랜드별 */}
                      <div className="jelly-card p-3 sm:p-4">
                        <p className="text-[10px] font-black text-slate-500 mb-3">브랜드별</p>
                        <div className="space-y-2.5">
                          {Object.entries(brandStats).sort((a, b) => b[1] - a[1]).map(([brand, count]) => (
                            <div key={brand}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">{brand}</span>
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-500">{count}건</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${brandColors[brand] || 'bg-blue-400'}`} style={{ width: `${(count / maxBrand) * 100}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* 카테고리별 */}
                      <div className="jelly-card p-3 sm:p-4">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 mb-3">카테고리별</p>
                        <div className="space-y-2.5">
                          {Object.entries(typeStats).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                            <div key={type}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">{type}</span>
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-500">{count}건</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${typeColors[type] || 'bg-blue-400'}`} style={{ width: `${(count / maxType) * 100}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="jelly-card p-6 text-center text-slate-500 text-sm font-bold">이번 달 데이터가 없습니다</div>
                  );
                })()}
              </section>

              {/* 연간 분석 */}
              <section>
                <h4 className="text-xs font-black text-slate-500 mb-3 px-1 flex items-center gap-1 uppercase tracking-tighter"><BarChart3 size={14} /> {year}년 연간 분석</h4>
                {(() => {
                  if (yearFiltered.length === 0) return <div className="jelly-card p-6 text-center text-slate-500 text-sm font-bold">{year}년 데이터가 없습니다</div>;
                  const yBrandStats = {};
                  const yTypeStats = {};
                  yearFiltered.forEach(s => {
                    const brand = s.brand || '기타';
                    const type = s.type || '기타';
                    yBrandStats[brand] = (yBrandStats[brand] || 0) + 1;
                    yTypeStats[type] = (yTypeStats[type] || 0) + 1;
                  });
                  // 월별 건수
                  const monthlyData = Array.from({ length: 12 }, (_, i) => {
                    return yearFiltered.filter(s => {
                      const d = getScheduleMonthDate(s);
                      return d && d.getMonth() === i;
                    }).length;
                  });
                  const maxMonthly = Math.max(...monthlyData, 1);
                  const yDone = yearFiltered.filter(s => s.isDone).length;
                  const brandColors = {
                    '리뷰노트': 'bg-teal-400', '강남맛집': 'bg-orange-400', '레뷰': 'bg-pink-400',
                    '슈퍼멤버스': 'bg-violet-400', '디너의여왕': 'bg-amber-400', '기타': 'bg-slate-400',
                  };

                  return (
                    <div className="space-y-4">
                      {/* 연간 요약 카드 */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="jelly-card p-2.5 sm:p-3 text-center">
                          <p className="text-[8px] sm:text-[9px] font-black text-slate-500 mb-1">총 협찬</p>
                          <p className="text-lg sm:text-xl font-black text-slate-800">{yearFiltered.length}<span className="text-[9px] sm:text-[10px] text-slate-500 ml-0.5">건</span></p>
                        </div>
                        <div className="jelly-card p-2.5 sm:p-3 text-center">
                          <p className="text-[8px] sm:text-[9px] font-black text-emerald-400 mb-1">완료율</p>
                          <p className="text-lg sm:text-xl font-black text-emerald-600">{yearFiltered.length > 0 ? Math.round((yDone / yearFiltered.length) * 100) : 0}<span className="text-[9px] sm:text-[10px] text-emerald-400 ml-0.5">%</span></p>
                        </div>
                        <div className="jelly-card p-2.5 sm:p-3 text-center">
                          <p className="text-[8px] sm:text-[9px] font-black text-sky-400 mb-1">월 평균</p>
                          <p className="text-lg sm:text-xl font-black text-sky-600">{(yearFiltered.length / 12).toFixed(1)}<span className="text-[9px] sm:text-[10px] text-sky-400 ml-0.5">건</span></p>
                        </div>
                      </div>

                      {/* 월별 추이 차트 */}
                      <div className="jelly-card p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[9px] sm:text-[10px] font-black text-slate-600">월별 추이</p>
                          <p className="text-[9px] font-bold text-slate-500">협찬 건수</p>
                        </div>
                        {/* 건수 라벨 행 */}
                        <div className="flex gap-0.5 sm:gap-1 mb-1">
                          {monthlyData.map((count, i) => (
                            <div key={i} className="flex-1 text-center">
                              <span className={`text-[8px] font-black leading-none ${count > 0 ? (month === i ? 'text-sky-600' : 'text-slate-500') : 'text-transparent'}`}>{count || '0'}</span>
                            </div>
                          ))}
                        </div>
                        {/* 막대 행 */}
                        <div className="flex items-end gap-0.5 sm:gap-1" style={{ height: '72px' }}>
                          {monthlyData.map((count, i) => {
                            const isNow = month === i;
                            const barH = count > 0 ? Math.max(Math.round((count / maxMonthly) * 72), 8) : 3;
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-t-xl transition-all duration-700"
                                style={{
                                  height: `${barH}px`,
                                  background: isNow
                                    ? 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 45%, #0284c7 100%)'
                                    : count > 0
                                      ? 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 55%, #93c5fd 100%)'
                                      : 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                                  boxShadow: isNow
                                    ? '0 4px 10px rgba(14,165,233,0.35), inset 0 1px 0 rgba(255,255,255,0.55)'
                                    : count > 0 ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* 월 라벨 행 */}
                        <div className="flex gap-0.5 sm:gap-1 mt-1.5">
                          {monthlyData.map((_, i) => (
                            <div key={i} className="flex-1 text-center">
                              <span className={`text-[8px] font-bold leading-none ${month === i ? 'text-sky-600' : 'text-slate-500'}`}>{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 연간 브랜드 비율 (도넛 스타일 바) */}
                      <div className="jelly-card p-3 sm:p-4">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 mb-3">브랜드 비율</p>
                        <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                          {Object.entries(yBrandStats).sort((a, b) => b[1] - a[1]).map(([brand, count]) => (
                            <div key={brand} className={`${brandColors[brand] || 'bg-blue-400'} transition-all`} style={{ width: `${(count / yearFiltered.length) * 100}%` }} title={`${brand}: ${count}건`}></div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-2">
                          {Object.entries(yBrandStats).sort((a, b) => b[1] - a[1]).map(([brand, count]) => (
                            <span key={brand} className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-500">
                              <span className={`w-2 h-2 rounded-full ${brandColors[brand] || 'bg-blue-400'}`}></span>
                              {brand} {Math.round((count / yearFiltered.length) * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          );
        })()}


        {activeTab === 'tool' && (
          <AppErrorBoundary key="tool">
          <div className="animate-in fade-in duration-300">

            {/* ── 허브 (카테고리 선택) ── */}
            {!toolSubTab && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-800 mb-2">도구</h3>
                <button onClick={() => { setTextToCount(''); setEditingTextId(null); setToolSubTab('count'); }} className="w-full jelly-card p-5 flex items-center gap-4 active:scale-[0.98] transition-all text-left">
                  <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Calculator size={24} className="text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800">글자수 측정</p>
                    <p className="text-xs text-slate-500 mt-0.5">공백 포함/제외 글자 수 확인</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 shrink-0" />
                </button>
                <button onClick={() => setToolSubTab('savedTexts')} className="w-full jelly-card p-5 flex items-center gap-4 active:scale-[0.98] transition-all text-left">
                  <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Save size={24} className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800">작성 글</p>
                    <p className="text-xs text-slate-500 mt-0.5">저장한 글 {savedTexts.length > 0 ? `${savedTexts.length}개` : '없음'}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 shrink-0" />
                </button>
                <button onClick={() => setToolSubTab('hashtags')} className="w-full jelly-card p-5 flex items-center gap-4 active:scale-[0.98] transition-all text-left">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Hash size={24} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800">해시태그</p>
                    <p className="text-xs text-slate-500 mt-0.5">분류별 해시태그 모음</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 shrink-0" />
                </button>
              </div>
            )}

            {/* ── 글자수 측정 ── */}
            {toolSubTab === 'count' && (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3">
                  <button onClick={() => setToolSubTab(null)} className="p-2 bg-sky-50 rounded-xl"><ChevronLeft size={20} /></button>
                  <h3 className="text-lg font-black text-slate-900">글자수 측정</h3>
                  <span className="ml-auto text-[10px] bg-sky-500 text-white px-3 py-1 rounded-full font-bold">1,500자 권장</span>
                </div>
                <textarea
                  className="w-full h-64 p-6 bg-white/60 backdrop-blur-md shadow-inner rounded-[32px] border border-white focus:bg-white focus:ring-2 focus:ring-sky-300 outline-none text-slate-600 leading-relaxed text-sm placeholder:font-bold placeholder:text-slate-500"
                  placeholder="파워블로거는 원고 내용으로 승부합니다. 여기에 내용을 적으세요!"
                  value={textToCount}
                  onChange={(e) => setTextToCount(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-sky-50 p-5 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-sky-400 mb-1">공백 포함</p>
                    <p className="text-2xl font-black text-sky-700">{textToCount.length}</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-slate-500 mb-1">공백 제외</p>
                    <p className="text-2xl font-black text-slate-800">{textToCount.replace(/\s+/g, '').length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      if (!textToCount.trim()) return;
                      const firstLine = textToCount.trim().split('\n')[0].trim();
                      let updated;
                      if (editingTextId) {
                        updated = savedTexts.map(t => t.id === editingTextId
                          ? { ...t, title: firstLine || '(제목 없음)', content: textToCount, savedAt: new Date().toISOString() }
                          : t
                        );
                      } else {
                        const newItem = { id: Date.now(), title: firstLine || '(제목 없음)', content: textToCount, savedAt: new Date().toISOString() };
                        updated = [newItem, ...savedTexts];
                      }
                      setSavedTexts(updated);
                      localStorage.setItem('blogger_saved_texts', JSON.stringify(updated));
                      setEditingTextId(null);
                      setShowSaveTextToast(true);
                    }}
                    disabled={!textToCount.trim()}
                    className="flex flex-col items-center justify-center gap-1 py-3 jelly-button text-white rounded-2xl font-black text-xs active:scale-95 transition-all shadow-md shadow-sky-200 disabled:opacity-40"
                  >
                    <Save size={15} /> 저장
                  </button>
                  <button
                    onClick={() => { if (textToCount.trim()) copyToClipboard(textToCount); }}
                    disabled={!textToCount.trim()}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-sky-50 text-sky-500 rounded-2xl font-black text-xs active:scale-95 transition-all disabled:opacity-40"
                  >
                    <Copy size={15} /> 복사
                  </button>
                  <button
                    onClick={() => { setTextToCount(''); setEditingTextId(null); setToolSubTab(null); }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs active:scale-95 transition-all"
                  >
                    <X size={15} /> 닫기
                  </button>
                  <button
                    onClick={() => { setTextToCount(''); setEditingTextId(null); }}
                    disabled={!textToCount.trim()}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-rose-50 text-rose-400 rounded-2xl font-black text-xs active:scale-95 transition-all disabled:opacity-40"
                  >
                    <Trash2 size={15} /> 삭제
                  </button>
                </div>
              </div>
            )}

            {/* ── 작성 글 ── */}
            {toolSubTab === 'savedTexts' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3">
                  <button onClick={() => setToolSubTab(null)} className="p-2 bg-sky-50 rounded-xl"><ChevronLeft size={20} /></button>
                  <h3 className="text-lg font-black text-slate-900">작성 글</h3>
                  <span className="ml-auto text-xs text-slate-500 font-bold">{savedTexts.length}개 저장됨</span>
                </div>
                {savedTexts.length === 0 ? (
                  <div className="jelly-card p-12 text-center">
                    <p className="text-slate-500 font-bold text-sm">저장된 글이 없어요</p>
                    <button onClick={() => setToolSubTab('count')} className="mt-4 text-xs text-sky-500 font-bold underline underline-offset-2">글자수 측정에서 저장하기</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedTexts.map(item => (
                      <div key={item.id} className="jelly-card p-4 flex items-start gap-3">
                        <button
                          onClick={() => { setTextToCount(item.content); setEditingTextId(item.id); setToolSubTab('count'); }}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="font-bold text-slate-700 truncate">{item.title || '(제목 없음)'}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{new Date(item.savedAt).toLocaleDateString('ko-KR')} · {item.content.length}자</p>
                        </button>
                        <button onClick={() => setConfirmDeleteTextId(item.id)}
                          className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-all active:scale-90">
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 해시태그 ── */}
            {toolSubTab === 'hashtags' && (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-3">
                  <button onClick={() => setToolSubTab(null)} className="p-2 bg-sky-50 rounded-xl"><ChevronLeft size={20} /></button>
                  <h3 className="text-lg font-black text-slate-900">해시태그</h3>
                  <button onClick={() => setShowAddCat(!showAddCat)} className="ml-auto text-[10px] font-bold text-sky-500 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 active:scale-95 transition-all">
                    {showAddCat ? '닫기' : '+ 분류 추가'}
                  </button>
                </div>
                {showAddCat && (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-sky-300"
                      placeholder="새 분류명 입력 (예: 운동, 여행...)"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCatName.trim() && !hashtags[newCatName.trim()]) {
                          saveHashtags({ ...hashtags, [newCatName.trim()]: [] });
                          setNewCatName(''); setShowAddCat(false);
                        }
                      }}
                    />
                    <button onClick={() => {
                      if (!newCatName.trim() || hashtags[newCatName.trim()]) return;
                      saveHashtags({ ...hashtags, [newCatName.trim()]: [] });
                      setNewCatName(''); setShowAddCat(false);
                    }} className="px-4 py-2.5 jelly-button text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all whitespace-nowrap">추가</button>
                  </div>
                )}
                <div className="space-y-4">
                  {Object.entries(hashtags).map(([cat, tags]) => {
                    const catColors = { '맛집': 'border-orange-200 bg-orange-50', '뷰티': 'border-rose-200 bg-rose-50', '카페': 'border-amber-200 bg-amber-50', '숙박': 'border-indigo-200 bg-indigo-50', '체험': 'border-teal-200 bg-teal-50' };
                    const dotColors = { '맛집': 'bg-orange-400', '뷰티': 'bg-rose-400', '카페': 'bg-amber-400', '숙박': 'bg-indigo-400', '체험': 'bg-teal-400' };
                    return (
                      <div key={cat} className={`rounded-2xl border p-3 sm:p-4 ${catColors[cat] || 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dotColors[cat] || 'bg-slate-400'}`}></span>
                            {renamingCat === cat ? (
                              <input
                                className="px-2 py-0.5 rounded-lg bg-white border border-sky-300 text-xs font-bold outline-none w-20"
                                value={renameCatValue}
                                onChange={e => setRenameCatValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && renameCatValue.trim() && renameCatValue.trim() !== cat && !hashtags[renameCatValue.trim()]) {
                                    const entries = Object.entries(hashtags).map(([k, v]) => k === cat ? [renameCatValue.trim(), v] : [k, v]);
                                    saveHashtags(Object.fromEntries(entries)); setRenamingCat(null);
                                  }
                                  if (e.key === 'Escape') setRenamingCat(null);
                                }}
                                onBlur={() => {
                                  if (renameCatValue.trim() && renameCatValue.trim() !== cat && !hashtags[renameCatValue.trim()]) {
                                    const entries = Object.entries(hashtags).map(([k, v]) => k === cat ? [renameCatValue.trim(), v] : [k, v]);
                                    saveHashtags(Object.fromEntries(entries));
                                  }
                                  setRenamingCat(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <h4 className="text-xs font-black text-slate-700">{cat}</h4>
                            )}
                            <span className="text-[9px] font-bold text-slate-500">{tags.length}개</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => copyToClipboard(tags.join(' '))} className="text-[9px] font-bold text-sky-500 bg-white px-2 py-1 rounded-lg border border-sky-100 active:scale-95 transition-all">전체 복사</button>
                            {editingHashtagCat === cat && (
                              <>
                                <button onClick={() => { setRenamingCat(cat); setRenameCatValue(cat); }} className="text-[9px] font-bold text-amber-500 bg-white px-2 py-1 rounded-lg border border-amber-100 active:scale-95 transition-all">이름 변경</button>
                                <button onClick={() => {
                                  if (window.confirm(`'${cat}' 분류를 삭제할까요?`)) {
                                    const updated = { ...hashtags }; delete updated[cat];
                                    saveHashtags(updated); setEditingHashtagCat(null);
                                  }
                                }} className="text-[9px] font-bold text-rose-500 bg-white px-2 py-1 rounded-lg border border-rose-100 active:scale-95 transition-all">분류 삭제</button>
                              </>
                            )}
                            <button onClick={() => setEditingHashtagCat(editingHashtagCat === cat ? null : cat)} className="text-[9px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100 active:scale-95 transition-all">
                              {editingHashtagCat === cat ? '완료' : '편집'}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, i) => (
                            <button key={i}
                              onClick={() => editingHashtagCat === cat
                                ? saveHashtags({ ...hashtags, [cat]: tags.filter((_, idx) => idx !== i) })
                                : copyToClipboard(tag)
                              }
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${editingHashtagCat === cat ? 'bg-rose-100 text-rose-500 border border-rose-200' : 'bg-white text-slate-600 border border-slate-100'}`}
                            >
                              {editingHashtagCat === cat ? `${tag} ✕` : tag}
                            </button>
                          ))}
                        </div>
                        {editingHashtagCat === cat && (
                          <div className="flex gap-2 mt-2.5">
                            <input
                              className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-sky-300"
                              placeholder="#해시태그 입력"
                              value={newHashtag}
                              onChange={e => setNewHashtag(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && newHashtag.trim()) {
                                  const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
                                  saveHashtags({ ...hashtags, [cat]: [...tags, tag] }); setNewHashtag('');
                                }
                              }}
                            />
                            <button onClick={() => {
                              if (!newHashtag.trim()) return;
                              const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
                              saveHashtags({ ...hashtags, [cat]: [...tags, tag] }); setNewHashtag('');
                            }} className="px-3 py-2 jelly-button text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all">추가</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
          </AppErrorBoundary>
        )}

        {activeTab === 'calendar' && (
          <AppErrorBoundary key="calendar">
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
              <section className="jelly-card p-6 sm:w-[380px]">
                {/* 월 네비게이션 + 스케줄 관리 */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCalendarMonth(prev => {
                      const d = new Date(prev.year, prev.month - 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })} className="p-2 bg-sky-50 rounded-xl"><ChevronLeft size={18} /></button>
                    <h3 className="font-black text-lg text-slate-800">
                      {calendarMonth.year}년 {calendarMonth.month + 1}월
                    </h3>
                    <button onClick={() => setCalendarMonth(prev => {
                      const d = new Date(prev.year, prev.month + 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })} className="p-2 bg-sky-50 rounded-xl"><ChevronRight size={18} /></button>
                  </div>
                  <button onClick={() => setActiveTab('scheduleManage')} className="flex items-center gap-1 text-[10px] font-bold text-sky-500 px-3 py-1.5 bg-sky-50 rounded-xl active:scale-95 transition-all">
                    <ClipboardList size={12} /> 전체 관리
                  </button>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                    <div key={d} className={`text-center text-[10px] font-black py-1 ${d === '일' ? 'text-rose-400' : d === '토' ? 'text-blue-400' : 'text-slate-500'}`}>{d}</div>
                  ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const daySchedules = getSchedulesForDate(calendarMonth.year, calendarMonth.month, day);
                    const isToday = new Date().getFullYear() === calendarMonth.year && new Date().getMonth() === calendarMonth.month && new Date().getDate() === day;
                    const isSelected = selectedDate === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(isSelected ? null : day)}
                        className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center text-sm font-bold transition-all
                        ${isSelected ? 'jelly-button shadow-lg scale-105' : isToday ? 'bg-sky-50 text-sky-600 ring-2 ring-sky-200' : 'text-slate-700 hover:bg-sky-50'}
                        ${i % 7 === 0 ? 'text-rose-500' : ''} ${i % 7 === 6 ? 'text-blue-500' : ''}
                        ${isSelected && 'text-white'}
                      `}
                      >
                        {day}
                        {daySchedules.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {daySchedules.slice(0, 3).map((s, idx) => (
                              <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : s.isDone ? 'bg-slate-300' : s._dotType === 'deadline' ? 'bg-rose-400' : 'bg-sky-400'}`} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-sky-50">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[10px] font-bold text-slate-500">리뷰 마감일</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /><span className="text-[10px] font-bold text-slate-500">협찬 일정</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300" /><span className="text-[10px] font-bold text-slate-500">리뷰 완료</span></div>
                </div>
              </section>

              {/* 이번 달 일정 리스트 */}
              <section className="jelly-card p-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  {calendarMonth.month + 1}월 일정
                </h3>
                {(() => {
                  const monthEvents = [];
                  schedules.forEach(s => {
                    // 마감일
                    const d = parseDeadlineToDate(s.deadline);
                    if (d && d.getFullYear() === calendarMonth.year && d.getMonth() === calendarMonth.month) {
                      monthEvents.push({ ...s, _date: d, _label: '마감', _color: 'rose' });
                    }
                    // 체험일
                    if (s.visitDate) {
                      const [y, m, dd] = s.visitDate.split('-').map(Number);
                      if (y === calendarMonth.year && m - 1 === calendarMonth.month) {
                        monthEvents.push({ ...s, _date: new Date(y, m - 1, dd), _label: '체험', _color: 'sky' });
                      }
                    }
                  });
                  monthEvents.sort((a, b) => a._date - b._date);
                  // 중복 제거 (같은 스케줄 id + 같은 날짜)
                  const seen = new Set();
                  const unique = monthEvents.filter(e => {
                    const key = `${e.id}-${e._date.getTime()}-${e._label}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  if (unique.length === 0) return <p className="text-xs text-slate-500 font-bold text-center py-4">이번 달 일정이 없습니다</p>;
                  return (
                    <div ref={monthListRef} className="space-y-1.5 max-h-[300px] overflow-y-auto overflow-x-hidden">
                      {unique.map((e, i) => {
                        const isHighlighted = selectedDate && e._date.getDate() === selectedDate;
                        return (
                          <button key={i} data-day={e._date.getDate()} onClick={() => setSelectedScheduleId(e.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left ${isHighlighted ? 'bg-sky-100 scale-[1.02]' : 'bg-sky-50/50 active:bg-sky-100'}`}>
                            <span className={`text-[11px] font-black w-10 shrink-0 ${isHighlighted ? 'text-sky-600' : 'text-slate-500'}`}>{e._date.getMonth() + 1}/{e._date.getDate()}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0 ${e.isDone || getDday(e.deadline) < 0 ? 'bg-slate-300' : e._color === 'rose' ? 'bg-rose-400' : 'bg-sky-400'}`}>{e._label}</span>
                            <span className={`text-xs font-bold truncate flex-1 ${e.isDone || getDday(e.deadline) < 0 ? 'text-slate-500 line-through' : isHighlighted ? 'text-sky-700' : 'text-slate-700'}`}>{e.title}</span>
                            {e._label === '체험' && e.visitSetTime && !e.isDone && (() => {
                              const now = new Date(); const vd = e.visitDate;
                              const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                              if (vd < todayStr) return null;
                              if (vd === todayStr) { const [hh, mm] = (e.visitSetTime || '').split(':').map(Number); if (now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= (mm || 0))) return null; }
                              return <span className="shrink-0 text-[10px] font-black text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-lg">{e.visitSetTime}</span>;
                            })()}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </section>
            </div>

            {/* 선택한 날짜의 스케줄 */}
            {selectedDate && (
              <section className="space-y-3">
                <h4 className="text-sm font-black text-slate-500 px-1">
                  {calendarMonth.month + 1}월 {selectedDate}일 일정 ({selectedSchedules.length}건)
                </h4>
                {selectedSchedules.length === 0 ? (
                  <div className="jelly-card p-8 text-center">
                    <p className="text-sm text-slate-500 font-bold">이 날의 일정이 없습니다</p>
                  </div>
                ) : selectedSchedules.map(item => {
                  const dday = getDdayLabel(item);
                  return (
                    <div key={item.id} onClick={() => setSelectedScheduleId(item.id)} className="jelly-card p-5 cursor-pointer active:scale-[0.98] transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        {item.brand && item.brand !== '기타' && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getBrandBadge(item.brand)}`}>{item.brand}</span>}
                        <span className="text-[10px] font-bold text-sky-500">{item.type}</span>
                        {dday && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                      </div>
                      <h5 className={`font-black text-base mb-1 ${item.isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.title}</h5>
                      {item.address && <p className="text-xs text-slate-500">{item.address}</p>}
                    </div>
                  );
                })}
              </section>
            )}

          </div>
          </AppErrorBoundary>
        )}

      </main>

      {/* --- 신청 문구 전체 목록 팝업 --- */}
      {editingTemplateId === 'list' && (() => {
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setEditingTemplateId(null)}>
            <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-4 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-800">신청 문구 전체</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">≡ 길게 눌러 순서 변경</p>
                </div>
                <button onClick={() => setEditingTemplateId(null)} className="p-2 bg-sky-50 rounded-full"><X size={16} /></button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                <DndContext sensors={dndSensors} collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => {
                    if (over && active.id !== over.id) {
                      const oldIdx = templates.findIndex(t => t.id === active.id);
                      const newIdx = templates.findIndex(t => t.id === over.id);
                      saveTemplates(arrayMove(templates, oldIdx, newIdx));
                    }
                  }}>
                  <SortableContext items={templates.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {templates.map(t => (
                      <SortableTemplateItem key={t.id} t={t} onEdit={setEditingTemplateId} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <button onClick={() => { addTemplate(); }} className="w-full py-3 rounded-2xl text-sm font-bold text-sky-500 bg-sky-50 active:scale-95 transition-all flex items-center justify-center gap-1">
                <Plus size={14} /> 새 문구 추가
              </button>
            </div>
          </div>
        );
      })()}

      {/* --- 신청 문구 팝업 --- */}
      {editingTemplateId && editingTemplateId !== 'list' && (() => {
        const t = templates.find(x => x.id === editingTemplateId);
        if (!t) return null;
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={closeTemplateModal}>
            <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-5 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <button onClick={() => setEditingTemplateId('list')} className="flex items-center gap-1 text-sm font-bold text-slate-400 active:text-slate-600 transition-all">
                  <ChevronLeft size={16} /> 목록
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyToClipboard(t.content)} className="p-2 bg-sky-50 rounded-full text-sky-500 active:scale-90 transition-all"><Copy size={15} /></button>
                  <button onClick={closeTemplateModal} className="p-2 bg-sky-50 rounded-full"><X size={16} /></button>
                </div>
              </div>
              <input
                className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm font-bold"
                value={t.title}
                onChange={(e) => updateTemplate(t.id, 'title', e.target.value)}
                placeholder="문구 제목"
              />
              <textarea
                className="w-full px-4 py-4 rounded-2xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm h-40 resize-none leading-relaxed"
                value={t.content}
                onChange={(e) => updateTemplate(t.id, 'content', e.target.value)}
                placeholder="신청 문구를 작성하세요..."
              />
              <div className="flex gap-2">
                <button onClick={() => { localStorage.setItem('blogTemplates', JSON.stringify(templates)); }} className="flex-1 jelly-button text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-200">
                  <Save size={16} /> 저장
                </button>
                <button onClick={() => setConfirmDeleteTemplateId(t.id)} className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 플랜 업그레이드 모달 --- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 space-y-5 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-black text-slate-800">
                {upgradeReason === 'schedule' ? `이번 달 협찬 ${PLAN_LIMITS.schedule[userPlan]}건 한도 초과` : `템플릿 ${PLAN_LIMITS.template[userPlan]}개 한도 초과`}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                현재 <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${PLAN_META[userPlan].color}`}>{PLAN_META[userPlan].label}</span> 플랜이에요
              </p>
            </div>
            <div className="space-y-3">
              {[
                { plan: 'standard', price: '월 4,900원', schedules: '월 20건', templates: '템플릿 4개' },
                { plan: 'pro',      price: '월 9,900원', schedules: '무제한',   templates: '템플릿 무제한' },
              ].map(({ plan, price, schedules, templates: tpls }) => (
                <div key={plan} className={`p-4 rounded-2xl border-2 ${plan === 'pro' ? 'border-amber-300 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${PLAN_META[plan].color}`}>{PLAN_META[plan].label}</span>
                    <span className="text-sm font-black text-slate-700">{price}</span>
                  </div>
                  <p className="text-xs text-slate-500">{schedules} · {tpls} · AI 파싱</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">결제 문의</p>
              <p className="text-sm font-black text-sky-600">hare_table@naver.com</p>
            </div>
            <button onClick={() => setShowUpgradeModal(false)} className="w-full py-3 rounded-2xl text-sm font-bold text-slate-500 bg-slate-100 active:scale-95 transition-all">
              닫기
            </button>
          </div>
        </div>
      )}

      {/* --- 공정위 문구 목록 팝업 --- */}
      {editingFtcTemplateId === 'list' && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setEditingFtcTemplateId(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-4 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">공정위 문구 목록</h3>
              <button onClick={() => setEditingFtcTemplateId(null)} className="p-2 bg-sky-50 rounded-full"><X size={16} /></button>
            </div>
            {ftcTemplates.map(t => (
              <button key={t.id} onClick={() => setEditingFtcTemplateId(t.id)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-600 bg-orange-50/50 active:bg-orange-100 transition-all">
                {t.title}
              </button>
            ))}
            <button onClick={addFtcTemplate} className="w-full py-3 rounded-2xl text-sm font-bold text-orange-500 bg-orange-50 active:scale-95 transition-all flex items-center justify-center gap-1">
              <Plus size={14} /> 새 공정위 문구 추가
            </button>
          </div>
        </div>
      )}

      {/* --- 공정위 문구 편집 팝업 --- */}
      {editingFtcTemplateId && editingFtcTemplateId !== 'list' && (() => {
        const t = ftcTemplates.find(x => x.id === editingFtcTemplateId);
        if (!t) return null;
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={closeFtcTemplateModal}>
            <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-5 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">공정위 문구</h3>
                <button onClick={closeFtcTemplateModal} className="p-2 bg-sky-50 rounded-full"><X size={16} /></button>
              </div>
              <input
                className="w-full px-4 py-3 rounded-xl bg-orange-50/50 ring-1 ring-orange-100 focus:ring-2 focus:ring-orange-300 outline-none text-sm font-bold"
                value={t.title}
                onChange={(e) => updateFtcTemplate(t.id, 'title', e.target.value)}
                placeholder="문구 제목"
              />
              <textarea
                className="w-full px-4 py-4 rounded-2xl bg-orange-50/50 ring-1 ring-orange-100 focus:ring-2 focus:ring-orange-300 outline-none text-sm h-40 resize-none leading-relaxed"
                value={t.content}
                onChange={(e) => updateFtcTemplate(t.id, 'content', e.target.value)}
                placeholder="공정위 문구를 작성하세요..."
              />
              <p className="text-[10px] text-slate-400 leading-relaxed bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                ※ 본 문구는 참고용 템플릿입니다. 최신 공정거래위원회 고시를 직접 확인 후 사용하세요. 법적 책임은 이용자에게 있습니다.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { copyToClipboard(t.content); setEditingFtcTemplateId(null); }} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-200">
                  <Copy size={16} /> 복사
                </button>
                <button onClick={() => deleteFtcTemplate(t.id)} className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 스케줄 상세 팝업 --- */}
      {selectedScheduleId && (() => {
        const item = schedules.find(s => s.id === selectedScheduleId);
        if (!item) return null;
        const dday = getDdayLabel(item);
        const isTwoStage = item.type === '기자단' || item.type === '제품';
        const isEditing = editingScheduleId === item.id;
        const updateField = (key, val) => setSchedules(schedules.map(s => s.id === item.id ? { ...s, [key]: val } : s));
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setSelectedScheduleId(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 space-y-5 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh]" ref={el => imageCardRefs.current[item.id] = el} onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="space-y-2" ref={el => cardRefs.current[item.id] = el} data-card-id={item.id}>
                {/* 1행: 액션 버튼 */}
                <div className="flex justify-end gap-1.5" data-no-image="true">
                  <button onClick={() => setEditingScheduleId(editingScheduleId === item.id ? null : item.id)} className={`p-2 rounded-xl active:scale-90 transition-all ${editingScheduleId === item.id ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-400'}`}><Pencil size={15} /></button>

                  <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 bg-rose-50 rounded-xl text-rose-400 active:scale-90 transition-all"><Trash2 size={15} /></button>
                  <button onClick={() => { setEditingScheduleId(null); setSelectedScheduleId(null); }} className="p-2 bg-sky-50 rounded-full"><X size={15} /></button>
                </div>
                {/* 2행: 브랜드·카테고리·플랫폼 배지 + 신청문구·메모 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.brand && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border whitespace-nowrap ${getBrandBadge(item.brand)}`}>{item.brand}</span>
                    )}
                    <span className="text-[11px] font-bold text-sky-500 whitespace-nowrap">{item.type}</span>
                    {(item.platforms || []).map(p => (
                      <span key={p} className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-50 text-sky-500 border border-sky-100 whitespace-nowrap">
                        {{ blog:'블로그', blogClip:'클립', insta:'인스타', reels:'릴스', facebook:'페이스북', youtube:'유튜브' }[p]}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 shrink-0" data-no-image="true">
                    <button onClick={() => setShowTemplatePickerId(item.id)} className="text-[11px] font-black text-emerald-600 flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-emerald-50 active:scale-95 transition-all whitespace-nowrap">
                      <FileText size={11} /> 신청문구
                    </button>
                    <button onClick={() => setNotePopupId(item.id)} className={`text-[11px] font-black flex items-center gap-0.5 px-2.5 py-1 rounded-full active:scale-95 transition-all whitespace-nowrap ${item.experienceNote ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-500'}`}>
                      <PenTool size={11} /> {item.experienceNote ? '메모 보기' : '체험메모'}
                    </button>
                  </div>
                </div>
                {/* 3행: 제목 + D-day */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-base font-black leading-snug ${item.isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.title}</h3>
                  {dday && <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black text-white whitespace-nowrap ${dday.color}`}>{dday.text}</span>}
                </div>
                {/* 4행: 일정 */}
                <div>
                  {item.visitDate ? (
                    <p className="text-[11px] font-bold text-sky-500 flex items-center gap-1 flex-wrap">
                      <CalendarDays size={11} />
                      <span className="whitespace-nowrap">{item.visitDate}{item.visitSetTime && ` · ${item.visitSetTime}`}</span>
                      <button data-no-image="true" onClick={() => setConfirmVisitDate({ id: item.id, date: item.visitDate, time: item.visitSetTime || '12:00' })} className="text-sky-400 underline whitespace-nowrap">변경</button>
                    </p>
                  ) : (
                    <button data-no-image="true" onClick={() => setConfirmVisitDate({ id: item.id, date: '', time: '12:00' })} className="text-[11px] font-black text-white flex items-center gap-1 jelly-button px-3 py-1.5 rounded-full shadow-md shadow-sky-200 active:scale-95 transition-all whitespace-nowrap">
                      <CalendarDays size={11} /> 체험일 설정
                    </button>
                  )}
                </div>
                {/* 5행: 일정공유 / 신청문구 / 메모 / 공정위 */}
                <div className="flex flex-wrap gap-1.5" data-no-image="true">
                  <button onClick={() => saveCardAsImage(`share_${item.id}`)} className="text-[11px] font-black text-sky-600 flex items-center gap-1 px-3 py-1.5 rounded-full shadow-sm bg-sky-50 active:scale-95 transition-all whitespace-nowrap">
                    <Download size={11} /> 일정 공유
                  </button>
{item.ftcImageUrl && (
                    <button onClick={() => copyToClipboard(item.ftcImageUrl)} className="text-[11px] font-black text-orange-600 flex items-center gap-1 px-3 py-1.5 rounded-full shadow-sm bg-orange-50 active:scale-95 transition-all whitespace-nowrap">
                      <Copy size={11} /> 공정위
                    </button>
                  )}
                  {gcalToken && (item.visitDate || item.deadline || item.draftDeadline) && (
                    <button onClick={async () => {
                      const patch = {};
                      let anyOk = false;
                      if (item.visitDate) {
                        const eventId = await syncToGoogleCalendar(item, item.visitDate, item.visitSetTime || '12:00');
                        if (eventId) { patch.gcalEventId = eventId; anyOk = true; }
                      }
                      if (isTwoStage && item.draftDeadline) {
                        const draftId = await syncDeadlineToGoogleCalendar(item, item.draftDeadline, 'draft', item.gcalDraftDeadlineEventId);
                        if (draftId) { patch.gcalDraftDeadlineEventId = draftId; anyOk = true; }
                      }
                      if (item.deadline) {
                        const dlId = await syncDeadlineToGoogleCalendar(item, item.deadline, 'final', item.gcalDeadlineEventId);
                        if (dlId) { patch.gcalDeadlineEventId = dlId; anyOk = true; }
                      }
                      if (anyOk) {
                        const updated = schedules.map(s => s.id === item.id ? { ...s, ...patch } : s);
                        setSchedules(updated);
                        localStorage.setItem('blogSchedules', JSON.stringify(updated));
                        alert(item.gcalEventId || item.gcalDeadlineEventId ? '캘린더 일정이 업데이트되었습니다!' : '구글 캘린더에 추가되었습니다!');
                      } else alert('캘린더 추가 실패. 연동 상태를 확인해주세요.');
                    }} className="text-[11px] font-black text-blue-600 flex items-center gap-1 px-3 py-1.5 rounded-full shadow-sm bg-blue-50 active:scale-95 transition-all whitespace-nowrap">
                      <Calendar size={11} /> {(item.gcalEventId || item.gcalDeadlineEventId || item.gcalDraftDeadlineEventId) ? '캘린더 수정' : '캘린더 추가'}
                    </button>
                  )}
                </div>
              </div>

              {/* 수정 모드 */}
              {isEditing && (
                <div data-no-image="true" className="bg-sky-50 p-5 rounded-2xl space-y-3 border-2 border-sky-200">
                  <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">스케줄 수정</p>
                  <label className={`block p-3 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl cursor-pointer active:scale-[0.99] transition-all ${isParsing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf"
                      className="hidden"
                      onChange={(e) => { handleFileUpdateForItem(e.target.files?.[0], item.id); e.target.value = ''; }}
                    />
                    <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                      <Upload size={13} />
                      <span className="text-[11px] font-black">{isParsing ? '분석 중...' : 'PDF · Word 파일로 업데이트'}</span>
                    </div>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 shrink-0 text-[10px] font-bold text-sky-400">브랜드</div>
                    <div className="flex-1 flex gap-2">
                      {item.brand && !['리뷰노트','강남맛집','레뷰','슈퍼멤버스','디너의여왕','리뷰플레이스','WE:U','기타'].includes(item.brand) ? (
                        <input className="flex-1 bg-white px-3 py-2 rounded-xl ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-sm font-bold text-slate-700" placeholder="브랜드명 직접 입력" value={item.brand || ''} onChange={(e) => updateField('brand', e.target.value)} />
                      ) : (
                        <select className="flex-1 bg-white px-3 py-2 rounded-xl ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-sm font-bold text-slate-700" value={['리뷰노트','강남맛집','레뷰','슈퍼멤버스','디너의여왕','리뷰플레이스','WE:U','기타'].includes(item.brand) ? item.brand : '기타'} onChange={(e) => updateField('brand', e.target.value === '기타' ? '' : e.target.value)}>
                          {['리뷰노트', '강남맛집', '레뷰', '슈퍼멤버스', '디너의여왕', '리뷰플레이스', 'WE:U', '기타'].map(t => <option key={t} value={t}>{t === '기타' ? '기타 (직접입력)' : t}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 shrink-0 text-[10px] font-bold text-sky-400">카테고리</div>
                    <select className="flex-1 bg-white px-3 py-2 rounded-xl ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-sm font-bold text-slate-700" value={item.type || '맛집'} onChange={(e) => updateField('type', e.target.value)}>
                      {['맛집', '카페', '숙박', '체험', '기자단', '제품', '헤어', '뷰티', '운동', '기타'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {[
                    { label: '업체명', key: 'title' },
                    { label: '주소', key: 'address', hideForTwoStage: true },
                    { label: '지도URL', key: 'placeUrl', hideForTwoStage: true },
                    { label: '연락처', key: 'contact' },
                    { label: '제공내역', key: 'provided' },
                    { label: '체험기간', key: 'experiencePeriod' },
                    { label: '초안마감', key: 'draftDeadline', onlyForTwoStage: true },
                    { label: '리뷰마감', key: 'deadline' },
                    { label: '가능요일', key: 'visitDays', hideForTwoStage: true },
                    { label: '가능시간', key: 'visitTime', hideForTwoStage: true },
                  ].filter(({ hideForTwoStage, onlyForTwoStage }) => {
                    if (hideForTwoStage && isTwoStage) return false;
                    if (onlyForTwoStage && !isTwoStage) return false;
                    return true;
                  }).map(({ label, key }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-14 shrink-0 text-[10px] font-bold text-sky-400">{label}</div>
                      <input className="flex-1 bg-sky-50 px-3 py-2 rounded-xl border border-sky-100 focus:border-sky-300 focus:bg-white outline-none text-xs font-medium text-slate-700 transition-colors" value={item[key] || ''} onChange={(e) => updateField(key, e.target.value)} />
                    </div>
                  ))}
                  {[
                    { label: '기타정보', key: 'extraInfo', color: 'slate' },
                    { label: '주의사항', key: 'caution', color: 'orange' },
                    { label: '기본미션', key: 'mission', color: 'sky' },
                    { label: '개인미션', key: 'personalMission', color: 'pink' },
                  ].map(({ label, key, color }) => (
                    <div key={key} className="flex gap-3">
                      <div className={`w-14 shrink-0 text-[10px] font-bold text-${color}-400 pt-2`}>{label}</div>
                      <textarea className={`flex-1 bg-${color}-50 px-3 py-2 rounded-xl border border-${color}-100 focus:border-${color}-300 focus:bg-white outline-none text-xs font-medium text-${color}-700 h-24 resize-none transition-colors`} value={item[key] || ''} onChange={(e) => updateField(key, e.target.value)} />
                    </div>
                  ))}
                  <button onClick={async () => {
                    localStorage.setItem('blogSchedules', JSON.stringify(schedules));
                    setEditingScheduleId(null);
                    if (gcalToken && item.gcalEventId && item.visitDate) {
                      const eventId = await syncToGoogleCalendar(item, item.visitDate, item.visitSetTime || '12:00');
                      if (eventId) {
                        const updated = schedules.map(s => s.id === item.id ? { ...s, gcalEventId: eventId } : s);
                        setSchedules(updated);
                        localStorage.setItem('blogSchedules', JSON.stringify(updated));
                      }
                    }
                  }} className="w-full jelly-button text-white py-3 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-200">
                    <Save size={14} /> 수정 완료
                  </button>
                </div>
              )}

              {/* 기본 정보 */}
              {!isEditing && <><div className="space-y-2">
                {item.address && (
                  <div className="flex items-start gap-2">
                    <a href={item.placeUrl || `https://map.naver.com/v5/search/${encodeURIComponent((item.address ? item.address + ' ' : '') + item.title)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-start gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl active:bg-slate-100 transition-all border border-slate-100">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" /> <span className="break-words line-clamp-2">{item.address}</span>
                      <ExternalLink size={12} className="text-slate-300 shrink-0 ml-auto mt-0.5" />
                    </a>
                    <button onClick={() => copyToClipboard(item.address)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all shrink-0 border border-slate-100">
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {item.contact && (
                  <div className="flex items-center gap-2">
                    <a href={`tel:${item.contact}`} className="flex-1 flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl active:bg-slate-100 transition-all border border-slate-100">
                      <Phone size={14} className="text-slate-400 shrink-0" /> <span>{item.contact}</span>
                    </a>
                    <button onClick={() => copyToClipboard(item.contact)} className="p-2.5 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all shrink-0 border border-slate-100">
                      <Copy size={14} />
                    </button>
                    <a href={`sms:${item.contact}`} className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-400 active:scale-90 transition-all shrink-0 border border-emerald-100">
                      <MessageCircle size={14} />
                    </a>
                  </div>
                )}
                {item.provided && (
                  <div className="flex items-start gap-3 text-xs text-slate-600 bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100">
                    <Gift size={14} className="text-emerald-500 shrink-0 mt-0.5" /> <span className="break-words line-clamp-2">{item.provided}</span>
                  </div>
                )}
              </div>

                {/* 일정 정보 */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {item.experiencePeriod && (
                      <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                        <p className="text-[9px] font-black text-blue-500 mb-1">체험기간</p>
                        <p className="text-xs font-medium text-slate-600 break-words">{item.experiencePeriod}</p>
                      </div>
                    )}
                    {item.deadline && (
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                        <p className="text-[9px] font-black text-rose-400 mb-1">리뷰마감</p>
                        <p className="text-xs font-medium text-slate-600 break-words">{item.deadline}</p>
                      </div>
                    )}
                  </div>
                  {item.visitDays && (
                    <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      <p className="text-[9px] font-black text-indigo-500 mb-1">가능요일</p>
                      <p className="text-xs font-medium text-slate-600 break-words">{item.visitDays}</p>
                    </div>
                  )}
                  {item.visitTime && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                      <p className="text-[9px] font-black text-amber-500 mb-1">가능시간</p>
                      <p className="text-xs font-medium text-slate-600 break-words">{item.visitTime}</p>
                    </div>
                  )}
                </div>

                {/* 키워드 */}
                {item.keywords && (
                  <div className="bg-violet-50/60 rounded-2xl border border-dashed border-violet-200 px-4 py-2.5">
                    <p className="text-[10px] font-black text-violet-400 mb-2">키워드</p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.keywords}</p>
                    <div className="mt-2">
                      <button onClick={() => copyToClipboard(item.keywords)} className="flex items-center gap-1 text-[10px] font-bold text-violet-500 active:scale-95 transition-all">
                        <Copy size={10} /> 복사
                      </button>
                    </div>
                  </div>
                )}

                {/* 기타정보 */}
                {item.extraInfo && (
                  <div className="bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 overflow-hidden">
                    <button onClick={() => setDetailSections(p => ({ ...p, extraInfo: !p.extraInfo }))} className="w-full flex items-center justify-between px-5 py-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">기타 정보</p>
                      <ChevronRight size={13} className={`text-slate-500 transition-transform ${detailSections.extraInfo ? 'rotate-90' : ''}`} />
                    </button>
                    {detailSections.extraInfo && (
                      <>
                        <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line px-5 pb-3">{item.extraInfo}</p>
                        <div className="px-5 pb-4">
                          <button onClick={() => copyToClipboard(item.extraInfo)} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 active:scale-95 transition-all">
                            <Copy size={10} /> 복사
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 주의사항 */}
                {item.caution && (
                  <div className="bg-orange-50/50 rounded-2xl border border-dashed border-orange-200 overflow-hidden">
                    <button onClick={() => setDetailSections(p => ({ ...p, caution: !p.caution }))} className="w-full flex items-center justify-between px-5 py-3">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10} /> 주의사항</p>
                      <ChevronRight size={13} className={`text-orange-400 transition-transform ${detailSections.caution ? 'rotate-90' : ''}`} />
                    </button>
                    {detailSections.caution && <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line px-5 pb-4">{item.caution}</p>}
                  </div>
                )}

                {/* 기본 미션 */}
                {item.mission && (
                  <div className="bg-sky-50/50 rounded-2xl border border-dashed border-slate-200 overflow-hidden">
                    <button onClick={() => setDetailSections(p => ({ ...p, mission: !p.mission }))} className="w-full flex items-center justify-between px-5 py-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">기본 미션</p>
                      <ChevronRight size={13} className={`text-slate-500 transition-transform ${detailSections.mission ? 'rotate-90' : ''}`} />
                    </button>
                    {detailSections.mission && (
                      <>
                        <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line px-5 pb-3">{item.mission}</p>
                        <div className="px-5 pb-4">
                          <button onClick={() => copyToClipboard(item.mission)} className="flex items-center gap-1 text-[10px] font-bold text-sky-500 active:scale-95 transition-all">
                            <Copy size={10} /> 복사
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 개인 미션 */}
                {item.personalMission && (
                  <div data-no-image="true" className="bg-pink-50/50 rounded-2xl border border-dashed border-pink-200 overflow-hidden">
                    <button onClick={() => setDetailSections(p => ({ ...p, personalMission: !p.personalMission }))} className="w-full flex items-center justify-between px-5 py-3">
                      <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">개인 미션</p>
                      <ChevronRight size={13} className={`text-pink-400 transition-transform ${detailSections.personalMission ? 'rotate-90' : ''}`} />
                    </button>
                    {detailSections.personalMission && (
                      <>
                        <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line px-5 pb-3">{item.personalMission}</p>
                        <div className="px-5 pb-4">
                          <button onClick={() => copyToClipboard(item.personalMission)} className="flex items-center gap-1 text-[10px] font-bold text-pink-500 active:scale-95 transition-all">
                            <Copy size={10} /> 복사
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </>}

              {/* 공유용 이미지 템플릿 (숨김) */}
              {!isEditing && (
                <div data-no-image="true" className="w-full">
                  <div
                    ref={(el) => (imageCardRefs.current[`share_${item.id}`] = el)}
                    className="absolute left-[-9999px] top-0 w-[480px] h-[480px] mesh-bg flex items-center justify-center p-8 font-body text-on-surface antialiased"
                  >
                    <div className="relative w-full h-full glass-card rounded-card flex flex-col px-8 pt-7 pb-6 overflow-hidden">

                      {/* Header */}
                      <div className="relative z-10 flex items-center gap-2.5 mb-4">
                        <img crossOrigin="anonymous" alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm" src="/favicon.png" />
                        <div className="h-3.5 w-px bg-primary/20"></div>
                        <span className="text-[9px] font-bold tracking-[0.2em] text-primary/70 uppercase">Blue Review</span>
                      </div>

                      {/* Title Section */}
                      <div className="relative z-10 mb-4">
                        <p className="text-[10px] font-extrabold text-primary tracking-widest uppercase mb-1.5">{item.type || 'Schedule'}</p>
                        <h1 className="font-headline text-[1.75rem] font-extrabold text-slate-900 leading-[1.15] tracking-tight break-keep">
                          {item.title}
                        </h1>
                      </div>

                      {/* Date & Time in one row */}
                      <div className="relative z-10 flex gap-6 mb-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 w-5 h-5 flex items-center justify-center text-primary/80">
                            <Calendar size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Date</p>
                            <p className="font-headline font-bold text-sm text-slate-800 tracking-tight">{item.visitDate || '미정'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 w-5 h-5 flex items-center justify-center text-primary/80">
                            <Clock size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Time</p>
                            <p className="font-headline font-bold text-sm text-slate-800 tracking-tight">{item.visitSetTime || item.visitTime || '미정'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="relative z-10 flex items-start gap-2.5">
                        <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center text-primary/80">
                          <MapPin size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Location</p>
                          <p className="font-medium text-[12px] leading-relaxed text-slate-600 break-all whitespace-pre-wrap">
                            {item.address || '주소 정보 없음'}
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="relative z-10 pt-4 border-t border-white/40 flex items-center justify-between mt-auto">
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/20"></span>
                        </div>
                        <span className="text-[9px] font-bold tracking-widest uppercase text-primary/50">Blue Review</span>
                      </div>

                      {/* Surface Highlight */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* 하단 버튼 3개: 브랜드 바로가기 | 닫기 | 리뷰등록 */}
              <div data-no-image="true" className="flex items-center gap-2">
                {(() => {
                  const brandUrls = {
                    '리뷰노트': 'https://www.reviewnote.co.kr',
                    '레뷰': 'https://www.revu.net',
                    '슈퍼멤버스': 'https://www.supermembers.co.kr',
                    '디너의여왕': 'https://www.dinnerqueen.net',
                    '리뷰플레이스': 'https://www.reviewplace.co.kr',
                    'WE:U': 'https://www.weu.me',
                    '강남맛집': 'https://www.gangnamfood.com',
                  };
                  const url = brandUrls[item.brand];
                  const label = item.brand ? `${item.brand} 바로가기` : '바로가기';
                  return url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-50 text-slate-500 py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <ExternalLink size={13} /> {label}
                    </a>
                  ) : null;
                })()}
                <button onClick={() => setSelectedScheduleId(null)} className="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
                  <X size={14} /> 닫기
                </button>
                {item.isDone ? (
                  <button
                    onClick={() => { setSelectedScheduleId(null); setConfirmDoneId(item.id); }}
                    className="flex-1 bg-emerald-50 text-emerald-600 py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> 등록 완료
                  </button>
                ) : item.scheduledPublishDate ? (
                  <button
                    onClick={() => { setSelectedScheduleId(null); setConfirmDoneId(item.id); }}
                    className="flex-1 bg-orange-50 text-orange-600 py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Calendar size={14} /> {item.scheduledPublishDate.slice(5).replace('-','/')} 예약
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelectedScheduleId(null); setConfirmDoneId(item.id); }}
                    className="flex-1 jelly-button py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> 리뷰 등록
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 체험 느낌 메모 팝업 --- */}
      {notePopupId && (() => {
        const noteItem = schedules.find(s => s.id === notePopupId);
        if (!noteItem) return null;
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setNotePopupId(null)}>
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-100 rounded-xl"><PenTool size={18} className="text-violet-500" /></div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">체험 느낌 메모</h3>
                    <p className="text-[10px] text-slate-500 font-bold">{noteItem.title}</p>
                  </div>
                </div>
                <button onClick={() => setNotePopupId(null)} className="p-2 bg-slate-100 rounded-full"><X size={16} /></button>
              </div>
              <textarea
                className="w-full px-4 py-3 rounded-2xl bg-violet-50/50 ring-1 ring-violet-100 focus:ring-2 focus:ring-violet-300 outline-none text-sm leading-relaxed resize-none h-40 transition-all"
                placeholder="분위기, 맛, 서비스, 사진 포인트 등 자유롭게 메모하세요!"
                value={noteItem.experienceNote || ''}
                onChange={(e) => setSchedules(schedules.map(s => s.id === notePopupId ? { ...s, experienceNote: e.target.value } : s))}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => { localStorage.setItem('blogSchedules', JSON.stringify(schedules)); setNotePopupId(null); }} className="flex-1 bg-violet-500 text-white py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
                  <Save size={14} /> 저장
                </button>
                <button onClick={() => copyToClipboard(noteItem.experienceNote || '')} className="flex-1 bg-violet-50 text-violet-600 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-violet-100">
                  <Copy size={14} /> 복사
                </button>
                <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: `${noteItem.title} 체험 메모`, text: noteItem.experienceNote || '' });
                  } else {
                    copyToClipboard(noteItem.experienceNote || '');
                  }
                }} className="flex-1 bg-violet-50 text-violet-600 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-violet-100">
                  <ExternalLink size={14} /> 공유
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 신청문구 복사 팝업 (스케줄 상세) --- */}
      {showTemplatePickerId && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setShowTemplatePickerId(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-6 space-y-4 animate-in slide-in-from-bottom duration-500 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-xl"><FileText size={16} className="text-emerald-600" /></div>
                <h3 className="text-base font-black text-slate-800">신청문구 선택</h3>
              </div>
              <button onClick={() => setShowTemplatePickerId(null)} className="p-2 bg-slate-100 rounded-full"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-500 font-bold -mt-1">문구를 선택하면 바로 복사됩니다</p>
            <div className="space-y-2 overflow-y-auto flex-1">
              {templates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">등록된 신청문구가 없어요.<br />홈 화면에서 신청문구를 추가해 주세요.</p>
              ) : templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => { copyToClipboard(t.content); setShowTemplatePickerId(null); }}
                  className="w-full text-left px-4 py-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] transition-all border border-emerald-100 group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-700 truncate">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{t.content}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold">
                      <Copy size={12} /> 복사
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- 리뷰 등록 확인 팝업 --- */}
      {confirmDoneId && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => { setConfirmDoneId(null); setScheduledPublishDate(''); }}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-sky-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 text-center">리뷰 등록</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">등록 방식을 선택하세요</p>

            {/* 되돌리기 — isDone 또는 예약된 항목일 때 */}
            {(() => { const s = schedules.find(x => x.id === confirmDoneId); return s && (s.isDone || s.scheduledPublishDate); })() && (
              <button
                onClick={() => {
                  setSchedules(prev => prev.map(s => s.id === confirmDoneId ? { ...s, isDone: false, doneAt: undefined, scheduledPublishDate: undefined } : s));
                  setConfirmDoneId(null);
                }}
                className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
              >
                <X size={14} /> 등록 취소 (되돌리기)
              </button>
            )}

            {/* 등록완료 */}
            <button
              onClick={() => markAsDone(confirmDoneId)}
              className="w-full jelly-button py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
            >
              <CheckCircle2 size={16} /> 등록완료
            </button>

            {/* 예약 발행 */}
            <div className="bg-orange-50 rounded-2xl p-4 space-y-3">
              <div className="relative">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white ring-1 ring-orange-200 cursor-pointer active:scale-95 transition-all">
                  <Calendar size={14} className="text-orange-500" />
                  <span className="text-sm font-bold text-orange-600">
                    {scheduledPublishDate ? `${scheduledPublishDate.slice(5).replace('-','/')} 예약 발행` : '예약 발행 날짜 선택'}
                  </span>
                  <input
                    type="date"
                    value={scheduledPublishDate}
                    onChange={e => setScheduledPublishDate(e.target.value)}
                    min={(() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })()}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
              {scheduledPublishDate && (
                <button
                  onClick={() => markAsScheduled(confirmDoneId, scheduledPublishDate)}
                  className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} /> 예약 등록 확인
                </button>
              )}
            </div>

            <button
              onClick={() => { setConfirmDoneId(null); setScheduledPublishDate(''); }}
              className="w-full bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all mt-3"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* --- 삭제 확인 팝업 --- */}
      {confirmDeleteId && (() => {
        const target = schedules.find(s => s.id === confirmDeleteId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setConfirmDeleteId(null)}>
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">정말 삭제할까요?</h3>
              <p className="text-sm font-bold text-slate-500 mb-1 px-2 leading-snug">
                <span className="text-rose-500">"{target.title}"</span>
              </p>
              <p className="text-xs text-slate-500 mb-8">삭제하면 되돌릴 수 없어요.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteSchedule(confirmDeleteId)}
                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-rose-200"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 신청문구 삭제 확인 팝업 --- */}
      {confirmDeleteTemplateId && (() => {
        const t = templates.find(x => x.id === confirmDeleteTemplateId);
        if (!t) return null;
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-[60] flex items-center justify-center p-6" onClick={() => setConfirmDeleteTemplateId(null)}>
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">정말 삭제할까요?</h3>
              <p className="text-sm font-bold text-rose-500 mb-1 px-2 leading-snug">"{t.title}"</p>
              <p className="text-xs text-slate-500 mb-8">삭제하면 되돌릴 수 없어요.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteTemplateId(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => { deleteTemplate(confirmDeleteTemplateId); setConfirmDeleteTemplateId(null); }}
                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-rose-200"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 작성 글 삭제 확인 팝업 --- */}
      {confirmDeleteTextId && (() => {
        const target = savedTexts.find(t => t.id === confirmDeleteTextId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">글을 삭제할까요?</h3>
              <p className="text-sm text-slate-500 mb-6 truncate px-2">"{target.title || '(제목 없음)'}"</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteTextId(null)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 bg-slate-100 active:scale-95 transition-all">
                  취소
                </button>
                <button onClick={() => {
                  const updated = savedTexts.filter(t => t.id !== confirmDeleteTextId);
                  setSavedTexts(updated);
                  localStorage.setItem('blogger_saved_texts', JSON.stringify(updated));
                  setConfirmDeleteTextId(null);
                }} className="flex-1 py-3.5 rounded-2xl font-black text-white bg-rose-500 active:scale-95 transition-all shadow-md shadow-rose-200">
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 체험일 등록 확인 팝업 --- */}
      {confirmVisitDate && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarDays size={32} className="text-sky-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">체험일 설정</h3>
            <p className="text-xs text-slate-500 mb-6">날짜와 시간을 설정하면 달력에 자동 표시돼요.</p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 bg-sky-50 p-3 rounded-2xl">
                <CalendarDays size={16} className="text-sky-400 shrink-0" />
                <div className="flex-1 relative">
                  {!confirmVisitDate.date && <span className="absolute inset-0 flex items-center text-sm text-slate-500 font-medium pointer-events-none">날짜를 선택하세요</span>}
                  <input type="date" className="w-full bg-transparent outline-none font-bold text-sm text-slate-700" value={confirmVisitDate.date} onChange={(e) => setConfirmVisitDate({ ...confirmVisitDate, date: e.target.value })} />
                </div>
              </div>
              <div className="bg-sky-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-sky-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-500">시간 선택</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  {/* 시 선택 */}
                  <div className="relative">
                    <select
                      className="appearance-none bg-white w-24 h-14 rounded-2xl text-center text-lg font-bold text-sky-600 ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-400 outline-none shadow-inner"
                      style={{ textAlignLast: 'center' }}
                      value={parseInt((confirmVisitDate.time || '12:00').split(':')[0])}
                      onChange={(e) => { const h = e.target.value; const m = (confirmVisitDate.time || '12:00').split(':')[1] || '00'; setConfirmVisitDate(prev => ({ ...prev, time: `${h}:${m}` })); }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <p className="text-[9px] font-bold text-sky-400 text-center mt-1">시</p>
                  </div>
                  <span className="text-2xl font-black text-sky-400 -mt-4">:</span>
                  {/* 분 선택 */}
                  <div className="relative">
                    <select
                      className="appearance-none bg-white w-24 h-14 rounded-2xl text-center text-lg font-bold text-sky-600 ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-400 outline-none shadow-inner"
                      style={{ textAlignLast: 'center' }}
                      value={(confirmVisitDate.time || '12:00').split(':')[1] || '00'}
                      onChange={(e) => { const m = e.target.value; const h = (confirmVisitDate.time || '12:00').split(':')[0]; setConfirmVisitDate(prev => ({ ...prev, time: `${h}:${m}` })); }}
                    >
                      {['00', '30'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <p className="text-[9px] font-bold text-sky-400 text-center mt-1">분</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmVisitDate(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!confirmVisitDate.date) return;
                  const targetSchedule = schedules.find(s => s.id === confirmVisitDate.id);
                  const updatedSchedules = schedules.map(s => s.id === confirmVisitDate.id ? { ...s, visitDate: confirmVisitDate.date, visitSetTime: confirmVisitDate.time } : s);
                  setSchedules(updatedSchedules);
                  setConfirmVisitDate(null);
                  if (gcalToken && targetSchedule) {
                    const eventId = await syncToGoogleCalendar({ ...targetSchedule, gcalEventId: targetSchedule.gcalEventId }, confirmVisitDate.date, confirmVisitDate.time);
                    if (eventId) {
                      const withEventId = updatedSchedules.map(s => s.id === targetSchedule.id ? { ...s, gcalEventId: eventId } : s);
                      setSchedules(withEventId);
                      localStorage.setItem('blogSchedules', JSON.stringify(withEventId));
                    }
                  }
                }}
                className="flex-1 jelly-button py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              >
                {gcalToken ? '등록 + 캘린더 추가' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 스마트 파서 모달 --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh] shadow-[0_0_40px_rgba(186,230,253,0.3)] border border-white/50">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800 italic">Smart Parser</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-sky-50 rounded-full"><X /></button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">협찬 사이트의 내용을 통째로 복사해서 붙여넣으세요.</p>
              {rawText && (
                <button onClick={() => { setRawText(''); startTransition(() => setParsedData({ ...emptyParsed })); }} className="text-[10px] font-bold text-rose-400 active:scale-95 transition-all">
                  지우기
                </button>
              )}
            </div>

            <textarea
              className="w-full h-40 p-6 bg-sky-50 rounded-3xl border-none focus:ring-2 focus:ring-sky-500 outline-none text-sm text-slate-600 transition-all shadow-inner"
              placeholder="여기에 붙여넣기..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400">또는 파일 업로드</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <label className={`block w-full p-5 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-3xl cursor-pointer active:scale-[0.99] transition-all ${isParsing ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf"
                className="hidden"
                onChange={(e) => { handleFileUpload(e.target.files?.[0]); e.target.value = ''; }}
              />
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <Upload size={16} />
                <span className="text-xs font-black">PDF · Word 파일 분석</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-500/70 text-center mt-1">업체가 보낸 파일을 첨부하면 자동 추출돼요 (최대 20MB)</p>
            </label>

            <button
              onClick={() => handleSmartParsing(rawText)}
              disabled={isParsing || rawText.trim().length < 20}
              className="w-full jelly-button py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {isParsing ? 'BlueReview 분석 중...' : '분석하기'}
            </button>

            <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100 space-y-4">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">추출된 정보 미리보기</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300">브랜드</div>
                  <div className="flex-1 relative flex gap-2">
                    {parsedData.brand === '기타(수기)' ? (
                      <input className="w-full bg-sky-50 border border-sky-100 rounded-xl font-bold text-slate-700 outline-none text-sm py-2 px-3" placeholder="브랜드명 직접 입력" value={parsedData.brandCustom || ''} onChange={(e) => setParsedData({ ...parsedData, brandCustom: e.target.value })} />
                    ) : (
                      <select className="w-full bg-white/60 backdrop-blur-md shadow-inner border border-white ring-1 ring-sky-100 rounded-xl font-black text-slate-700 outline-none appearance-none text-sm py-2 px-3 pr-8" value={parsedData.brand || '리뷰노트'} onChange={(e) => setParsedData({ ...parsedData, brand: e.target.value, brandCustom: '' })}>{['리뷰노트', '강남맛집', '레뷰', '슈퍼멤버스', '디너의여왕', '리뷰플레이스', 'WE:U', '기타(수기)'].map(t => <option key={t} value={t}>{t === '기타(수기)' ? '기타 (직접입력)' : t}</option>)}</select>
                    )}
                    {parsedData.brand === '기타(수기)' ? (
                      <button onClick={() => setParsedData({ ...parsedData, brand: '리뷰노트', brandCustom: '' })} className="shrink-0 text-[9px] font-bold text-sky-500 bg-sky-50 border border-sky-100 rounded-xl px-2.5">목록</button>
                    ) : (
                      <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-sky-400 pointer-events-none" />
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300 pt-2">플랫폼</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'blog',      label: '블로그' },
                      { key: 'blogClip',  label: '클립' },
                      { key: 'insta',     label: '인스타' },
                      { key: 'reels',     label: '릴스' },
                      { key: 'facebook',  label: '페이스북' },
                      { key: 'youtube',   label: '유튜브' },
                    ].map(({ key, label }) => {
                      const active = (parsedData.platforms || []).includes(key);
                      return (
                        <button key={key} type="button"
                          onClick={() => {
                            const cur = parsedData.platforms || [];
                            setParsedData({ ...parsedData, platforms: active ? cur.filter(p => p !== key) : [...cur, key] });
                          }}
                          className={`px-3 py-1 rounded-full text-[10px] font-black transition-all border ${active ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300">카테고리</div>
                  <div className="flex-1 relative">
                    <select className="w-full bg-white/60 backdrop-blur-md shadow-inner border border-white ring-1 ring-sky-100 rounded-xl font-black text-slate-700 outline-none appearance-none text-sm py-2 px-3 pr-8" value={parsedData.type} onChange={(e) => setParsedData({ ...parsedData, type: e.target.value })}>{['맛집', '카페', '숙박', '체험', '기자단', '제품', '헤어', '뷰티', '운동', '기타'].map(t => <option key={t}>{t}</option>)}</select>
                    <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-sky-400 pointer-events-none" />
                  </div>
                </div>
                {(() => {
                  const isTwoStage = parsedData.type === '기자단' || parsedData.type === '제품';
                  return [
                    { label: '업체명', key: 'title' },
                    { label: '주소', key: 'address', hideForTwoStage: true },
                    { label: '연락처', key: 'contact' },
                    { label: '체험기간', key: 'experiencePeriod' },
                    { label: '초안마감', key: 'draftDeadline', onlyForTwoStage: true },
                    { label: '리뷰마감', key: 'deadline' },
                    { label: '제공내역', key: 'provided' },
                    { label: '가능요일', key: 'visitDays', hideForTwoStage: true },
                    { label: '가능시간', key: 'visitTime', hideForTwoStage: true },
                  ].filter(({ hideForTwoStage, onlyForTwoStage }) => {
                    if (hideForTwoStage && isTwoStage) return false;
                    if (onlyForTwoStage && !isTwoStage) return false;
                    return true;
                  }).map(({ label, key }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300">{label}</div>
                      <input className="flex-1 bg-transparent border-b border-sky-100 font-bold text-slate-700 outline-none text-sm py-1" value={parsedData[key] || ''} onChange={(e) => setParsedData({ ...parsedData, [key]: e.target.value })} />
                    </div>
                  ));
                })()}
                <div className="flex gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-slate-500 pt-2">기타정보</div>
                  <textarea className="flex-1 bg-slate-50/60 border border-slate-100 rounded-xl font-medium text-slate-700 outline-none text-xs p-3 h-20 resize-none" placeholder="위 항목에 담기 어려운 기타 정보" value={parsedData.extraInfo || ''} onChange={(e) => setParsedData({ ...parsedData, extraInfo: e.target.value })} />
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-violet-400 pt-2">키워드</div>
                  <textarea className="flex-1 bg-violet-50/60 border border-violet-100 rounded-xl font-medium text-slate-700 outline-none text-xs p-3 h-16 resize-none" placeholder="연남동맛집, 파스타맛집, 데이트코스..." value={parsedData.keywords || ''} onChange={(e) => setParsedData({ ...parsedData, keywords: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-orange-300 pt-2">주의사항</div>
                  <textarea className="flex-1 bg-orange-50/60 border border-orange-100 rounded-xl font-medium text-slate-700 outline-none text-xs p-3 h-20 resize-none" value={parsedData.caution} onChange={(e) => setParsedData({ ...parsedData, caution: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300 pt-2">기본미션</div>
                  <textarea className="flex-1 bg-white/60 border border-sky-100 rounded-xl font-medium text-slate-700 outline-none text-xs p-3 h-20 resize-none" value={parsedData.mission} onChange={(e) => setParsedData({ ...parsedData, mission: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-pink-300 pt-2">개인미션</div>
                  <textarea className="flex-1 bg-pink-50/60 border border-pink-100 rounded-xl font-medium text-slate-700 outline-none text-xs p-3 h-28 resize-none" value={parsedData.personalMission} onChange={(e) => setParsedData({ ...parsedData, personalMission: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-orange-300">공정위URL</div>
                  <input className="flex-1 bg-transparent border-b border-sky-100 font-bold text-slate-700 outline-none text-sm py-1" value={parsedData.ftcImageUrl} onChange={(e) => setParsedData({ ...parsedData, ftcImageUrl: e.target.value })} placeholder="이미지 URL" />
                </div>
              </div>
            </div>

            <button onClick={saveNewSchedule} className="w-full jelly-button py-5 rounded-3xl font-black text-lg shadow-xl shadow-sky-300/50 active:scale-95 transition-all w-full">스케줄 저장</button>
          </div>
        </div>
      )}

      {/* 프로필 탭 */}
      {activeTab === 'profile' && (
        <main className="max-w-xl mx-auto p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-sky-50 rounded-2xl text-sky-500"><User size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900">내 프로필</h3>
              <p className="text-xs text-slate-500">체험단 신청 시 사용할 기본 정보</p>
            </div>
          </div>

          {/* 탭 선택 */}
          <div className="flex bg-slate-100 rounded-2xl p-1">
            <button onClick={() => setProfileSubTab('platform')}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${profileSubTab === 'platform' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              플랫폼 설정
            </button>
            <button onClick={() => setProfileSubTab('basic')}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${profileSubTab === 'basic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              기본 설정
            </button>
            {isAdmin && (
              <button onClick={() => { setProfileSubTab('admin'); fetchAdminUsers(); }}
                className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${profileSubTab === 'admin' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-400'}`}>
                관리자
              </button>
            )}
          </div>

          {/* ── 관리자 패널 ── */}
          {profileSubTab === 'admin' && isAdmin && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800">유저 관리</h4>
                  <p className="text-xs text-slate-500">전체 {adminUsers.length}명</p>
                </div>
                <button onClick={fetchAdminUsers} className="text-xs font-bold text-sky-500 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 active:scale-95 transition-all">
                  새로고침
                </button>
              </div>

              {adminLoading ? (
                <div className="text-center py-10 text-slate-400 text-sm font-bold">불러오는 중...</div>
              ) : (
                <div className="space-y-3">
                  {adminUsers.map(u => {
                    const expires = u.plan_expires_at ? new Date(u.plan_expires_at) : null;
                    const daysLeft = expires ? Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <div key={u.user_id} className="jelly-card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-700 truncate">{u.email}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              가입: {new Date(u.created_at).toLocaleDateString('ko-KR')}
                              {u.updated_at && ` · 최근: ${new Date(u.updated_at).toLocaleDateString('ko-KR')}`}
                            </p>
                          </div>
                          {u.is_admin && <span className="shrink-0 text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100">ADMIN</span>}
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-500">
                          <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">협찬 {u.schedule_count}건</span>
                          <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">템플릿 {u.template_count}개</span>
                          {expires && (
                            <span className={`px-2 py-1 rounded-lg border font-bold ${daysLeft > 7 ? 'bg-green-50 border-green-100 text-green-600' : daysLeft > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                              {daysLeft > 0 ? `D-${daysLeft}` : '만료됨'}
                            </span>
                          )}
                        </div>
                        {expires && (
                          <p className="text-[10px] text-slate-400">만료일: {expires.toLocaleDateString('ko-KR')}</p>
                        )}
                        {!u.is_admin && (
                          <AdminSubscriptionControl
                            u={u}
                            onSet={handleSetSubscription}
                          />
                        )}
                      </div>
                    );
                  })}
                  {adminUsers.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">아직 가입한 유저가 없어요</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 플랫폼 설정 ── */}
          {profileSubTab === 'platform' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Quick Copy */}
              <div className="jelly-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-slate-500">Quick Copy</h4>
                  <p className="text-[10px] font-bold text-slate-500">채널: 복사 · 브랜드: 이동</p>
                </div>
                <div className="space-y-3">
                  {/* 채널 (위) */}
                  <div>
                    <span className="text-[9px] font-black text-sky-400 mb-1.5 block">채널</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'blogUrl',     label: '블로그',     value: profile.blogUrl,     icon: <Globe size={12} />,     bg: 'bg-sky-50 text-sky-500' },
                        { key: 'blogClipUrl', label: '클립',       value: profile.blogClipId,  icon: <PenTool size={12} />,   bg: 'bg-teal-50 text-teal-500' },
                        { key: 'instaId',     label: '인스타',     value: profile.instaId,     icon: <Instagram size={12} />, bg: 'bg-pink-50 text-pink-500' },
                        { key: 'reelsUrl',    label: '릴스',       value: profile.reelsUrl,    icon: <Eye size={12} />,       bg: 'bg-violet-50 text-violet-500' },
                        { key: 'youtubeUrl',  label: '유튜브',     value: profile.youtubeUrl,  icon: <Youtube size={12} />,   bg: 'bg-rose-50 text-rose-500' },
                        { key: 'email',       label: '이메일',     value: profile.email,       icon: <Mail size={12} />,      bg: 'bg-emerald-50 text-emerald-500' },
                      ].filter(({ key }) => profile.enabledPlatforms?.[key]).map(({ label, value, icon, bg }) => (
                        <button key={label} onClick={() => copyWithCheck(value, label)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-all ${bg}`}>
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 브랜드 (아래) */}
                  {profile.brandSiteUrls && Object.entries(profile.brandSiteUrls).some(([, v]) => v) && (
                    <div>
                      <span className="text-[9px] font-black text-sky-400 mb-1.5 block">브랜드</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(profile.brandSiteUrls || {}).filter(([, v]) => v).map(([brand, url]) => (
                          <a key={brand} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-500 active:scale-95 transition-all">
                            <ExternalLink size={10} /> {brand}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 닉네임 */}
              <div className="jelly-card p-4">
                <label className="flex items-center gap-2 text-xs font-black text-slate-500 mb-2">
                  <span className="text-sky-500"><User size={18} /></span>닉네임 / 이름
                </label>
                <input className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm transition-all"
                  placeholder="블로거 닉네임이나 이름" value={profile.nickname}
                  onChange={(e) => updateProfile('nickname', e.target.value)} />
              </div>

              {/* 채널 선택 토글 */}
              <div className="jelly-card p-4">
                <p className="text-xs font-black text-slate-500 mb-3">사용 중인 채널 선택</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'blogUrl',     label: '블로그',     icon: <Globe size={12} /> },
                    { key: 'blogClipUrl', label: '클립',       icon: <PenTool size={12} /> },
                    { key: 'instaId',     label: '인스타',     icon: <Instagram size={12} /> },
                    { key: 'reelsUrl',    label: '릴스',       icon: <Eye size={12} /> },
                    { key: 'facebookUrl', label: '페이스북',   icon: <ExternalLink size={12} /> },
                    { key: 'youtubeUrl',  label: '유튜브',     icon: <Youtube size={12} /> },
                    { key: 'email',       label: '이메일',     icon: <Mail size={12} /> },
                  ].map(({ key, label, icon }) => {
                    const enabled = profile.enabledPlatforms?.[key];
                    return (
                      <button key={key}
                        onClick={() => updateProfile('enabledPlatforms', { ...profile.enabledPlatforms, [key]: !enabled })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold active:scale-95 transition-all ${enabled ? 'bg-sky-500 text-white shadow-sm shadow-sky-200' : 'bg-slate-100 text-slate-400'}`}>
                        {icon} {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 채널별 주소/ID */}
              <div className="jelly-card p-4">
                <label className="flex items-center gap-2 text-xs font-black text-slate-500 mb-3">
                  <span className="text-sky-500"><Globe size={18} /></span>채널별 주소 / ID
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'blogUrl',     label: '블로그',     placeholder: 'https://blog.naver.com/myid' },
                    { key: 'blogClipId',  label: '클립 ID',    placeholder: '클립 아이디',                   enableKey: 'blogClipUrl' },
                    { key: 'instaId',     label: '인스타',     placeholder: '@my_instagram',                enableKey: 'instaId' },
                    { key: 'reelsUrl',    label: '릴스',       placeholder: 'https://www.instagram.com/reels/...' },
                    { key: 'facebookUrl', label: '페이스북',   placeholder: 'https://facebook.com/mypage' },
                    { key: 'youtubeUrl',  label: '유튜브',     placeholder: 'https://youtube.com/@mychannel' },
                    { key: 'email',       label: '이메일',     placeholder: 'my@email.com' },
                  ].filter(({ key, enableKey }) => profile.enabledPlatforms?.[enableKey || key]).map(({ key, label, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[10px] font-black text-sky-400">{label}</span>
                      <input
                        className="flex-1 px-3 py-2 rounded-xl bg-sky-50/50 ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-400 outline-none text-xs transition-all"
                        placeholder={placeholder}
                        value={profile[key] || ''}
                        onChange={(e) => updateProfile(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 브랜드별 웹사이트/앱 URL */}
              <div className="jelly-card p-4">
                <label className="flex items-center gap-2 text-xs font-black text-slate-500 mb-3">
                  <span className="text-sky-500"><ExternalLink size={18} /></span>브랜드별 사이트 URL
                </label>
                <div className="space-y-2">
                  {['리뷰노트', '강남맛집', '레뷰', '슈퍼멤버스', '디너의여왕', '리뷰플레이스', 'WE:U'].map(brand => (
                    <div key={brand} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[10px] font-black text-sky-400">{brand}</span>
                      <input
                        className="flex-1 px-3 py-2 rounded-xl bg-sky-50/50 ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-400 outline-none text-xs transition-all"
                        placeholder="웹사이트 또는 앱 URL"
                        value={(profile.brandSiteUrls || {})[brand] || ''}
                        onChange={(e) => updateProfile('brandSiteUrls', { ...(profile.brandSiteUrls || {}), [brand]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>


              <button onClick={saveProfile}
                className="w-full jelly-button py-3 rounded-2xl font-black text-sm shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> {profileSaved ? '저장 완료!' : '프로필 저장'}
              </button>
            </div>
          )}

          {/* ── 기본 설정 ── */}
          {profileSubTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-200">

              {/* 게스트 예시 UI */}
              {isGuest && (
                <div className="space-y-4 opacity-60 pointer-events-none select-none">
                  <div className="jelly-card p-5">
                    <h4 className="text-xs font-black text-slate-500 mb-3">계정 정보</h4>
                    <div className="flex items-center gap-3 py-2 px-3 bg-sky-50 rounded-xl">
                      <Mail size={16} className="text-sky-400 shrink-0" />
                      <span className="text-sm font-bold text-slate-600">example@email.com</span>
                    </div>
                  </div>
                  <div className="jelly-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-500">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>
                          </svg>
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-slate-500">얼굴 / 지문 인식 로그인</h4>
                          <p className="text-[10px] text-slate-500">Face ID · 지문으로 빠르게 로그인</p>
                        </div>
                      </div>
                      <div className="relative w-12 h-6 rounded-full bg-sky-500">
                        <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                    </div>
                  </div>
                  <div className="jelly-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                      <h4 className="text-xs font-black text-slate-500">비밀번호 변경</h4>
                    </div>
                    <div className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 text-sm text-slate-500">새 비밀번호 (6자 이상)</div>
                    <div className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 text-sm text-slate-500">비밀번호 확인</div>
                    <div className="w-full py-3 rounded-xl bg-slate-200 text-center text-white font-black text-sm">비밀번호 변경</div>
                  </div>
                  <div className="pt-2">
                    <div className="w-full py-3 rounded-2xl text-xs font-bold text-center text-slate-500 border border-dashed border-slate-200">회원 탈퇴</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 text-center pointer-events-auto opacity-100">
                    <p className="text-xs font-bold text-sky-600">회원가입 후 이용할 수 있는 기능입니다</p>
                  </div>
                </div>
              )}

              {/* ── 로그인 유저 전용 기능 ── */}
              {/* 플랜 정보 */}
              {user && !isGuest && (
                <div className="jelly-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-500">현재 플랜</h4>
                    {isAdmin && <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">ADMIN</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-black ${PLAN_META[userPlan].color}`}>{PLAN_META[userPlan].label}</span>
                    <span className="text-xs text-slate-500">{PLAN_META[userPlan].desc}</span>
                  </div>
                  {userPlan !== 'pro' && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>이번 달 협찬</span>
                          <span>{thisMonthScheduleCount} / {PLAN_LIMITS.schedule[userPlan]}건</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${Math.min(100, (thisMonthScheduleCount / PLAN_LIMITS.schedule[userPlan]) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>신청 문구 템플릿</span>
                          <span>{templates.length} / {PLAN_LIMITS.template[userPlan]}개</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${Math.min(100, (templates.length / PLAN_LIMITS.template[userPlan]) * 100)}%` }} />
                        </div>
                      </div>
                      <button onClick={() => { setUpgradeReason('schedule'); setShowUpgradeModal(true); }}
                        className="w-full mt-1 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-sky-500 to-blue-500 text-white active:scale-95 transition-all shadow-md shadow-sky-200">
                        업그레이드 하기
                      </button>
                    </div>
                  )}
                  {userPlan === 'pro' && !planExpiresAt && (
                    <p className="text-xs text-amber-600 font-bold">✨ 모든 기능을 제한 없이 사용 중입니다</p>
                  )}
                  {planExpiresAt && userPlan !== 'free' && (() => {
                    const expires = new Date(planExpiresAt);
                    const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div className={`text-xs font-bold px-3 py-2 rounded-xl ${daysLeft > 7 ? 'bg-green-50 text-green-600' : daysLeft > 0 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500'}`}>
                        {daysLeft > 0 ? `구독 만료까지 D-${daysLeft} (${expires.toLocaleDateString('ko-KR')})` : '구독이 만료되었습니다'}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 계정 정보 */}
              {user && !isGuest && (
                <div className="jelly-card p-5">
                  <h4 className="text-xs font-black text-slate-500 mb-3">계정 정보</h4>
                  <div className="flex items-center gap-3 py-2 px-3 bg-sky-50 rounded-xl">
                    <Mail size={16} className="text-sky-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-600 truncate">{user.email}</span>
                  </div>
                </div>
              )}

              {/* 생체 인증 */}
              {biometricSupported && user && !isGuest && (
                <div className="jelly-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-500">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>
                        </svg>
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-slate-500">얼굴 / 지문 인식 로그인</h4>
                        <p className="text-[10px] text-slate-500">Face ID · 지문으로 빠르게 로그인</p>
                      </div>
                    </div>
                    <button onClick={biometricEnabled ? handleBiometricDisable : handleBiometricRegister}
                      className={`relative w-12 h-6 rounded-full transition-all ${biometricEnabled ? 'bg-sky-500' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${biometricEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  {biometricEnabled && (
                    <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 py-2 px-3 rounded-xl">생체 인증이 등록되어 있습니다. 다음 방문 시 자동으로 잠금 화면이 표시됩니다.</p>
                  )}
                </div>
              )}

              {/* 비밀번호 변경 */}
              {user && !isGuest && user.app_metadata?.provider === 'email' && (
                <div className="jelly-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                    <h4 className="text-xs font-black text-slate-500">비밀번호 변경</h4>
                  </div>
                  <p className="text-[11px] text-slate-500">안전한 비밀번호로 계정을 보호하세요. 8자 이상, 숫자·특수문자 포함을 권장합니다.</p>
                  <input type="password"
                    className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm transition-all"
                    placeholder="새 비밀번호 (6자 이상)" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                  <input type="password"
                    className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm transition-all"
                    placeholder="비밀번호 확인" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                  {passwordMsg.text && (
                    <p className={`text-xs font-bold text-center py-2 rounded-xl ${passwordMsg.type === 'error' ? 'text-rose-500 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {passwordMsg.text}
                    </p>
                  )}
                  <button
                    onClick={async () => {
                      setPasswordMsg({ text: '', type: '' });
                      if (newPassword.length < 6) return setPasswordMsg({ text: '비밀번호는 6자 이상이어야 합니다.', type: 'error' });
                      if (newPassword !== confirmPassword) return setPasswordMsg({ text: '비밀번호가 일치하지 않아요.', type: 'error' });
                      const { error } = await updatePassword(newPassword);
                      if (error) { setPasswordMsg({ text: error.message, type: 'error' }); }
                      else {
                        setPasswordMsg({ text: '비밀번호가 변경되었습니다!', type: 'success' });
                        setNewPassword(''); setConfirmPassword('');
                        setTimeout(() => setPasswordMsg({ text: '', type: '' }), 3000);
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-slate-800 text-white font-black text-sm active:scale-95 transition-all hover:bg-slate-700">
                    비밀번호 변경
                  </button>
                </div>
              )}

              {/* 회원 탈퇴 */}
              {user && !isGuest && (
                <div className="pt-2">
                  <button onClick={() => setConfirmDeleteAccount(true)}
                    className="w-full py-3 rounded-2xl text-xs font-bold text-slate-500 border border-dashed border-slate-200 hover:border-rose-200 hover:text-rose-400 transition-all">
                    회원 탈퇴
                  </button>
                </div>
              )}
            </div>
          )}

        </main>
      )}

      {/* --- 회원 탈퇴 확인 팝업 1단계 --- */}
      {confirmDeleteAccount && !confirmDeleteAccount2 && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setConfirmDeleteAccount(false)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                <line x1="18" y1="11" x2="23" y2="16"/><line x1="23" y1="11" x2="18" y2="16"/>
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">정말 탈퇴할까요?</h3>
            <p className="text-sm text-slate-500 mb-1">등록된 모든 협찬 스케줄과</p>
            <p className="text-sm text-slate-500 mb-1">저장된 데이터가 삭제됩니다.</p>
            <p className="text-sm font-bold text-rose-500 mb-8">이 작업은 되돌릴 수 없어요.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAccount(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">
                취소
              </button>
              <button onClick={() => setConfirmDeleteAccount2(true)} className="flex-1 bg-rose-400 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-rose-200">
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 회원 탈퇴 확인 팝업 2단계 --- */}
      {confirmDeleteAccount2 && (
        <div className="fixed inset-0 bg-rose-900/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => { setConfirmDeleteAccount(false); setConfirmDeleteAccount2(false); }}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-2">최종 확인</p>
            <h3 className="text-xl font-black text-slate-800 mb-3">마지막으로 한 번 더<br/>확인해주세요</h3>
            <p className="text-sm text-slate-500 mb-6">탈퇴 후에는 <span className="font-bold text-rose-500">복구가 불가능</span>합니다.<br/>그래도 탈퇴하시겠어요?</p>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmDeleteAccount(false); setConfirmDeleteAccount2(false); }} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">
                아니요, 취소
              </button>
              <button onClick={handleDeleteAccount} className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-rose-200">
                네, 탈퇴할게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 글 저장 안내 팝업 */}
      {showSaveTextToast && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setShowSaveTextToast(false)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save size={26} className="text-violet-500" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-2">작성 글에 저장됐어요!</h3>
            <p className="text-xs text-slate-500 mb-6">도구 탭 → 작성 글에서 언제든지 꺼내볼 수 있어요.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSaveTextToast(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all">
                확인
              </button>
              <button onClick={() => { setShowSaveTextToast(false); setTextToCount(''); setToolSubTab('savedTexts'); }}
                className="flex-1 jelly-button text-white py-3 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-md shadow-sky-200">
                작성 글 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 복사 경고 팝업 */}
      {copyWarning && (
        <div className="fixed inset-0 bg-slate-400/30 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setCopyWarning('')}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-600 whitespace-pre-line mb-6">{copyWarning}</p>
            <button onClick={() => setCopyWarning('')} className="w-full jelly-button py-3 rounded-2xl font-black text-sm active:scale-95 transition-all">
              확인
            </button>
          </div>
        </div>
      )}

      {/* 탭 바 */}
      {/* 하단 제작자 & 경고문 */}
      <footer className="text-center py-6 pb-28 sm:pb-32 space-y-2">
        <p className="text-[10px] text-slate-500 leading-relaxed">본 앱은 협찬 일정 관리를 위한 개인 보조 도구이며, 각 플랫폼의 공식 서비스가 아닙니다.<br />협찬 콘텐츠 작성 시 공정위 광고 표시 가이드라인을 준수해주세요.</p>
        <div className="flex items-center justify-center gap-3">
          <a href="/guide.html" className="text-[10px] text-slate-500 hover:text-sky-500 transition-colors">사용 가이드</a>
          <span className="text-slate-500 text-[10px]">·</span>
          <a href="/terms.html" className="text-[10px] text-slate-500 hover:text-sky-500 transition-colors">이용약관</a>
          <span className="text-slate-500 text-[10px]">·</span>
          <a href="/privacy.html" className="text-[10px] text-slate-500 hover:text-sky-500 transition-colors">개인정보처리방침</a>
        </div>
        <p className="text-[10px] text-slate-500">© 2026 Blue Review · 제작자 <span className="font-bold text-slate-600">hare_table</span></p>
      </footer>

      <nav className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl px-8 sm:px-10 py-5 sm:py-6 rounded-full flex items-center gap-8 sm:gap-10 shadow-[0_15px_40px_rgba(186,230,253,0.5)] z-40 border border-white">
        <button onClick={() => setActiveTab('home')} className={`transition-all ${activeTab === 'home' ? 'text-sky-500 scale-110 drop-shadow-md' : 'text-slate-500 hover:text-sky-400'}`}><ClipboardList size={26} /></button>
        <button onClick={() => setActiveTab('calendar')} className={`transition-all ${activeTab === 'calendar' ? 'text-sky-500 scale-110 drop-shadow-md' : 'text-slate-500 hover:text-sky-400'}`}><Calendar size={26} /></button>
        <button onClick={() => { setRawText(''); setParsedData({ ...emptyParsed }); setIsModalOpen(true); }} className="jelly-button text-white p-4 sm:p-5 rounded-full -mt-16 sm:-mt-20 shadow-xl shadow-sky-300/50 active:rotate-12 transition-all border-4 border-white"><Plus size={26} /></button>
        <button onClick={() => setActiveTab('scheduleManage')} className={`transition-all ${activeTab === 'scheduleManage' ? 'text-sky-500 scale-110 drop-shadow-md' : 'text-slate-500 hover:text-sky-400'}`}><CalendarDays size={26} /></button>
        <button onClick={() => setActiveTab('profile')} className={`transition-all ${activeTab === 'profile' ? 'text-sky-500 scale-110 drop-shadow-md' : 'text-slate-500 hover:text-sky-400'}`}><User size={26} /></button>
      </nav>

      {/* 스타일 애니메이션 (CSS) */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default BloggerMasterApp;
