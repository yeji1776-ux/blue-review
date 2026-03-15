import React, { useState, useRef } from 'react';
import { Star } from 'lucide-react';

const EMAIL_DOMAINS = ['gmail.com', 'naver.com', 'kakao.com', 'daum.net', 'hanmail.net', 'yahoo.com', 'outlook.com'];

const LoginPage = ({ onEmailSignIn, onEmailSignUp, onSocialLogin, onGuestLogin, authError }) => {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') !== 'false');
  const [localError, setLocalError] = useState('');
  const [domainSuggestions, setDomainSuggestions] = useState([]);
  const emailRef = useRef(null);

  const error = authError || localError;

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    const atIdx = val.indexOf('@');
    if (atIdx !== -1) {
      const typed = val.slice(atIdx + 1).toLowerCase();
      const filtered = EMAIL_DOMAINS.filter(d => d.startsWith(typed) && d !== typed);
      setDomainSuggestions(filtered.length > 0 ? filtered : []);
    } else {
      setDomainSuggestions([]);
    }
  };

  const selectDomain = (domain) => {
    const atIdx = email.indexOf('@');
    const base = atIdx !== -1 ? email.slice(0, atIdx) : email;
    setEmail(`${base}@${domain}`);
    setDomainSuggestions([]);
    emailRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim()) return setLocalError('이메일을 입력해주세요.');
    if (password.length < 6) return setLocalError('비밀번호는 6자 이상이어야 합니다.');
    if (authMode === 'signup' && !nickname.trim()) return setLocalError('닉네임을 입력해주세요.');

    localStorage.setItem('rememberMe', rememberMe);
    if (authMode === 'login') {
      await onEmailSignIn(email, password, rememberMe);
    } else {
      await onEmailSignUp(email, password, nickname.trim());
    }
  };

  const switchMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
    setLocalError('');
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden z-0">
      {/* Ambient Blobs */}
      <div className="ambient-blob bg-sky-300 w-96 h-96 top-[-10%] left-[-10%]"></div>
      <div className="ambient-blob bg-pink-200 w-80 h-80 bottom-[-10%] right-[-10%] [animation-delay:2s]"></div>
      <div className="ambient-blob bg-violet-200 w-72 h-72 top-[30%] left-[60%] [animation-delay:4s]"></div>
      <div className="max-w-md w-full jelly-card shadow-2xl p-10">
        {/* Logo */}
        <div className="w-[120px] h-[120px] mx-auto flex items-center justify-center mb-6">
          <img src="/favicon.png" alt="Blue Review" className="w-full h-full object-contain filter drop-shadow-lg drop-shadow-sky-300 transition-transform hover:scale-105" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 text-center leading-tight mb-2">
          Blue<br /><span className="text-sky-500 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">Review</span>
        </h1>
        <p className="text-center text-slate-400 text-sm mb-8">귀하의 파워블로거 도약을 응원합니다.</p>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSocialLogin('google')}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-sm bg-white border-2 border-slate-200 text-slate-700 transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs font-bold text-slate-300">또는</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* Email Login/Signup Tabs */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => { setAuthMode('login'); setLocalError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            로그인
          </button>
          <button
            onClick={() => { setAuthMode('signup'); setLocalError(''); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            회원가입
          </button>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <input
              type="text"
              className="w-full px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md shadow-inner text-lg font-black border border-white focus:bg-white ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-slate-700 transition-all placeholder:font-medium placeholder:text-slate-400"
              placeholder="닉네임 (이름도 괜찮아요)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="nickname"
            />
          )}

          {/* 이메일 + 도메인 자동완성 */}
          <div className="relative">
            <input
              ref={emailRef}
              type="email"
              className="w-full px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md shadow-inner text-lg font-black border border-white focus:bg-white ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-slate-700 transition-all placeholder:font-medium placeholder:text-slate-400"
              placeholder="이메일"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => setTimeout(() => setDomainSuggestions([]), 150)}
              autoComplete="email"
            />
            {domainSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-10">
                {domainSuggestions.map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onMouseDown={() => selectDomain(d)}
                      className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 hover:bg-sky-50 transition-colors"
                    >
                      {email.slice(0, email.indexOf('@') + 1)}<span className="text-sky-500">{d}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="password"
            className="w-full px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md shadow-inner text-lg font-black border border-white focus:bg-white ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-slate-700 transition-all placeholder:font-medium placeholder:text-slate-400"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
          />

          {authMode === 'login' && (
            <label className="flex items-center gap-2.5 px-2 cursor-pointer select-none">
              <div
                onClick={() => setRememberMe(v => !v)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'}`}
              >
                {rememberMe && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm font-bold text-slate-500">자동 로그인</span>
            </label>
          )}

          {error && (
            <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-2xl">{error}</p>
          )}

          <button className="w-full jelly-button py-5 rounded-2xl font-black text-lg shadow-xl shadow-sky-200/50">
            {authMode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-slate-300 text-xs mt-6">
          {authMode === 'login' ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
          <button onClick={switchMode} className="text-sky-500 font-bold underline">
            {authMode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>

        {onGuestLogin && (
          <button
            onClick={onGuestLogin}
            className="w-full mt-4 py-4 rounded-2xl text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:text-slate-500 transition-all"
          >
            게스트로 둘러보기
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
