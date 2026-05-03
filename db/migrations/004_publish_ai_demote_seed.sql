-- =====================================================================
-- AI 生成 Initiative を published 昇格、seed データを draft 降格
--
-- 背景：
--   - import-initiatives.js が作った AI 生成事例は draft 固定（事務局レビュー前ガード）
--   - seed_initiatives.sql で入った placeholder データは published のまま
--   - recommend.js は published のみ配信
--   → 結果、ユーザーには「壊れた URL の seed」だけが配信されてしまう
--
-- ミニマム対応：
--   - AI 生成は信頼してそのまま published に上げる（事務局レビューは将来）
--   - seed は draft に落として配信対象から外す（残しておけば再 published 可能）
-- =====================================================================

UPDATE Initiatives SET status='published' WHERE source='ai_generated';

UPDATE Initiatives SET status='draft' WHERE source='seed';

-- 確認用 SELECT
SELECT source, status, COUNT(*) AS cnt
FROM Initiatives
GROUP BY source, status
ORDER BY source, status;
