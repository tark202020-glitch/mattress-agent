# Supabase 스키마 적용

프로젝트 ref: `jkeisufqjemsnqamiqlv`

## 방법 A: Supabase CLI (권장)
```bash
npx supabase login                                   # 브라우저 인증 (1회)
npx supabase init                                    # supabase/config.toml 생성 (1회, 기존 migrations/ 유지)
npx supabase link --project-ref jkeisufqjemsnqamiqlv
npx supabase db push                                 # supabase/migrations/*.sql 적용
```
시드(`supabase/seed/seed.sql`)는 CLI에 `db query` 서브커맨드가 없으므로 대시보드 SQL Editor에서 적용한다:
`npm run seed:gen`으로 `supabase/seed/seed.sql`을 만든 뒤 내용을 대시보드 SQL Editor에 붙여 넣어 실행한다.

`supabase/config.toml`과 `supabase/.temp/`는 CLI가 생성한다. `config.toml`은 커밋하고, `supabase/.temp/`는 `.gitignore`에 추가한다.

## 방법 B: 대시보드 SQL Editor
`supabase/migrations/20260907000001_bom_schema.sql` → `supabase/seed/seed.sql` 순서로 붙여 넣어 실행한다.

## 확인 쿼리
```sql
select count(*) from items;             -- 시드 후 55 이상
select next_item_no('CV', 1, 9);        -- 'CV-008'
select * from v_product_progress;       -- 빈 결과 (상품 없음)
```
