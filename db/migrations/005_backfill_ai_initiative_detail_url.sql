-- =====================================================================
-- AI 生成 Initiative の detail_url が NULL のものを、その企業の宣言 PDF URL で埋める
--
-- 背景：
--   import-initiatives.js は Phase 7-2 fix 前は detail_url を保存していなかった。
--   そのため LINE 配信カードの「詳細を見る」ボタンが出ず、管理画面でも空表示。
--   既存の 11 件を ApprovedCompanies.declaration_pdf_url で backfill する。
-- =====================================================================

UPDATE Initiatives i
INNER JOIN ApprovedCompanies ac ON ac.id = i.approved_company_id
SET i.detail_url = ac.declaration_pdf_url
WHERE i.source = 'ai_generated'
  AND (i.detail_url IS NULL OR i.detail_url = '')
  AND ac.declaration_pdf_url IS NOT NULL
  AND ac.declaration_pdf_url <> '';

-- 確認
SELECT id, approved_company_id, title, status, source, detail_url
FROM Initiatives
WHERE source = 'ai_generated'
ORDER BY id DESC
LIMIT 20;
