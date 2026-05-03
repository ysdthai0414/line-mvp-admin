-- =====================================================================
-- ミニマムデプロイ用：Staff の email を個人 Microsoft アカウントに更新
--
-- 背景：office-gensen.jp ドメインの Entra ID テナントがまだ無いため、
-- ミニマム稼働では個人 MS アカウント (ysdyskmeiji1996@gmail.com) でログインする。
-- Easy Auth は「Microsoft アカウントでログイン済み」を保証し、
-- Next.js 側の auth.ts は X-MS-CLIENT-PRINCIPAL-NAME ヘッダの email を Staff と突合する。
--
-- 将来 office-gensen.jp の Entra ID テナントが整ったら、再度
-- email = 'k.yoshida@office-gensen.jp' に戻すマイグレーションを発行する。
-- =====================================================================

UPDATE Staff
SET email = 'ysdyskmeiji1996@gmail.com'
WHERE id = 's_0001';

-- 確認用 SELECT
SELECT id, email, name, role, status FROM Staff WHERE id = 's_0001';
