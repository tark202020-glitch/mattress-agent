-- ============================================================
-- BOM 통합 1차 스키마 (기획안 4장)
-- ============================================================

-- 코드표 (ENUM 대신 테이블. 관리자가 UI에서 값 추가)
create table if not exists code_values (
    code_type   text not null,
    value       text not null,
    sort_order  int  not null default 0,
    active      boolean not null default true,
    primary key (code_type, value)
);

create table if not exists employees (
    employee_id  text primary key,          -- E-001
    name         text not null,
    department   text,
    title        text,
    email        text,
    phone        text,
    role         text not null default 'viewer',  -- admin/pm/purchasing/engineer/quality/viewer
    auth_user_id uuid unique,               -- auth.users.id (로그인 계정 연결)
    note         text
);

create table if not exists vendors (
    vendor_code  text primary key,          -- V-001
    name         text not null,
    vendor_type  text,
    country      text,
    contact_name text,
    phone        text,
    email        text,
    main_items   text,
    note         text
);

create table if not exists items (
    item_no            text primary key
                       check (item_no ~ '^(CV|FM|ST|CT|SN|PK|SW)-[0-9]{3}$'),
    name               text not null,
    category           text not null,
    subcategory        text,
    item_type          text not null,
    spec               text,
    unit               text not null default 'EA',
    revision           text not null default 'A',
    spec_url           text,
    memo               text,
    wizard_option_key  text unique,         -- 위자드 옵션 ID (TOP_70_2L, GUARD_80_미디엄 …)
    attributes         jsonb,
    created_at         date not null default current_date,
    -- 접두어와 대분류 일치
    constraint items_prefix_category check (
        category = case left(item_no, 2)
            when 'CV' then '커버' when 'FM' then '폼' when 'ST' then '스트링'
            when 'CT' then '컨트롤러' when 'SN' then '센서' when 'PK' then '포장'
            when 'SW' then 'APP' end
    )
);

create table if not exists products (
    product_code       text primary key,    -- MAT-001-LK
    model_code         text not null,       -- MAT-001
    name               text not null,
    family             text,
    status             text not null default '기획',
    launch_target_date date,
    pm_id              text references employees(employee_id),
    cover_split_count  int  not null default 2,
    size_preset_id     text not null,
    width_mm           int  not null,
    depth_mm           int  not null,
    is_dual            boolean not null default false,
    delivery_option    text,
    design_snapshot    jsonb,
    note               text,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    constraint products_code_format check (product_code = model_code || '-' || size_preset_id)
);
create index if not exists products_model_idx on products(model_code);

create table if not exists bom_lines (
    product_code   text not null references products(product_code) on delete cascade,
    item_no        text not null references items(item_no),
    level          int  not null check (level in (1, 2)),
    parent_item_no text references items(item_no),
    quantity       numeric not null check (quantity > 0),
    required       text not null default '필수',
    alt_item_no    text references items(item_no),
    spec_text      text,
    dims           jsonb,                   -- [{w,d,h,qty,label?}] 단가 계산용
    note           text,
    source         text not null default 'manual',  -- wizard | manual
    primary key (product_code, item_no),
    constraint bom_lines_parent_rule check ((level = 1 and parent_item_no is null) or (level = 2 and parent_item_no is not null and parent_item_no <> item_no))
);
create index if not exists bom_lines_item_no_idx on bom_lines(item_no);
create index if not exists bom_lines_parent_item_no_idx on bom_lines(parent_item_no);

-- 상위 품번은 같은 상품 BOM 안에 있어야 한다
create or replace function bom_lines_check_parent() returns trigger language plpgsql
    set search_path = public, pg_temp as $$
begin
    if new.level = 2 and not exists (
        select 1 from bom_lines where product_code = new.product_code and item_no = new.parent_item_no
    ) then
        raise exception '상위 품번 %가 상품 %의 BOM에 없습니다', new.parent_item_no, new.product_code;
    end if;
    return new;
end $$;
drop trigger if exists trg_bom_lines_parent on bom_lines;
create trigger trg_bom_lines_parent before insert or update on bom_lines
    for each row execute function bom_lines_check_parent();

create table if not exists avl (
    item_no         text not null references items(item_no),
    vendor_code     text not null references vendors(vendor_code),
    owner_id        text references employees(employee_id),
    approval_status text not null default '후보',
    lead_time_days  int,
    moq             int,
    unit_price      numeric not null default 0,
    currency        text not null default 'KRW',
    approved_at     date,
    price_type      text not null default 'FIXED' check (price_type in ('FIXED', 'VOLUME', 'WIDTH_STEP')),
    price_constant  numeric not null default 0,
    price_base      numeric not null default 0,
    price_steps     jsonb,
    note            text,
    primary key (item_no, vendor_code)
);
create index if not exists avl_vendor_code_idx on avl(vendor_code);

create table if not exists npi_status (
    product_code   text not null references products(product_code) on delete cascade,
    item_no        text not null references items(item_no),
    owner_id       text references employees(employee_id),
    stage          text not null default '기획',
    progress       numeric(3,2) not null default 0 check (progress between 0 and 1),
    start_date     date,
    target_date    date,
    issue_status   text not null default '없음',
    issue_detail   text,
    next_milestone text,
    weight         numeric not null default 1,
    updated_at     timestamptz not null default now(),
    note           text,
    primary key (product_code, item_no)
);
create index if not exists npi_status_item_no_idx on npi_status(item_no);

create table if not exists npi_status_history (
    id           bigserial primary key,
    product_code text not null,
    item_no      text not null,
    stage        text,
    progress     numeric(3,2),
    issue_status text,
    recorded_at  timestamptz not null default now()
);

create table if not exists ecn (
    ecn_no       text primary key,           -- ECN-2026-001
    ecn_date     date not null default current_date,
    item_no      text not null references items(item_no),
    change_type  text,
    rev_from     text,
    rev_to       text,
    before_text  text,
    after_text   text,
    reason       text,
    requester_id text references employees(employee_id),
    approver_id  text references employees(employee_id),
    status       text not null default '요청',
    note         text
);
create index if not exists ecn_item_no_idx on ecn(item_no);

create table if not exists ecn_products (
    ecn_no       text not null references ecn(ecn_no) on delete cascade,
    product_code text not null references products(product_code) on delete cascade,
    primary key (ecn_no, product_code)
);

create table if not exists documents (
    doc_id        bigserial primary key,
    doc_type      text not null check (doc_type in ('quote', 'dev_request')),
    model_code    text not null,
    product_codes text[] not null,
    file_path     text not null,             -- storage: documents/<path>
    total_price   numeric,
    created_by    uuid,
    created_at    timestamptz not null default now()
);

-- 상품별완성률 (사양서 3.4)
create or replace view v_product_progress with (security_invoker = true) as
select
    p.product_code, p.model_code, p.name, p.status,
    count(n.item_no)                                              as item_count,
    case when count(n.item_no) = 0 then null
         else sum(n.progress * n.weight) / nullif(sum(n.weight), 0) end as progress_total,
    avg(n.progress) filter (where i.category = '커버')            as progress_cover,
    avg(n.progress) filter (where i.category = '폼')              as progress_foam,
    avg(n.progress) filter (where i.category = '스트링')          as progress_string,
    avg(n.progress) filter (where i.category = '컨트롤러')        as progress_controller,
    avg(n.progress) filter (where i.category = '센서')            as progress_sensor,
    avg(n.progress) filter (where i.category = '포장')            as progress_packaging,
    avg(n.progress) filter (where i.category = 'APP')             as progress_app,
    count(*) filter (where n.stage = '기획')                      as cnt_plan,
    count(*) filter (where n.stage = 'EVT')                       as cnt_evt,
    count(*) filter (where n.stage = 'DVT')                       as cnt_dvt,
    count(*) filter (where n.stage = 'PVT')                       as cnt_pvt,
    count(*) filter (where n.stage = 'MP(양산)')                  as cnt_mp,
    count(*) filter (where n.issue_status in ('진행중', '지연'))  as cnt_issue
from products p
left join npi_status n on n.product_code = p.product_code
left join items i on i.item_no = n.item_no
group by p.product_code, p.model_code, p.name, p.status;

-- 접두어별 자동 채번: 범위 안 최대 번호 + 1
create or replace function next_item_no(p_prefix text, p_start int default 1, p_end int default 999)
returns text language sql stable
    set search_path = public, pg_temp as $$
    select p_prefix || '-' || lpad((coalesce(max(substring(item_no from 4)::int), p_start - 1) + 1)::text, 3, '0')
    from items
    where item_no like p_prefix || '-%'
      and substring(item_no from 4)::int between p_start and p_end;
$$;

-- 상품 + BOM 원자적 생성. 입력: [{product_code, model_code, name, ..., bom_lines:[{item_no, level, ...}]}]
create or replace function bom_create_products(p_products jsonb)
returns text[] language plpgsql
    set search_path = public, pg_temp as $$
declare
    rec   jsonb;
    line  jsonb;
    codes text[] := '{}';
begin
    for rec in select * from jsonb_array_elements(p_products) loop
        insert into products (product_code, model_code, name, family, status, launch_target_date, pm_id, cover_split_count,
                              size_preset_id, width_mm, depth_mm, is_dual, delivery_option, design_snapshot, note)
        values (rec->>'product_code', rec->>'model_code', rec->>'name', rec->>'family',
                coalesce(rec->>'status', '기획'), (rec->>'launch_target_date')::date, rec->>'pm_id', coalesce((rec->>'cover_split_count')::int, 2),
                rec->>'size_preset_id', (rec->>'width_mm')::int, (rec->>'depth_mm')::int,
                coalesce((rec->>'is_dual')::boolean, false), rec->>'delivery_option', nullif(rec->'design_snapshot', 'null'::jsonb), rec->>'note');
        for line in select value from jsonb_array_elements(coalesce(rec->'bom_lines', '[]'::jsonb)) order by (value->>'level')::int loop
            insert into bom_lines (product_code, item_no, level, parent_item_no, quantity, required,
                                   alt_item_no, spec_text, dims, note, source)
            values (rec->>'product_code', line->>'item_no', (line->>'level')::int, line->>'parent_item_no',
                    (line->>'quantity')::numeric, coalesce(line->>'required', '필수'), line->>'alt_item_no',
                    line->>'spec_text', nullif(line->'dims', 'null'::jsonb), line->>'note', coalesce(line->>'source', 'wizard'));
        end loop;
        codes := array_append(codes, rec->>'product_code');
    end loop;
    return codes;
end $$;

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger language plpgsql
    set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products for each row execute function set_updated_at();
drop trigger if exists trg_npi_status_updated on npi_status;
create trigger trg_npi_status_updated before update on npi_status for each row execute function set_updated_at();

-- RLS: 1차는 로그인 사용자 전원 읽기/쓰기 (역할 강제는 3차)
do $$
declare t text;
begin
    for t in select unnest(array['code_values','employees','vendors','items','products','bom_lines','avl',
                                 'npi_status','npi_status_history','ecn','ecn_products','documents']) loop
        execute format('alter table %I enable row level security', t);
        execute format('drop policy if exists %I on %I', t || '_authenticated_all', t);
        execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_authenticated_all', t);
    end loop;
end $$;

-- 문서 저장 버킷 (비공개, signed URL로 다운로드)
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;
drop policy if exists documents_authenticated_all on storage.objects;
create policy documents_authenticated_all on storage.objects for all to authenticated
    using (bucket_id = 'documents') with check (bucket_id = 'documents');

-- 비로그인(anon)은 채번·상품생성 함수를 호출할 수 없다
revoke execute on function next_item_no(text,int,int), bom_create_products(jsonb) from anon;
revoke execute on function next_item_no(text,int,int), bom_create_products(jsonb) from public;
