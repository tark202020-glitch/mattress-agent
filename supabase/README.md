# Supabase 스키마 적용

프로젝트 ref: `jkeisufqjemsnqamiqlv`

## 방법 A: Supabase CLI (권장)
```bash
npx supabase login                                   # 브라우저 인증 (1회)
npx supabase init                                    # supabase/config.toml 생성 (1회, 기존 migrations/ 유지)
npx supabase link --project-ref jkeisufqjemsnqamiqlv
npx supabase db push                                 # supabase/migrations/*.sql 적용
npx supabase db push --include-seed                  # 스키마 + 시드(config.toml의 sql_paths)를 한 번에
```
시드는 `npm run seed:gen`으로 `supabase/seed/seed.sql`을 먼저 만들어야 한다. 적용 방법은 둘 중 하나다.
- `npx supabase db push --include-seed` (`config.toml`의 `[db.seed] sql_paths = ["./seed/seed.sql"]`를 읽는다)
- 대시보드 SQL Editor에 `supabase/seed/seed.sql` 내용을 붙여 넣어 실행

`supabase/config.toml`과 `supabase/.temp/`는 CLI가 생성한다. `config.toml`은 커밋하고, `supabase/.temp/`는 `.gitignore`에 추가한다.

## 방법 B: 대시보드 SQL Editor
`supabase/migrations/20260907000001_bom_schema.sql` → `supabase/seed/seed.sql` 순서로 붙여 넣어 실행한다.

## 확인 쿼리
```sql
select count(*) from items;             -- 시드 후 55 이상
select next_item_no('CV', 1, 9);        -- 'CV-008'
select * from v_product_progress;       -- 빈 결과 (상품 없음)
```
