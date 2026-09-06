# Supabase 스키마 적용

프로젝트 ref: `jkeisufqjemsnqamiqlv`

## 방법 A: Supabase CLI (권장)
```bash
npx supabase login                       # 브라우저에서 access token 발급 (1회)
npx supabase link --project-ref jkeisufqjemsnqamiqlv
npx supabase db push                     # supabase/migrations/*.sql 적용
```
시드는 `npm run seed:gen`으로 `supabase/seed/seed.sql`을 만든 뒤 대시보드 SQL Editor에 붙여 넣거나
`npx supabase db query --file supabase/seed/seed.sql`로 적용한다.

## 방법 B: 대시보드 SQL Editor
`supabase/migrations/0001_bom_schema.sql` → `supabase/seed/seed.sql` 순서로 붙여 넣어 실행한다.

## 확인 쿼리
```sql
select count(*) from items;             -- 시드 후 60 이상
select next_item_no('CV', 1, 9);        -- 'CV-008'
select * from v_product_progress;       -- 빈 결과 (상품 없음)
```
