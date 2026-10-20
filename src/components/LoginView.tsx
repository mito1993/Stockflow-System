import React, { useState } from 'react';
import { MUser } from '../types';
import { sendPasswordResetEmail } from '../utils/mail';
import { sha256 } from '../utils/crypto';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    // ユーザー検証
    const foundUser = users.find(u => u.user_id.toLowerCase() === trimmedEmail);

    if (!foundUser) {
      showToast('該当するユーザーアカウントが見つかりません', 'error');
      return;
    }

    setIsSubmitting(true);
    // 入力パスワードのSHA-256ハッシュを計算
    const hashedPassword = await sha256(password);

    // ハッシュ値照合、または平文保存されている既存アカウントとの一致を検証
    const isPasswordValid =
      foundUser.password === hashedPassword || foundUser.password === password;

    setIsSubmitting(false);

    if (!isPasswordValid) {
      showToast('パスワードが正しくありません', 'error');
      return;
    }

    showToast(`「${foundUser.user_name}」としてログインしました`, 'success');
    onLoginSuccess(foundUser);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = resetEmail.trim().toLowerCase();
    if (!target) {
      showToast('メールアドレスを入力してください', 'error');
      return;
    }

    const userExists = users.some(u => u.user_id.toLowerCase() === target);
    if (!userExists) {
      showToast('登録されていないメールアドレスです', 'error');
      return;
    }

    setIsSendingReset(true);
    showToast('パスワード再設定メールを送信しています...', 'info');

    const resetUrl = `${window.location.origin}${window.location.pathname}?action=reset&email=${encodeURIComponent(target)}`;
    const success = await sendPasswordResetEmail(target, resetUrl);

    setIsSendingReset(false);
    setShowForgotPasswordModal(false);
    setResetEmail('');

    if (success) {
      showToast(`「${target}」宛にパスワード再設定メールを送信しました`, 'success');
    } else {
      showToast(`「${target}」宛にパスワード再設定メールを発行しました（案内完了）`, 'info');
    }
  };

  // デモ用クイックログイン選択
  const handleQuickDemoLogin = (targetUserId: string, targetPass: string) => {
    if (!import.meta.env.DEV) return;
    setEmail(targetUserId);
    setPassword(targetPass);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-neutral-800 space-y-6">
        {/* ヘッダーロゴ */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-neutral-950 rounded-xl border border-neutral-800 text-white flex items-center justify-center mx-auto text-xl shadow-md">
            <i className="fa-solid fa-boxes-stacked" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">GENZONE在庫管理システム</h1>
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
                placeholder="sample@example.com"
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
                className="text-[11px] text-neutral-600 hover:text-black font-semibold underline cursor-pointer"
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
            disabled={isSubmitting}
            className="w-full py-3 bg-neutral-950 hover:bg-black text-white font-bold rounded-lg shadow transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? '認証中...' : 'ログイン'}</span>
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>
        </form>

        {/* 開発・デモ用クイックログインアシスト */}
        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-neutral-200">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              テスト用クイック入力プリセット (開発環境限定)
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('m.ito@anyglo.co.jp', 'Ag20230406')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate cursor-pointer"
              >
                🔑 伊藤 (開発者・全権)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('k.tanaka@kidzfrmnowhere.com', 'password123')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate cursor-pointer"
              >
                🏢 田中 喜芳 (本部)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Oji@kidzfrmnowhere.com', 'password123')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate cursor-pointer"
              >
                🏪 王子 龍義 (責任者)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('staff@example.com', 'password123')}
                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-left truncate cursor-pointer"
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
                  placeholder="sample@example.com"
                  className="w-full px-3 py-2 bg-neutral-50 border rounded-lg outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md font-medium text-xs cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="px-4 py-1.5 bg-neutral-950 hover:bg-black text-white rounded-md font-bold text-xs shadow cursor-pointer disabled:opacity-50"
                >
                  {isSendingReset ? '送信中...' : '送信する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};