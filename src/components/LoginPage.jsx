import React, { useState, useRef, useEffect } from 'react';

const EMAIL_DOMAINS = ['gmail.com', 'naver.com', 'kakao.com', 'daum.net', 'hanmail.net', 'yahoo.com', 'outlook.com'];

const translateError = (msg) => {
  if (!msg) return '';
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.';
  if (msg.includes('User already registered')) return '이미 가입된 이메일입니다. 로그인해주세요.';
  if (msg.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 합니다.';
  if (msg.includes('rate limit')) return '잠시 후 다시 시도해주세요.';
  if (msg.includes('network')) return '네트워크 오류가 발생했습니다.';
  return msg;
};

const LoginPage = ({ onEmailSignIn, onEmailSignUp, onSocialLogin, onGuestLogin, onForgotPassword, onBiometricLogin, authError }) => {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') !== 'false');
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [domainSuggestions, setDomainSuggestions] = useState([]);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const emailRef = useRef(null);

  const error = translateError(authError) || localError;

  useEffect(() => {
    // Face ID 버튼: biometric 등록돼 있을 때만 표시
    if (localStorage.getItem('biometric_cred_id') && window.PublicKeyCredential) {
      setBiometricAvailable(true);
    }
  }, []);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    const atIdx = val.indexOf('@');
    if (atIdx !== -1) {
      const typed = val.slice(atIdx + 1).toLowerCase();
      setDomainSuggestions(EMAIL_DOMAINS.filter(d => d.startsWith(typed) && d !== typed));
    } else {
      setDomainSuggestions([]);
    }
  };

  const selectDomain = (domain) => {
    const base = email.slice(0, email.indexOf('@') + 1) || email + '@';
    setEmail(base.includes('@') ? email.slice(0, email.indexOf('@') + 1) + domain : email + '@' + domain);
    setDomainSuggestions([]);
    emailRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalSuccess('');
    if (!email.trim()) return setLocalError('이메일을 입력해주세요.');
    if (password.length < 6) return setLocalError('비밀번호는 6자 이상이어야 합니다.');
    if (authMode === 'signup' && !nickname.trim()) return setLocalError('닉네임을 입력해주세요.');

    localStorage.setItem('rememberMe', rememberMe);
    if (authMode === 'login') {
      await onEmailSignIn(email, password, rememberMe);
    } else {
      const result = await onEmailSignUp(email, password, nickname.trim());
      if (!result?.error) {
        setLocalSuccess('가입 완료! 이메일 인증 후 로그인해주세요. (받은 편지함 확인)');
      }
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return setLocalError('이메일을 입력해주세요.');
    setForgotLoading(true);
    const result = await onForgotPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (result?.error) {
      setLocalError(translateError(result.error.message));
    } else {
      setLocalSuccess('비밀번호 재설정 링크를 이메일로 보냈습니다. 받은 편지함을 확인해주세요.');
      setShowForgot(false);
    }
  };

  const handleBiometric = async () => {
    setBiometricLoading(true);
    setLocalError('');
    const result = await onBiometricLogin();
    setBiometricLoading(false);
    if (result?.error) setLocalError(result.error);
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden z-0">
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

        {/* 비밀번호 찾기 모드 */}
        {showForgot ? (
          <div className="space-y-4">
            <button onClick={() => { setShowForgot(false); setLocalError(''); setLocalSuccess(''); }} className="flex items-center gap-1 text-xs font-bold text-slate-400 mb-2">
              ← 로그인으로 돌아가기
            </button>
            <div className="text-center mb-4">
              <p className="font-black text-slate-700">비밀번호 찾기</p>
              <p className="text-xs text-slate-400 mt-1">가입한 이메일로 재설정 링크를 보내드려요</p>
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <input
                type="email"
                className="w-full px-6 py-5 rounded-3xl bg-white/60 backdrop-blur-md shadow-inner text-lg font-black border border-white focus:bg-white ring-1 ring-sky-100 focus:ring-2 focus:ring-sky-300 outline-none text-slate-700 transition-all placeholder:font-medium placeholder:text-slate-400"
                placeholder="가입한 이메일"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoComplete="email"
              />
              {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-2xl">{error}</p>}
              {localSuccess && <p className="text-emerald-600 text-xs font-bold text-center bg-emerald-50 py-3 rounded-2xl">{localSuccess}</p>}
              <button disabled={forgotLoading} className="w-full jelly-button py-5 rounded-2xl font-black text-lg shadow-xl shadow-sky-200/50 disabled:opacity-60">
                {forgotLoading ? '전송 중...' : '재설정 링크 보내기'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Google + Face ID */}
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

              {biometricAvailable && (
                <button
                  onClick={handleBiometric}
                  disabled={biometricLoading}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-blue-500 text-white transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-sky-200"
                >
                  {biometricLoading ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>
                    </svg>
                  )}
                  {biometricLoading ? '인증 중...' : '얼굴 / 지문으로 로그인'}
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-xs font-bold text-slate-300">또는</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
              <button
                onClick={() => { setAuthMode('login'); setLocalError(''); setLocalSuccess(''); }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >로그인</button>
              <button
                onClick={() => { setAuthMode('signup'); setLocalError(''); setLocalSuccess(''); }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >회원가입</button>
            </div>

            {/* Form */}
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
                        <button type="button" onMouseDown={() => selectDomain(d)} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-600 hover:bg-sky-50 transition-colors">
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
                <div className="flex items-center justify-between px-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                  <button type="button" onClick={() => { setShowForgot(true); setLocalError(''); setLocalSuccess(''); }} className="text-xs font-bold text-sky-500 underline underline-offset-2">
                    비밀번호 찾기
                  </button>
                </div>
              )}

              {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-2xl">{error}</p>}
              {localSuccess && <p className="text-emerald-600 text-xs font-bold text-center bg-emerald-50 py-3 rounded-2xl">{localSuccess}</p>}

              <button className="w-full jelly-button py-5 rounded-2xl font-black text-lg shadow-xl shadow-sky-200/50">
                {authMode === 'login' ? '로그인' : '가입하기'}
              </button>
            </form>

            <p className="text-center text-slate-300 text-xs mt-6">
              {authMode === 'login' ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setLocalError(''); setLocalSuccess(''); }} className="text-sky-500 font-bold underline">
                {authMode === 'login' ? '회원가입' : '로그인'}
              </button>
            </p>

            {onGuestLogin && (
              <button onClick={onGuestLogin} className="w-full mt-4 py-4 rounded-2xl text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:text-slate-500 transition-all">
                게스트로 둘러보기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
