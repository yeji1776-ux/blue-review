import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Clock, MapPin, Phone, Copy, Plus, LogOut,
  ClipboardList, ExternalLink, Calculator, BarChart3,
  CheckCircle2, Globe, Map as MapIcon, DollarSign, Sun, Star, X, Check,
  ChevronRight, Hash, Eye, Heart, Type, Gift, AlertTriangle, CalendarDays,
  Download, ChevronLeft, User, Save, Instagram, Pencil
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';

const BloggerMasterApp = () => {
  // --- 인증 ---
  const { user, loading, signInWithProvider, signUpWithEmail, signInWithEmail, signOut } = useAuth();
  const [authError, setAuthError] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // --- 프로필 ---
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('blogger_profile');
    return saved ? JSON.parse(saved) : {
      nickname: '',
      blogUrl: '',
      instaId: '',
      reelsUrl: '',
      facebookUrl: '',
      phone: '',
      email: '',
    };
  });
  const [profileSaved, setProfileSaved] = useState(false);

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
    const saved = localStorage.getItem('blogger_templates');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: '기본 신청 문구', content: '안녕하세요! 블로그 체험단 신청합니다.\n일일 방문자 수: \n블로그 주소: \n인스타그램: \n정성스럽게 리뷰하겠습니다!' },
    ];
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const saveTemplates = (updated) => {
    setTemplates(updated);
    localStorage.setItem('blogger_templates', JSON.stringify(updated));
  };

  const addTemplate = () => {
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

  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [textToCount, setTextToCount] = useState('');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [confirmDoneId, setConfirmDoneId] = useState(null); // 리뷰 등록 확인 팝업용
  const [confirmVisitDate, setConfirmVisitDate] = useState(null); // { id, date } 체험일 등록 확인 팝업용
  const [editingScheduleId, setEditingScheduleId] = useState(null); // 스케줄 수정 모드

  // 체험단 일정 데이터
  const [schedules, setSchedules] = useState([
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
  ]);

  const emptyParsed = {
    brand: '기타', type: '맛집', title: '', address: '', contact: '',
    mission: '', personalMission: '', experiencePeriod: '', deadline: '', provided: '',
    visitDays: '', visitTime: '', visitDate: '', visitSetTime: '', caution: '', ftcImageUrl: ''
  };

  // 임시 파싱 데이터
  const [parsedData, setParsedData] = useState({ ...emptyParsed });

  // 카드 ref 맵
  const cardRefs = useRef({});

  // --- D-Day 계산 ---
  const getDday = (deadlineStr) => {
    if (!deadlineStr) return null;
    // "3/23", "3/23 (월)", "2026-03-23", "2026.03.23" 등 다양한 형식 지원
    const cleaned = deadlineStr.replace(/\(.*?\)/g, '').trim();
    let deadlineDate;

    if (cleaned.match(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/)) {
      deadlineDate = new Date(cleaned.replace(/[./]/g, '-'));
    } else if (cleaned.match(/^\d{1,2}\/\d{1,2}$/)) {
      const [m, d] = cleaned.split('/');
      deadlineDate = new Date(new Date().getFullYear(), parseInt(m) - 1, parseInt(d));
    } else {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDdayLabel = (deadlineStr) => {
    const diff = getDday(deadlineStr);
    if (diff === null) return null;
    if (diff === 0) return { text: 'D-Day', color: 'bg-red-500' };
    if (diff < 0) return { text: `D+${Math.abs(diff)}`, color: 'bg-slate-400' };
    if (diff <= 3) return { text: `D-${diff}`, color: 'bg-red-500' };
    if (diff <= 7) return { text: `D-${diff}`, color: 'bg-orange-500' };
    return { text: `D-${diff}`, color: 'bg-sky-500' };
  };

  // --- 이미지 저장 ---
  const saveCardAsImage = async (id) => {
    const card = cardRefs.current[id];
    if (!card) return;
    try {
      const dataUrl = await domToPng(card, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `체험단_${id}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('이미지 저장 실패:', err);
      alert('이미지 저장에 실패했습니다.');
    }
  };

  // --- 앱 내 캘린더 ---
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);

  // 날짜 문자열 → Date 변환
  const parseDeadlineToDate = (str) => {
    if (!str) return null;
    const cleaned = str.replace(/\(.*?\)/g, '').trim();
    if (cleaned.match(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/)) {
      return new Date(cleaned.replace(/[./]/g, '-'));
    }
    if (cleaned.match(/^\d{1,2}\/\d{1,2}$/)) {
      const [m, d] = cleaned.split('/');
      return new Date(new Date().getFullYear(), parseInt(m) - 1, parseInt(d));
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
  const markAsDone = (id) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isDone: true } : s));
    setConfirmDoneId(null);
  };

  // --- 유틸리티 함수 ---
  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('복사되었습니다! ✨');
  };

  const handleEmailSignIn = async (email, password) => {
    setAuthError('');
    const { error } = await signInWithEmail(email, password);
    if (error) setAuthError(error.message);
  };

  const handleEmailSignUp = async (email, password) => {
    setAuthError('');
    const { error } = await signUpWithEmail(email, password);
    if (error) setAuthError(error.message);
  };

  const handleSocialLogin = async (provider) => {
    setAuthError('');
    const { error } = await signInWithProvider(provider);
    if (error) setAuthError(error.message);
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
  };

  const handleLogout = async () => {
    if (isGuest) {
      setIsGuest(false);
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
  "brand": "체험단 플랫폼명 (레뷰, 강남맛집, 리뷰노트, 미블 등. 모르면 '기타')",
  "type": "카테고리 (맛집, 헤어, 뷰티, 운동, 제품, 기자단 중 하나)",
  "title": "업체명 (지역 접두사 제외, 순수 상호명만)",
  "address": "방문 주소 (전체 주소)",
  "contact": "담당자 연락처 (전화번호)",
  "experiencePeriod": "체험 기간 (예: 3/10 ~ 3/23)",
  "deadline": "리뷰 마감일",
  "provided": "제공 서비스/물품 (실제 제공되는 메뉴나 서비스)",
  "visitDays": "체험 가능 요일",
  "visitTime": "체험 가능 시간",
  "caution": "예약 시 주의사항 (줄바꿈 대신 / 로 구분)",
  "mission": "기본 미션 (사진 수, 글자 수, 키워드, 동영상 등 작성 조건. 항목별로 줄바꿈(\\n)하여 정리)",
  "personalMission": "개인 미션 (업체 소개, 음식/서비스 설명 등 포스팅에 담아야 할 내용. 문장 단위로 줄바꿈(\\n)하여 가독성 좋게 추출)",
  "ftcImageUrl": "공정위 문구 이미지 URL (http/https로 시작하는 이미지 주소. 없으면 빈 문자열)"
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
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('JSON 파싱 실패');
  };

  const handleSmartParsing = async (text) => {
    setRawText(text);
    if (text.trim().length < 20) return; // 너무 짧으면 무시

    setIsParsing(true);
    try {
      const result = await parseWithGemini(text);
      setParsedData({
        brand: result.brand || '기타',
        type: result.type || '맛집',
        title: result.title || '',
        address: result.address || '',
        contact: result.contact || '',
        experiencePeriod: result.experiencePeriod || '',
        deadline: result.deadline || '',
        provided: result.provided || '',
        visitDays: result.visitDays || '',
        visitTime: result.visitTime || '',
        caution: result.caution || '',
        mission: result.mission || '',
        personalMission: result.personalMission || '',
        ftcImageUrl: result.ftcImageUrl || '',
      });
    } catch (err) {
      console.error('Gemini 파싱 에러:', err);
      alert('AI 분석에 실패했습니다. 다시 시도해주세요.\n' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const saveNewSchedule = () => {
    if (!parsedData.title) return alert('최소한 업체명은 있어야 합니다!');
    const newItem = { ...parsedData, id: Date.now(), isDone: false };
    setSchedules([...schedules, newItem]);
    setIsModalOpen(false);
    setRawText('');
    // 저장 후 캘린더 탭으로 이동
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
          <p className="text-slate-400 text-sm font-bold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <LoginPage
        onEmailSignIn={handleEmailSignIn}
        onEmailSignUp={handleEmailSignUp}
        onSocialLogin={handleSocialLogin}
        onGuestLogin={handleGuestLogin}
        authError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 pb-28 sm:pb-36 font-sans select-none">
      {/* 1. 상단 날씨 & 퀵 버튼 */}
      <header className="bg-white/80 backdrop-blur-md px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 sticky top-0 z-30 border-b border-sky-100">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/favicon.png" alt="logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain filter drop-shadow hover:scale-110 transition-transform cursor-pointer" onClick={() => setActiveTab('home')} />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Blue Review</h2>
              <p className="text-[10px] sm:text-[12px] font-bold text-slate-400 mt-0.5 hidden sm:block">블로거를 위한 협찬 관리</p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <a href="https://adpost.naver.com/" target="_blank" className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-sm"><DollarSign size={18} /></a>
            <a href="https://blog.naver.com/" target="_blank" className="p-2.5 sm:p-3 bg-sky-50 text-sky-600 rounded-xl sm:rounded-2xl border border-sky-100 shadow-sm"><Globe size={18} /></a>
            <button onClick={handleLogout} className="p-2.5 sm:p-3 bg-slate-100 text-slate-400 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:text-rose-500 transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-400 to-sky-400 p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-sky-200 flex items-center gap-3 sm:gap-4">
          <Sun size={24} className="animate-spin-slow sm:hidden" />
          <Sun size={32} className="animate-spin-slow hidden sm:block" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">촬영 지수 95%</p>
            <p className="font-bold text-sm sm:text-base">채광이 완벽해요! 오늘 맛집 사진 최고입니다.</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg sm:text-2xl font-black">{new Date().getMonth() + 1}월 {new Date().getDate()}일</p>
            <p className="text-[10px] sm:text-xs font-bold opacity-80">{['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]}요일</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-10">

        {/* 탭 메뉴 */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Quick Copy(왼) + 신청 문구(오) 2컬럼 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 왼쪽: Quick Copy */}
              <section className="jelly-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase">Quick Copy</h3>
                  <p className="text-[10px] font-bold text-slate-400">누르면 주소가 복사됩니다</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '블로그', value: profile.blogUrl, icon: <Heart size={14}/>, bg: 'bg-sky-50 text-sky-500' },
                    { label: '인스타', value: profile.instaId, icon: <Heart size={14}/>, bg: 'bg-pink-50 text-pink-500' },
                    { label: '릴스', value: profile.reelsUrl, icon: <Heart size={14}/>, bg: 'bg-violet-50 text-violet-500' },
                    { label: '페이스북', value: profile.facebookUrl, icon: <Heart size={14}/>, bg: 'bg-blue-50 text-blue-500' },
                  ].map(({ label, value, icon, bg }) => (
                    <button key={label} onClick={() => copyToClipboard(value || `프로필에서 ${label}을 설정하세요`)} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:bg-sky-50 transition-all">
                      <div className={`p-2 rounded-xl ${bg}`}>{icon}</div>
                      <span className="text-[10px] font-bold text-slate-600">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 오른쪽: 신청 문구 템플릿 */}
              <section className="jelly-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase">신청 문구</h3>
                  <button onClick={addTemplate} className="flex items-center gap-1 text-[10px] font-bold text-sky-500 active:scale-95 transition-all">
                    <Plus size={14}/> 추가
                  </button>
                </div>
                {/* 문구 목록 (버튼) - 2개까지만 표시 */}
                <div className="space-y-2">
                  {templates.slice(0, 2).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setEditingTemplateId(t.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-sky-50/50 active:bg-sky-100 transition-all"
                    >
                      {t.title}
                    </button>
                  ))}
                  {templates.length > 2 && (
                    <button
                      onClick={() => setEditingTemplateId('list')}
                      className="w-full text-center py-2 rounded-xl text-[10px] font-bold text-sky-400 bg-sky-50 active:bg-sky-100 transition-all"
                    >
                      +{templates.length - 2}개 더보기
                    </button>
                  )}
                </div>
              </section>
            </div>

            {/* 일정 리스트 (진행중만) */}
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-tighter">Schedules</h3>
                <button onClick={() => setActiveTab('scheduleManage')} className="flex items-center gap-1 text-[10px] font-bold text-sky-500 active:scale-95 transition-all">
                  전체 관리 <ChevronRight size={12}/>
                </button>
              </div>
              <div className="jelly-card overflow-hidden divide-y divide-slate-100">
                {schedules.filter(s => !s.isDone).length > 0 ? (
                  schedules.filter(s => !s.isDone).map(item => {
                    const dday = getDdayLabel(item.deadline);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedScheduleId(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-sky-50 transition-all"
                      >
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black border ${item.brand === '레뷰' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.brand}</span>
                        <span className="text-[10px] font-bold text-sky-500 shrink-0">{item.type}</span>
                        <span className="text-sm font-bold truncate flex-1 text-slate-700">{item.title}</span>
                        {dday && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                        <ChevronRight size={14} className="text-slate-300 shrink-0" />
                      </button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-300 text-sm font-bold">진행중인 일정이 없습니다</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* 스케줄 전체 관리 */}
        {activeTab === 'scheduleManage' && (() => {
          const { year, month } = calendarMonth;
          const manageLabel = `${year}년 ${month + 1}월`;
          const monthFiltered = schedules.filter(s => {
            const d = parseDeadlineToDate(s.deadline);
            if (!d) return false;
            return d.getFullYear() === year && d.getMonth() === month;
          });
          const mOngoing = monthFiltered.filter(s => !s.isDone);
          const mDone = monthFiltered.filter(s => s.isDone);

          return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setActiveTab('home')} className="p-2 bg-sky-50 rounded-xl"><ChevronLeft size={20}/></button>
                <h3 className="text-lg font-black text-slate-900">스케줄 관리</h3>
              </div>

              {/* 월 네비게이션 */}
              <div className="flex justify-between items-center">
                <button onClick={() => setCalendarMonth(prev => {
                  const d = new Date(prev.year, prev.month - 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })} className="p-2 bg-white rounded-xl border border-sky-100"><ChevronLeft size={20}/></button>
                <h3 className="font-black text-xl text-slate-800">{manageLabel}</h3>
                <button onClick={() => setCalendarMonth(prev => {
                  const d = new Date(prev.year, prev.month + 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })} className="p-2 bg-white rounded-xl border border-sky-100"><ChevronRight size={20}/></button>
              </div>

              {/* 요약 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="jelly-card p-4 text-center">
                  <p className="text-[9px] font-black text-slate-400 mb-1">전체</p>
                  <p className="text-2xl font-black text-slate-800">{monthFiltered.length}</p>
                </div>
                <div className="jelly-card p-4 text-center">
                  <p className="text-[9px] font-black text-sky-400 mb-1">진행중</p>
                  <p className="text-2xl font-black text-sky-600">{mOngoing.length}</p>
                </div>
                <div className="jelly-card p-4 text-center">
                  <p className="text-[9px] font-black text-emerald-400 mb-1">완료</p>
                  <p className="text-2xl font-black text-emerald-600">{mDone.length}</p>
                </div>
              </div>

              {/* 진행중 */}
              <section>
                <h4 className="text-xs font-black text-sky-500 mb-3 px-1 flex items-center gap-1"><Clock size={14}/> 진행중 ({mOngoing.length})</h4>
                <div className="jelly-card overflow-hidden divide-y divide-slate-100">
                  {mOngoing.length > 0 ? (
                    mOngoing.map(item => {
                      const dday = getDdayLabel(item.deadline);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedScheduleId(item.id)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-sky-50 transition-all"
                        >
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black border ${item.brand === '레뷰' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.brand}</span>
                          <span className="text-[10px] font-bold text-sky-500 shrink-0">{item.type}</span>
                          <span className="text-sm font-bold truncate flex-1 text-slate-700">{item.title}</span>
                          {dday && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                          <ChevronRight size={14} className="text-slate-300 shrink-0" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-300 text-sm font-bold">진행중인 일정이 없습니다</div>
                  )}
                </div>
              </section>

              {/* 완료 */}
              <section>
                <h4 className="text-xs font-black text-emerald-500 mb-3 px-1 flex items-center gap-1"><CheckCircle2 size={14}/> 완료 ({mDone.length})</h4>
                <div className="jelly-card overflow-hidden divide-y divide-slate-100">
                  {mDone.length > 0 ? (
                    mDone.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedScheduleId(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-sky-50 transition-all opacity-60"
                      >
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black border ${item.brand === '레뷰' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.brand}</span>
                        <span className="text-[10px] font-bold text-sky-500 shrink-0">{item.type}</span>
                        <span className="text-sm font-bold truncate flex-1 text-slate-300 line-through">{item.title}</span>
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <ChevronRight size={14} className="text-slate-300 shrink-0" />
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-300 text-sm font-bold">완료된 일정이 없습니다</div>
                  )}
                </div>
              </section>
            </div>
          );
        })()}


        {activeTab === 'tool' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="jelly-card p-8 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Calculator size={24} className="text-sky-500" /> 글자 수 측정</h3>
                <span className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-full font-bold">1,500자 권장</span>
              </div>
              <textarea className="w-full h-64 p-6 bg-sky-50 rounded-[32px] border-none focus:ring-2 focus:ring-sky-500 outline-none text-slate-600 leading-relaxed text-sm mb-6" placeholder="파워블로거는 원고 내용으로 승부합니다. 여기에 내용을 적으세요!" value={textToCount} onChange={(e) => setTextToCount(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sky-50 p-5 rounded-3xl">
                  <p className="text-[10px] font-black text-sky-400 mb-1">공백 포함</p>
                  <p className="text-2xl font-black text-sky-700 underline decoration-sky-200">{textToCount.length}</p>
                </div>
                <div className="bg-sky-50 p-5 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 mb-1">공백 제외</p>
                  <p className="text-2xl font-black text-slate-800">{textToCount.replace(/\s+/g, '').length}</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'calendar' && (
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
                  <ClipboardList size={12}/> 전체 관리
                </button>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <div key={d} className={`text-center text-[10px] font-black py-1 ${d === '일' ? 'text-rose-400' : d === '토' ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>
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
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400"/><span className="text-[10px] font-bold text-slate-400">리뷰 마감일</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400"/><span className="text-[10px] font-bold text-slate-400">협찬 일정</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300"/><span className="text-[10px] font-bold text-slate-400">리뷰 완료</span></div>
              </div>
            </section>

            {/* 이번 달 일정 리스트 */}
            <section className="jelly-card p-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
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
                if (unique.length === 0) return <p className="text-xs text-slate-300 font-bold text-center py-4">이번 달 일정이 없습니다</p>;
                return (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {unique.map((e, i) => (
                      <button key={i} onClick={() => setSelectedScheduleId(e.id)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sky-50/50 active:bg-sky-100 transition-all text-left">
                        <span className="text-[11px] font-black text-slate-400 w-10 shrink-0">{e._date.getMonth() + 1}/{e._date.getDate()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0 ${e._color === 'rose' ? 'bg-rose-400' : 'bg-sky-400'}`}>{e._label}</span>
                        <span className={`text-xs font-bold truncate ${e.isDone ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{e.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </section>
            </div>

            {/* 선택한 날짜의 스케줄 */}
            {selectedDate && (
              <section className="space-y-3">
                <h4 className="text-sm font-black text-slate-400 px-1">
                  {calendarMonth.month + 1}월 {selectedDate}일 일정 ({selectedSchedules.length}건)
                </h4>
                {selectedSchedules.length === 0 ? (
                  <div className="jelly-card p-8 text-center">
                    <p className="text-sm text-slate-300 font-bold">이 날의 일정이 없습니다</p>
                  </div>
                ) : selectedSchedules.map(item => {
                  const dday = getDdayLabel(item.deadline);
                  return (
                    <div key={item.id} onClick={() => setSelectedScheduleId(item.id)} className="jelly-card p-5 cursor-pointer active:scale-[0.98] transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${item.brand === '레뷰' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.brand}</span>
                        <span className="text-[10px] font-bold text-sky-500">{item.type}</span>
                        {dday && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                      </div>
                      <h5 className={`font-black text-base mb-1 ${item.isDone ? 'text-slate-300 line-through' : 'text-slate-800'}`}>{item.title}</h5>
                      {item.address && <p className="text-xs text-slate-400">{item.address}</p>}
                    </div>
                  );
                })}
              </section>
            )}

          </div>
        )}

      </main>

      {/* --- 신청 문구 전체 목록 팝업 --- */}
      {editingTemplateId === 'list' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setEditingTemplateId(null)}>
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-4 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">신청 문구 전체</h3>
              <button onClick={() => setEditingTemplateId(null)} className="p-2 bg-sky-50 rounded-full"><X size={16}/></button>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {templates.map(t => (
                <button key={t.id} onClick={() => setEditingTemplateId(t.id)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-600 bg-sky-50/50 active:bg-sky-100 transition-all">
                  {t.title}
                </button>
              ))}
            </div>
            <button onClick={() => { addTemplate(); }} className="w-full py-3 rounded-2xl text-sm font-bold text-sky-500 bg-sky-50 active:scale-95 transition-all flex items-center justify-center gap-1">
              <Plus size={14}/> 새 문구 추가
            </button>
          </div>
        </div>
      )}

      {/* --- 신청 문구 팝업 --- */}
      {editingTemplateId && editingTemplateId !== 'list' && (() => {
        const t = templates.find(x => x.id === editingTemplateId);
        if (!t) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setEditingTemplateId(null)}>
            <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-5 animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">신청 문구</h3>
                <button onClick={() => setEditingTemplateId(null)} className="p-2 bg-sky-50 rounded-full"><X size={16}/></button>
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
                <button onClick={() => { localStorage.setItem('blogTemplates', JSON.stringify(templates)); alert('저장되었습니다!'); }} className="flex-1 bg-sky-500 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save size={16}/> 저장
                </button>
                <button onClick={() => { copyToClipboard(t.content); setEditingTemplateId(null); }} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Copy size={16}/> 복사
                </button>
                <button onClick={() => deleteTemplate(t.id)} className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all">
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
        const dday = getDdayLabel(item.deadline);
        const isEditing = editingScheduleId === item.id;
        const updateField = (key, val) => setSchedules(schedules.map(s => s.id === item.id ? { ...s, [key]: val } : s));
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setSelectedScheduleId(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 space-y-5 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex justify-between items-start" ref={el => cardRefs.current[item.id] = el} data-card-id={item.id}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${item.brand === '레뷰' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.brand}</span>
                    <span className="text-[10px] font-bold text-sky-500">{item.type}</span>
                    {dday && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${dday.color}`}>{dday.text}</span>}
                  </div>
                  <h3 className={`text-xl font-black ${item.isDone ? 'text-slate-300 line-through' : 'text-slate-800'}`}>{item.title}</h3>
                  {item.visitDate ? (
                    <p className="text-[11px] font-bold text-sky-500 mt-1.5 flex items-center gap-1">
                      <CalendarDays size={11}/> {item.visitDate} {item.visitSetTime && `· ${item.visitSetTime}`}
                      <button onClick={() => setConfirmVisitDate({ id: item.id, date: item.visitDate, time: item.visitSetTime || '' })} className="ml-1 text-sky-400 underline">변경</button>
                    </p>
                  ) : (
                    <button onClick={() => setConfirmVisitDate({ id: item.id, date: '', time: '' })} className="mt-1.5 text-[11px] font-black text-amber-700 flex items-center gap-1 bg-amber-300 px-4 py-2 rounded-full shadow-md shadow-amber-200 active:scale-95 transition-all">
                      <CalendarDays size={12}/> 체험일 설정
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingScheduleId(editingScheduleId === item.id ? null : item.id)} className={`p-2 rounded-xl active:scale-90 transition-all ${editingScheduleId === item.id ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-400'}`}><Pencil size={16}/></button>
                  <button onClick={() => saveCardAsImage(item.id)} className="p-2 bg-sky-50 rounded-xl text-sky-400 active:scale-90 transition-all"><Download size={16}/></button>
                  <button onClick={() => { setEditingScheduleId(null); setSelectedScheduleId(null); }} className="p-2 bg-sky-50 rounded-full"><X size={16}/></button>
                </div>
              </div>

              {/* 수정 모드 */}
              {isEditing && (
                <div className="bg-sky-50 p-5 rounded-2xl space-y-3 border-2 border-sky-200">
                  <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">스케줄 수정</p>
                  <div className="flex items-center gap-3">
                    <div className="w-14 shrink-0 text-[10px] font-bold text-sky-400">카테고리</div>
                    <select className="flex-1 bg-white px-3 py-2 rounded-xl ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-sm font-bold text-slate-700" value={item.type || '맛집'} onChange={(e) => updateField('type', e.target.value)}>
                      {['맛집', '기자단', '제품', '헤어', '뷰티', '운동', '기타'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {[
                    { label: '업체명', key: 'title' },
                    { label: '주소', key: 'address' },
                    { label: '연락처', key: 'contact' },
                    { label: '제공내역', key: 'provided' },
                    { label: '체험기간', key: 'experiencePeriod' },
                    { label: '리뷰마감', key: 'deadline' },
                    { label: '가능요일', key: 'visitDays' },
                    { label: '가능시간', key: 'visitTime' },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-14 shrink-0 text-[10px] font-bold text-sky-400">{label}</div>
                      <input className="flex-1 bg-white px-3 py-2 rounded-xl ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-sm font-bold text-slate-700" value={item[key] || ''} onChange={(e) => updateField(key, e.target.value)} />
                    </div>
                  ))}
                  {[
                    { label: '주의사항', key: 'caution', color: 'orange' },
                    { label: '기본미션', key: 'mission', color: 'sky' },
                    { label: '개인미션', key: 'personalMission', color: 'pink' },
                  ].map(({ label, key, color }) => (
                    <div key={key} className="flex gap-3">
                      <div className={`w-14 shrink-0 text-[10px] font-bold text-${color}-400 pt-2`}>{label}</div>
                      <textarea className={`flex-1 bg-white px-3 py-2 rounded-xl ring-1 ring-${color}-100 focus:ring-2 focus:ring-${color}-300 outline-none text-xs font-medium text-slate-700 h-24 resize-none`} value={item[key] || ''} onChange={(e) => updateField(key, e.target.value)} />
                    </div>
                  ))}
                  <button onClick={() => { localStorage.setItem('blogSchedules', JSON.stringify(schedules)); setEditingScheduleId(null); }} className="w-full bg-sky-500 text-white py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Save size={14}/> 수정 완료
                  </button>
                </div>
              )}

              {/* 기본 정보 */}
              {!isEditing && <><div className="space-y-2">
                {item.address && (
                  <div className="flex items-center gap-2">
                    <a href={`https://map.naver.com/v5/search/${encodeURIComponent(item.title)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-3 text-sm text-slate-500 bg-sky-50 p-3 rounded-2xl active:bg-sky-100 transition-all">
                      <MapPin size={16} className="text-sky-400 shrink-0"/> <span className="truncate">{item.address}</span>
                      <ExternalLink size={12} className="text-sky-300 shrink-0 ml-auto"/>
                    </a>
                    <button onClick={() => copyToClipboard(item.address)} className="p-3 bg-sky-50 rounded-2xl text-sky-400 active:scale-90 transition-all shrink-0">
                      <Copy size={14}/>
                    </button>
                  </div>
                )}
                {item.contact && (
                  <div className="flex items-center gap-2">
                    <a href={`tel:${item.contact}`} className="flex-1 flex items-center gap-3 text-sm text-slate-500 bg-sky-50 p-3 rounded-2xl active:bg-sky-100 transition-all">
                      <Phone size={16} className="text-sky-400 shrink-0"/> <span>{item.contact}</span>
                    </a>
                    <button onClick={() => copyToClipboard(item.contact)} className="p-3 bg-sky-50 rounded-2xl text-sky-400 active:scale-90 transition-all shrink-0">
                      <Copy size={14}/>
                    </button>
                  </div>
                )}
                {item.provided && (
                  <div className="flex items-center gap-3 text-sm text-slate-500 bg-sky-50 p-3 rounded-2xl">
                    <Gift size={16} className="text-emerald-400 shrink-0"/> <span>{item.provided}</span>
                  </div>
                )}
              </div>

              {/* 일정 정보 */}
              <div className="grid grid-cols-2 gap-2">
                {item.experiencePeriod && (
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-blue-400 mb-1">체험기간</p>
                    <p className="text-xs font-bold text-blue-700">{item.experiencePeriod}</p>
                  </div>
                )}
                {item.deadline && (
                  <div className="bg-rose-50 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-rose-400 mb-1">리뷰마감</p>
                    <p className="text-xs font-bold text-rose-700">{item.deadline}</p>
                  </div>
                )}
                {item.visitDays && (
                  <div className="bg-violet-50 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-violet-400 mb-1">가능요일</p>
                    <p className="text-xs font-bold text-violet-700">{item.visitDays}</p>
                  </div>
                )}
                {item.visitTime && (
                  <div className="bg-amber-50 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-amber-400 mb-1">가능시간</p>
                    <p className="text-xs font-bold text-amber-700">{item.visitTime}</p>
                  </div>
                )}
              </div>

              {/* 주의사항 */}
              {item.caution && (
                <div className="bg-orange-50/50 p-5 rounded-2xl border border-dashed border-orange-200">
                  <p className="text-[10px] font-black text-orange-400 mb-2 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10}/> 주의사항</p>
                  <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line">{item.caution}</p>
                </div>
              )}

              {/* 기본 미션 */}
              {item.mission && (
                <div className="bg-sky-50/50 p-5 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">기본 미션</p>
                  <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line">{item.mission}</p>
                </div>
              )}

              {/* 개인 미션 */}
              {item.personalMission && (
                <div className="bg-pink-50/50 p-5 rounded-2xl border border-dashed border-pink-200">
                  <p className="text-[10px] font-black text-pink-400 mb-2 uppercase tracking-widest">개인 미션</p>
                  <p className="text-xs text-slate-600 leading-loose font-medium whitespace-pre-line">{item.personalMission}</p>
                </div>
              )}

              {/* 공정위 문구 */}
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-dashed border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">공정위 문구 URL</p>
                  {item.ftcImageUrl && (
                    <button onClick={() => copyToClipboard(item.ftcImageUrl)} className="flex items-center gap-1 text-[10px] font-bold text-orange-500 active:scale-95 transition-all">
                      <Copy size={10}/> URL 복사
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/80 ring-1 ring-orange-100 focus:ring-2 focus:ring-orange-300 outline-none text-xs transition-all"
                    placeholder="공정위 이미지 URL을 붙여넣으세요"
                    value={item.ftcImageUrl || ''}
                    onChange={(e) => setSchedules(schedules.map(s => s.id === item.id ? { ...s, ftcImageUrl: e.target.value } : s))}
                  />
                  <button onClick={() => { localStorage.setItem('blogSchedules', JSON.stringify(schedules)); alert('저장되었습니다!'); }} className="px-3 py-2.5 bg-orange-400 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0">
                    <Save size={14}/>
                  </button>
                  {item.ftcImageUrl && (
                    <button onClick={() => copyToClipboard(item.ftcImageUrl)} className="px-3 py-2.5 bg-orange-50 text-orange-500 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0">
                      <Copy size={14}/>
                    </button>
                  )}
                </div>
                {item.ftcImageUrl && (
                  <img src={item.ftcImageUrl} alt="공정위 문구" className="max-h-16 rounded-lg object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
              </div>

              {/* 블로그 리뷰 글 링크 */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-dashed border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">블로그 리뷰 글 링크</p>
                  {item.reviewUrl && (
                    <a href={item.reviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 active:scale-95 transition-all">
                      <ExternalLink size={10}/> 글 보기
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 rounded-xl bg-white/80 ring-1 ring-emerald-100 focus:ring-2 focus:ring-emerald-300 outline-none text-xs transition-all"
                    placeholder="블로그에 올린 리뷰 글 URL을 붙여넣으세요"
                    value={item.reviewUrl || ''}
                    onChange={(e) => setSchedules(schedules.map(s => s.id === item.id ? { ...s, reviewUrl: e.target.value } : s))}
                  />
                  <button onClick={() => { localStorage.setItem('blogSchedules', JSON.stringify(schedules)); alert('저장되었습니다!'); }} className="px-3 py-2.5 bg-emerald-400 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0">
                    <Save size={14}/>
                  </button>
                  {item.reviewUrl && (
                    <button onClick={() => copyToClipboard(item.reviewUrl)} className="px-3 py-2.5 bg-emerald-50 text-emerald-500 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0">
                      <Copy size={14}/>
                    </button>
                  )}
                </div>
              </div>
              </>}

              {/* 하단 버튼 3개: 글자수계산기 | 닫기 | 리뷰등록 */}
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedScheduleId(null); setActiveTab('tool'); }} className="flex-1 bg-violet-50 text-violet-600 py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
                  <Calculator size={14}/> 글자수계산기
                </button>
                <button onClick={() => setSelectedScheduleId(null)} className="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
                  <X size={14}/> 닫기
                </button>
                {!item.isDone ? (
                  <button
                    onClick={() => { setSelectedScheduleId(null); setConfirmDoneId(item.id); }}
                    className="flex-1 jelly-button py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14}/> 리뷰 등록
                  </button>
                ) : (
                  <div className="flex-1 bg-slate-100 text-slate-400 py-3.5 rounded-2xl font-bold text-xs text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14}/> 등록 완료
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 리뷰 등록 확인 팝업 --- */}
      {confirmDoneId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-sky-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">리뷰 등록 완료</h3>
            <p className="text-sm text-slate-400 mb-8">블로그에 리뷰를 등록하셨나요?<br />완료 처리하면 되돌릴 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDoneId(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              >
                아직이요
              </button>
              <button
                onClick={() => markAsDone(confirmDoneId)}
                className="flex-1 jelly-button py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              >
                네, 완료!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 체험일 등록 확인 팝업 --- */}
      {confirmVisitDate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarDays size={32} className="text-sky-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">체험일 설정</h3>
            <p className="text-xs text-slate-300 mb-6">날짜와 시간을 설정하면 달력에 자동 표시돼요.</p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 bg-sky-50 p-3 rounded-2xl">
                <CalendarDays size={16} className="text-sky-400 shrink-0"/>
                <input type="date" className="flex-1 bg-transparent outline-none font-bold text-sm text-slate-700" value={confirmVisitDate.date} onChange={(e) => setConfirmVisitDate({ ...confirmVisitDate, date: e.target.value })} />
              </div>
              <div className="bg-sky-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-sky-400 shrink-0"/>
                  <span className="text-xs font-bold text-slate-400">시간 선택</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {/* 시 다이얼 */}
                  <div className="relative h-[120px] w-20 overflow-hidden rounded-2xl bg-white">
                    <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"/>
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"/>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-sky-100 rounded-xl z-0"/>
                    <div className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-10"
                      ref={el => { if (el && !el.dataset.scrolled) { const h = parseInt((confirmVisitDate.time || '12:00').split(':')[0]); el.scrollTop = (h - 1) * 40; el.dataset.scrolled = '1'; } }}
                      onScroll={(e) => { const idx = Math.round(e.target.scrollTop / 40); const h = idx + 1; if (h >= 1 && h <= 24) { const m = (confirmVisitDate.time || '').split(':')[1] || '00'; setConfirmVisitDate({ ...confirmVisitDate, time: `${h}:${m}` }); } }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                        <div key={h} className={`h-10 flex items-center justify-center snap-center text-lg font-black transition-all ${String(h) === (confirmVisitDate.time || '12:00').split(':')[0] ? 'text-sky-600 scale-110' : 'text-slate-300'}`}>{h}</div>
                      ))}
                    </div>
                  </div>
                  <span className="text-2xl font-black text-sky-400">:</span>
                  {/* 분 다이얼 */}
                  <div className="relative h-[120px] w-20 overflow-hidden rounded-2xl bg-white">
                    <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"/>
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"/>
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-sky-100 rounded-xl z-0"/>
                    <div className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-10"
                      ref={el => { if (el && !el.dataset.scrolled) { const m = (confirmVisitDate.time || '12:00').split(':')[1]; el.scrollTop = m === '30' ? 40 : 0; el.dataset.scrolled = '1'; } }}
                      onScroll={(e) => { const idx = Math.round(e.target.scrollTop / 40); const m = idx === 1 ? '30' : '00'; const h = (confirmVisitDate.time || '12').split(':')[0]; setConfirmVisitDate({ ...confirmVisitDate, time: `${h}:${m}` }); }}
                    >
                      {['00', '30'].map(m => (
                        <div key={m} className={`h-10 flex items-center justify-center snap-center text-lg font-black transition-all ${m === ((confirmVisitDate.time || '12:00').split(':')[1] || '00') ? 'text-sky-600 scale-110' : 'text-slate-300'}`}>{m}</div>
                      ))}
                    </div>
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
                onClick={() => {
                  if (!confirmVisitDate.date) return;
                  setSchedules(schedules.map(s => s.id === confirmVisitDate.id ? { ...s, visitDate: confirmVisitDate.date, visitSetTime: confirmVisitDate.time } : s));
                  setConfirmVisitDate(null);
                }}
                className="flex-1 jelly-button py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              >
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 스마트 파서 모달 --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800 italic">Smart Parser</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-sky-50 rounded-full"><X /></button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400">협찬 사이트의 내용을 통째로 복사해서 붙여넣으세요.</p>
              {rawText && (
                <button onClick={() => { setRawText(''); setParsedData({ ...emptyParsed }); }} className="text-[10px] font-bold text-rose-400 active:scale-95 transition-all">
                  지우기
                </button>
              )}
            </div>

            <textarea
              className="w-full h-40 p-6 bg-sky-50 rounded-3xl border-none focus:ring-2 focus:ring-sky-500 outline-none text-sm text-slate-600 transition-all shadow-inner"
              placeholder="여기에 붙여넣기..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted.trim().length >= 20) {
                  setTimeout(() => handleSmartParsing(pasted), 100);
                }
              }}
            />

            {rawText.trim().length >= 20 && (
              <button
                onClick={() => handleSmartParsing(rawText)}
                disabled={isParsing}
                className="w-full jelly-button py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {isParsing ? 'AI가 분석 중...' : 'AI로 분석하기'}
              </button>
            )}

            <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100 space-y-4">
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">추출된 정보 미리보기</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300">카테고리</div>
                  <div className="flex-1 relative">
                    <select className="w-full bg-sky-50 border border-sky-100 rounded-xl font-bold text-slate-700 outline-none appearance-none text-sm py-2 px-3 pr-8" value={parsedData.type} onChange={(e) => setParsedData({ ...parsedData, type: e.target.value })}>{['맛집', '기자단', '제품', '헤어', '뷰티', '운동', '기타'].map(t => <option key={t}>{t}</option>)}</select>
                    <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-sky-400 pointer-events-none"/>
                  </div>
                </div>
                {[
                  { label: '업체명', key: 'title' },
                  { label: '주소', key: 'address' },
                  { label: '연락처', key: 'contact' },
                  { label: '체험기간', key: 'experiencePeriod' },
                  { label: '리뷰마감', key: 'deadline' },
                  { label: '제공내역', key: 'provided' },
                  { label: '가능요일', key: 'visitDays' },
                  { label: '가능시간', key: 'visitTime' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-14 shrink-0 text-[10px] font-bold text-sky-300">{label}</div>
                    <input className="flex-1 bg-transparent border-b border-sky-100 font-bold text-slate-700 outline-none text-sm py-1" value={parsedData[key]} onChange={(e) => setParsedData({ ...parsedData, [key]: e.target.value })} />
                  </div>
                ))}
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

            <button onClick={saveNewSchedule} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg shadow-2xl active:scale-95 transition-all">스케줄 저장</button>
          </div>
        </div>
      )}

      {/* 프로필 탭 */}
      {activeTab === 'profile' && (
        <main className="max-w-xl mx-auto p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-sky-50 rounded-2xl text-sky-500"><User size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900">내 프로필</h3>
              <p className="text-xs text-slate-400">체험단 신청 시 사용할 기본 정보</p>
            </div>
          </div>

          <div className="jelly-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-slate-400">Quick Copy</h4>
              <p className="text-[10px] font-bold text-slate-400">버튼을 누르면 정보가 복사됩니다</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '블로그', value: profile.blogUrl },
                { label: '인스타', value: profile.instaId },
                { label: '릴스', value: profile.reelsUrl },
                { label: '페이스북', value: profile.facebookUrl },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => copyToClipboard(value || `${label}을 입력해주세요`)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 text-xs font-bold text-slate-600 active:bg-sky-100 transition-all"
                >
                  <Copy size={12} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'blogUrl', label: '블로그 주소', placeholder: 'https://blog.naver.com/myid', icon: <Globe size={18} /> },
              { key: 'instaId', label: '인스타그램 ID', placeholder: '@my_instagram', icon: <Instagram size={18} /> },
              { key: 'reelsUrl', label: '릴스/유튜브 주소', placeholder: 'https://www.instagram.com/reels/...', icon: <Eye size={18} /> },
              { key: 'facebookUrl', label: '페이스북 주소', placeholder: 'https://facebook.com/mypage', icon: <ExternalLink size={18} /> },

              { key: 'email', label: '이메일', placeholder: 'my@email.com', icon: <Heart size={18} /> },
            ].map(({ key, label, placeholder, icon }) => (
              <div key={key} className="jelly-card p-4">
                <label className="flex items-center gap-2 text-xs font-black text-slate-500 mb-2">
                  <span className="text-sky-500">{icon}</span>
                  {label}
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-sky-50/50 ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-400 outline-none text-sm transition-all"
                  placeholder={placeholder}
                  value={profile[key]}
                  onChange={(e) => updateProfile(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={saveProfile}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {profileSaved ? '저장 완료!' : '프로필 저장'}
          </button>
        </main>
      )}

      {/* 탭 바 */}
      <nav className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl px-5 sm:px-6 py-4 sm:py-5 rounded-full flex items-center gap-5 sm:gap-6 shadow-[0_25px_50px_rgba(0,0,0,0.3)] z-40 border border-white/10">
        <button onClick={() => setActiveTab('home')} className={`transition-all ${activeTab === 'home' ? 'text-white scale-110' : 'text-slate-500'}`}><ClipboardList size={20} /></button>
        <button onClick={() => setActiveTab('calendar')} className={`transition-all ${activeTab === 'calendar' ? 'text-white scale-110' : 'text-slate-500'}`}><Calendar size={20} /></button>
        <button onClick={() => { setRawText(''); setParsedData({ ...emptyParsed }); setIsModalOpen(true); }} className="bg-white text-slate-900 p-3 sm:p-4 rounded-full -mt-16 sm:-mt-20 shadow-xl shadow-slate-900/20 active:rotate-12 transition-all border-4 border-slate-900"><Plus size={24} /></button>
        <button onClick={() => setActiveTab('tool')} className={`transition-all ${activeTab === 'tool' ? 'text-white scale-110' : 'text-slate-500'}`}><Calculator size={20} /></button>
        <button onClick={() => setActiveTab('profile')} className={`transition-all ${activeTab === 'profile' ? 'text-white scale-110' : 'text-slate-500'}`}><User size={20} /></button>
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
