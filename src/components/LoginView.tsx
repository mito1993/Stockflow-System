import React, { useState } from 'react';
import { MUser } from '../types';

interface LoginViewProps {
  users: MUser[];
  onLoginSuccess: (user: MUser) => void;
  showToast: (message: string, type?: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess, showToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    // ユーザー検証
    const foundUser = users.find(u => u.user_id.toLowerCase() === trimmedEmail);

    if (!foundUser) {
      showToast('該当するユーザーアカウントが見つかりません', 'error');
      return;
    }

    if (foundUser.password !== password) {
      showToast('パスワードが正しくありません', 'error');
      return;
    }

    showToast(`「${foundUser.user_name}」としてログインしました`, 'success');
    onLoginSuccess(foundUser);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('メールアドレスを入力してください', 'error');
      return;
    }

    showToast(`「${resetEmail}」宛にパスワード再設定リンクを送信しました（模擬送信）`, 'info');
    setShowForgotPasswordModal(false);
    setResetEmail('');
  };

  // デモ用クイックログイン選択
  const handleQuickDemoLogin = (targetUserId: string) => {
    // 本番環境（Xサーバー等にビルドした状態）では動作させない安全対策
    if (!import.meta.env.DEV) return;

    const demoUser = users.find(u => u.user_id === targetUserId);
    if (demoUser) {
      setEmail(demoUser.user_id);
      setPassword(demoUser.password);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-neutral-800 space-y-6">
        {/* ヘッダーロゴ */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-neutral-950 rounded-xl border border-neutral-800 text-white flex items-center justify-center mx-auto text-xl shadow-md">
            <i className="fa-solid fa-boxes-stacked" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">StockFlow 在庫管理</h1>
          <p className="text-xs text-neutral-500">アカウント情報を入力してログインしてください</p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">メールアドレス</label>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-3 top-3 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-lg outline-none font-medium text-neutral-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-neutral-700">パスワード</label>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-[11px] text-neutral-600 hover:text-black font-semibold underline"
              >
                パスワードをお忘れの方
              </button>
            </div>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3 top-3 text-neutral-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-lg outline-none font-medium text-neutral-900 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-neutral-950 hover:bg-black text-white font-bold rounded-lg shadow transition-all text-xs flex items-center justify-center gap-2"
          >
            <span>ログイン</span>
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>
        </form>

        {/* 開発・デモ用クイックログインアシスト (開発サーバーでのみ表示) */}
        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-neutral-200">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              テスト用クイック入力プリセット (開発環境限定)
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('dev@example.com')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate"
              >
                🔑 開発者 (全権)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('k.tanaka@kidzfrmnowhere.com')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate"
              >
                🏢 田中 喜芳 (本部)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Oji@kidzfrmnowhere.com')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate"
              >
                🏪 王子 龍義 (店舗責任者)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('staff@example.com')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate"
              >
                👤 佐藤 次郎 (スタッフ)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* パスワード再設定モーダル */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <i className="fa-solid fa-key text-neutral-700" />
              <span>パスワードの再設定</span>
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              ご登録のメールアドレスを入力してください。パスワード再設定用のURLをお送りします。
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md font-medium text-xs"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-950 hover:bg-black text-white rounded-md font-bold text-xs shadow"
                >
                  送信する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};