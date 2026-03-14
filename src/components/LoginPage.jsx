import React, { useState } from 'react';
import { Star } from 'lucide-react';

const LoginPage = ({ onEmailSignIn, onEmailSignUp, onSocialLogin, onGuestLogin, authError }) => {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const error = authError || localError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim()) return setLocalError('이메일을 입력해주세요.');
    if (password.length < 6) return setLocalError('비밀번호는 6자 이상이어야 합니다.');

    if (authMode === 'login') {
      await onEmailSignIn(email, password);
    } else {
      await onEmailSignUp(email, password);
    }
  };

  const switchMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
    setLocalError('');
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full jelly-card shadow-2xl p-10">
        {/* Logo */}
        <div className="w-[100px] h-[100px] mx-auto flex items-center justify-center mb-6">
          <img src="/favicon.png" alt="Blue Review" className="w-full h-full object-contain filter drop-shadow-lg drop-shadow-sky-300 transition-transform hover:scale-105" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 text-center leading-tight mb-2">
          Blue<br/><span className="text-sky-500 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">Review</span>
        </h1>
        <p className="text-center text-slate-400 text-sm mb-8">귀하의 파워블로거 도약을 응원합니다.</p>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSocialLogin('kakao')}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-sm transition-all hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: '#FEE500', color: '#191919' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.029 2 1 5.216 1 9.166c0 2.58 1.712 4.844 4.283 6.12l-1.09 4.008a.37.37 0 00.56.395l4.67-3.09c.19.012.382.023.577.023 4.971 0 9-3.216 9-7.166S14.971 2 10 2z" fill="#191919"/>
            </svg>
            카카오톡으로 시작하기
          </button>

          <button
            onClick={() => onSocialLogin('google')}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-sm bg-white border-2 border-slate-200 text-slate-700 transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
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
          <input
            type="email"
            className="w-full px-6 py-5 rounded-2xl bg-sky-50 border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full px-6 py-5 rounded-2xl bg-sky-50 border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-2xl">{error}</p>
          )}

          <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg active:scale-95 transition-all">
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
