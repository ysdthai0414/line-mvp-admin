-- =====================================================================
-- Users テーブルに display_name カラムを追加
--
-- 目的：LINE のユーザー表示名を保存して、管理画面で「LINEユーザー XXXX」placeholder
-- ではなく実名を表示できるようにする。
--
-- データ取得タイミング：Bot 側 handleFollow で client.getProfile(userId) を呼んで
-- 取得した displayName をここに格納する。既存ユーザーは NULL のまま（次回友だち追加し直し
-- や、後日のバックフィルスクリプトで埋める想定）。
-- =====================================================================

ALTER TABLE Users
  ADD COLUMN display_name VARCHAR(64) NULL AFTER state;

-- 確認
SELECT line_user_id, state, display_name, created_at FROM Users LIMIT 5;
