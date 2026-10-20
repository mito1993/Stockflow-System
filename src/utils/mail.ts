// =================================================================
// メール送信処理モジュール
// 1. Gmail API (OAuthアクセストークン経由 / 管理者招待メール用)
// 2. Xサーバー PHP API (ログイン前 パスワードリセット用)
// =================================================================

// UTF-8 文字列をBase64URLに安全にエンコードする関数
const toBase64Url = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * 管理者のGoogle認証トークンを利用してGmail API経由でメールを送信
 */
export const sendEmailViaGmailApi = async (
  accessToken: string,
  toEmail: string,
  subject: string,
  bodyContent: string
): Promise<boolean> => {
  try {
    const rawMessage = [
      `To: ${toEmail}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(bodyContent))),
    ].join('\r\n');

    const base64EncodedMessage = toBase64Url(rawMessage);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64EncodedMessage,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Gmail API Error Details:', err);
      throw new Error(`Gmail API送信失敗: ${err?.error?.message || response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('sendEmailViaGmailApi Error:', error);
    throw error;
  }
};

/**
 * ログイン前のパスワードリセットメール送信 (Xサーバー上の mail.php 呼び出し)
 */
export const sendPasswordResetEmail = async (
  targetEmail: string,
  resetUrl: string
): Promise<boolean> => {
  const endpoint = `${import.meta.env.BASE_URL}api/mail.php`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'password_reset',
        to: targetEmail,
        reset_url: resetUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('サーバーでのメール送信に失敗しました');
    }

    const resJson = await response.json();
    return resJson.success === true;
  } catch (error) {
    console.warn('Xサーバー mail.php 呼び出し失敗。フォールバック処理を継続します:', error);
    return false;
  }
};