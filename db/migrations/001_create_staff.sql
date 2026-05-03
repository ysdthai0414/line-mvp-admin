-- =====================================================================
-- Staff テーブル：事務局スタッフのアカウント管理
-- 作成日：2026-05-03
-- 適用先：Bot と共有の Azure MySQL Flexible Server `linemvp` データベース
--
-- 注意：このマイグレーションは Bot 側 (line-mvp-api) の DB と同一スキーマに
-- 適用する必要がある。Bot 側 db/ にも同内容をコピーすることが望ましい。
-- =====================================================================

CREATE TABLE IF NOT EXISTS Staff (
  id            VARCHAR(16)  NOT NULL,                          -- "s_0001" 形式
  email         VARCHAR(255) NOT NULL,                          -- Entra ID のメールアドレスと突合
  name          VARCHAR(64)  NOT NULL,
  name_kana     VARCHAR(128) NULL,
  role          ENUM('admin','manager','member','viewer') NOT NULL DEFAULT 'member',
  department    VARCHAR(64)  NULL,
  avatar_url    VARCHAR(512) NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login_at DATETIME(3)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_email (email),
  KEY idx_staff_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初期スタッフ（admin）：吉田航平
-- email は実際の Entra ID アカウントと一致させること
INSERT INTO Staff (id, email, name, name_kana, role, department, status)
VALUES
  ('s_0001', 'k.yoshida@office-gensen.jp', '吉田 航平', 'ヨシダ コウヘイ', 'admin', '事務局統括', 'active')
ON DUPLICATE KEY UPDATE
  name       = VALUES(name),
  name_kana  = VALUES(name_kana),
  role       = VALUES(role),
  department = VALUES(department),
  status     = VALUES(status);
