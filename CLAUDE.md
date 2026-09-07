# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**ANSSil String Mattress Agent** — 사내용 매트리스 설계 도구. 사양(사이즈/폼/스트링/커버/컨트롤러/센서/포장/배송)을 위자드로 선택하면 단가를 실시간 계산해 견적서(xlsx)/개발요청서(PDF)를 만들고, Gemini 이미지 모델로 커버·컨셉 이미지를 생성하며, 3D(react-three-fiber)로 분해도를 보여준다.

- 원래 Antigravity(Google)로 개발되던 프로젝트. 이력은 `Changelog.md`(Alpha V1.0xx 단위)와 `doc/DailyReport*.md`에 있다.
- 배포: https://mattress-agent-anssil.vercel.app/ (Vercel 프로젝트 `mattress-agent-anssil`, GitHub `tark202020-glitch/mattress-agent` main 브랜치 push 시 자동 배포)
- 이 저장소(`mattress-agent/`)가 git 루트다. 상위 폴더 `Mattress_ADF/`에는 기획안(`Mattress-Agent_기획안.md`), 사용 매뉴얼(`doc/Mattress_Agent_Manual.md`), PDF 처리용 Python venv(`.venv`, pymupdf), Obsidian 업로드 스크립트만 있고 코드는 없다.

## 명령어

```bash
npm run dev       # http://localhost:3000
npm run build     # Vercel과 동일한 프로덕션 빌드 (TS 에러도 여기서 잡힘)
npm run lint      # eslint (eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit  # 타입 체크만
npm test          # Vitest (app/lib/bom/__tests__/) — BOM 순수 로직 단위 테스트
npm run seed:gen  # supabase/seed/seed.sql 재생성 (scripts/genSeed.ts)
```

- BOM 모듈의 순수 로직(`app/lib/bom/*`)은 Vitest로 검증한다. 그 외 화면은 여전히 `npm run build` + 브라우저 확인.
- 루트의 `check_models.js`(Gemini 이미지 모델 목록 조회), `test_image_api.js`(dev 서버에 `/api/generate-image` POST), `analyze_excel.js`(견적 템플릿 xlsx 덤프)는 `node <파일>`로 실행하는 수동 디버그 스크립트.
- `deploy.js`는 커밋 메시지가 하드코딩된 레거시 스크립트다. 배포는 그냥 `git push origin main`으로 한다.

### 환경 변수 (`.env.local`, git 제외)

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth (로그인 전용, DB 테이블 사용 안 함) |
| `GEMINI_API_KEY` (별칭 `NANO_BANANA_API_KEY`) | AI Studio 키. 이미지 생성/인페인팅/텍스처/면 좌표 인식 |
| `STABILITY_API_KEY` | `/api/image-to-3d` (Stable Fast 3D) |
| `GOOGLE_PROJECT_ID`, `GOOGLE_LOCATION` (선택) | `/api/analyze-image`, `/api/analyze-image-prompt`는 Vertex AI + `GoogleAuth` ADC를 쓴다. 로컬 gcloud 자격증명이 없으면 이 두 라우트는 실패한다 |

## 아키텍처

### 라우트와 인증

| 경로 | 역할 |
|---|---|
| `/` | 랜딩 (Tailwind) |
| `/login` | Supabase 이메일/비밀번호 로그인·가입 |
| `/hub` | 빌더/디자이너 선택 |
| `/builder` | 8단계 위자드 → 단가 → 견적서/개발요청서. 헤더에 `Alpha V1.0xx` 버전 라벨 |
| `/designer` | 4단계(구조/스트링/커버/분해도) + AI 커버·컨셉 이미지 생성 |
| `/3d-test`, `/test-image` | 개발용 실험 페이지 |

`middleware.ts`가 `/builder`, `/hub`, `/designer`, `/3d-test`를 보호하고 미로그인 시 `/login`으로 보낸다. 서버 컴포넌트용 클라이언트는 `app/lib/supabase/server.ts`, 클라이언트용은 `client.ts`.

### 상태: Zustand + localStorage (서버 DB 없음)

모든 업무 데이터는 코드 상수 + 브라우저 localStorage에 있다. Supabase는 인증에만 쓴다.

| 스토어 | 파일 | localStorage 키 |
|---|---|---|
| `useDesignStore` | `app/lib/store.ts` | `mattress_default_textures` (defaultTextures만) |
| `usePricingStore` | `app/lib/pricingStore.ts` | AVL(DB)로 이관, `pricingStore`는 동치 테스트 전용 |
| `usePresetStore` | `app/lib/presetStore.ts` | `mattress-presets` (최대 20개) |
| `useCustomOptionsStore` | `app/lib/customOptionsStore.ts` | `mattress-custom-options` |

- `useDesignStore` 하나를 **빌더와 디자이너가 공유**한다. `currentStep`은 빌더 전용(1~8, `nextStep`의 상한 8), 디자이너는 자체 `designerStep` state를 쓴다.
- 각 스토어는 `_hydrate()`/`hydrate()`/`_hydrateDefaults()`를 마운트 후 호출해야 localStorage 값이 반영된다(SSR 안전을 위해 `typeof window` 체크). 페이지는 `mounted` 플래그로 하이드레이션 전 렌더를 막는다.
- `pricingStore.loadFromStorage`는 저장된 데이터에 `DEFAULT_PRICING_DATA`의 신규 필드를 병합한다. 단가 항목을 추가/변경할 때는 이 병합 로직을 거친다는 점을 기억할 것.

### 옵션 ID가 모든 것을 잇는 조인 키

`app/lib/constants.ts`의 옵션 `id` ↔ `app/lib/pricingData.ts`의 `optionId` ↔ `useDesignStore`의 `xxxId` 필드가 문자열로 매핑된다. 옵션 하나를 추가하려면 보통 다음을 함께 고친다:

1. `constants.ts` 옵션 배열
2. `pricingData.ts` 단가 항목 (`formulaType`: `VOLUME` | `FIXED` | `WIDTH_STEP`)
3. 해당 step 컴포넌트 (`app/components/steps/`)
4. 출력물 라벨: `app/lib/quoteHandlers.ts`(견적 xlsx), `DevelopmentRequestModal.tsx`(개발요청서), `SpecSummary.tsx`

파생 규칙에 주의:
- 가드폼/하단폼 optionId는 두께에서 만든다: `GUARD_${thickness}`, `BOTTOM_${thickness}`
- 상단폼 높이는 id 문자열을 파싱한다: `TOP_70_2L`.split('_')[1] → 70
- `WIDTH_STEP`(포장 ROLL/FOLD_3)의 폭 구간별 단가와 박스 규격은 `pricingStore.calculateSummary` 안에 하드코딩되어 있다
- Dual 선택 시 스트링/컨트롤러/센서 수량 ×2, 가드폼 D방향 ×3

### 빌더 vs 디자이너 분기 (`usePathname`)

두 페이지가 `StepFoam`, `StepCore`, `StepCover`, `Mattress3D`, `MattressExplodedView`, `BrochureGenerator`, `ConceptImageGeneratorModal`을 공유한다. 컴포넌트 내부에서 `usePathname() === '/designer'`로 분기해 `DESIGNER_COVER_OPTIONS`(4종, 영문 라벨) 또는 `COVER_OPTIONS`(6종, 단가 원본)를 고른다.

**디자이너 UI 요구 때문에 `COVER_OPTIONS`를 건드리지 말 것.** 과거에 이 실수로 빌더의 단가/포장 단계가 깨졌다(DailyReport 2026-02-28). 디자이너 전용 변경은 `DESIGNER_COVER_OPTIONS`와 `isDesigner` 분기 안에서 끝낸다.

### 치수 계산은 한 곳에서

`constants.ts`의 `calcCoreDimensions(W, D, gfT, isDual, guardFoamEnabled)`가 코어/가드폼 치수를 계산하고, 2D 도면(`MattressDrawing`), 3D(`Mattress3D`, `MattressExplodedView`), 단가, 견적서가 모두 이 결과를 쓴다. 단위는 mm, 3D는 `SCALE = 0.001`로 m 변환.

### 커버 텍스처 파이프라인

1. 커버 사진은 `public/covers/`(파일명 한글). `app/lib/defaultExtractData.ts`에 커버별 top/front/side 면의 꼭짓점 좌표(% 단위)가 하드코딩되어 있다.
2. `useAutoInitTextures()`(`app/lib/autoInitTextures.ts`)가 앱 시작 시 이 좌표로 원근 크롭해 `defaultTextures[coverId]`에 저장하고 localStorage에 캐시한다. 이미 캐시가 있으면 스킵하므로 좌표를 바꿨으면 브라우저 localStorage의 `mattress_default_textures`를 지워야 반영된다.
3. `TextureExtractorModal`에서 사용자가 좌표를 다시 잡거나 `/api/generate-face-texture`(Gemini 비전, JSON 좌표 반환)로 자동 인식할 수 있다.
4. `StepCover`는 `coverId`가 바뀔 때 해당 커버의 default 텍스처를 `upperCoverTextures`/`lowerCoverTextures`에 복사하고, 3D 컴포넌트가 이를 머티리얼로 쓴다.

### AI API 라우트 (`app/api/`)

| 라우트 | 모델/서비스 | 비고 |
|---|---|---|
| `generate-image` | `gemini-2.5-flash-image` (Nano Banana, AI Studio REST) | 한글 프롬프트는 `gemini-2.5-flash`로 자동 영문 번역. Vertex Imagen 코드는 폴백용으로 남아 있음 |
| `inpaint`, `generate-texture` | 동일 모델 | |
| `generate-face-texture` | `gemini-2.0-flash-001` 비전 | 면 꼭짓점 JSON |
| `analyze-image`, `analyze-image-prompt` | Vertex AI (`GoogleAuth` ADC) | 로컬 자격증명 필요 |
| `image-to-3d` | Stability SF3D | GLB 바이너리 반환 |
| `save-image` | 로컬 fs | `public/resource/<folder>/`에 저장. **Vercel에서는 읽기 전용이라 실패**하므로 모달이 File System Access API(`showDirectoryPicker`)로 사용자 PC에 직접 저장하는 경로를 함께 갖고 있다 |
| `quote/generate` | ExcelJS | `resource/견적포맷.xlsx` 템플릿의 33행부터 B~I열에 채움 |
| `inspect`, `local-image` | 디버그/레거시 | `local-image`는 절대경로 하드코딩 |

- Gemini 이미지 생성의 `generationConfig.responseModalities`는 반드시 `["Text", "Image"]`(PascalCase). 대문자 `["IMAGE"]`는 400을 낸다(V1.088에서 수정).
- 큰 이미지는 클라이언트에서 800px로 리사이즈해 보낸다. `next.config.ts`의 `serverActions.bodySizeLimit`은 50mb, 이미지 라우트는 `maxDuration = 60`.
- AI 결과물 폴더(`resource/AI-cover`, `resource/AI-concept`, `public/resource/AI-*`)는 `.gitignore`와 `.vercelignore` 양쪽에서 제외되어 있다. 새 출력 폴더를 만들면 둘 다 추가할 것.

### BOM 모듈 (1차)

- **라우트**: `/bom/products`, `/bom/products/[code]`, `/bom/items`, `/bom/vendors`, `/bom/employees`, `/bom/avl`, `/bom/import`. 허브의 "BOM / 개발관리" 카드에서 진입한다. `middleware.ts`의 보호 경로 목록에 `/bom`도 포함되어 있다.
- **데이터 흐름**: 위자드 9단계("BOM 확인")에서 `POST /api/bom/products/from-design`을 호출해 `products`/`bom_lines` 테이블에 저장한다. 견적 금액은 AVL 승인 단가(`priceBom`)로 계산하고, 견적서는 `POST /api/bom/documents/quote`가 생성해 Storage에 저장한다.
- **핵심 파일**: `app/lib/bom/*`(순수 로직 + `__tests__/`), `app/api/bom/*`(API 라우트), `app/bom/*`(화면, 공통 UI는 `_components/ui.tsx`), `app/components/steps/StepBomConfirm.tsx`(위자드 9단계).
- **규칙**:
  - `bom_lines`→`items` PostgREST 임베드는 반드시 `items!bom_lines_item_no_fkey(...)`로 쓴다.
  - AVL 단가를 편집한 뒤에는 `invalidateAvlCache()`를 호출해 캐시를 갱신한다.
  - 시드 데이터는 `npm run seed:gen`으로 생성한다.
  - 마이그레이션은 `supabase/migrations`에 있고, 적용은 `npx supabase db push --include-seed` (Supabase 프로젝트 ref `jkeisufqjemsnqamiqlv`).
  - 테스트는 `npm test`(Vitest, `app/lib/bom/__tests__/`).

## 작업 규칙 (이 저장소 고유)

- **버전 관리**: 빌드마다 `app/builder/page.tsx` 헤더의 `Alpha V1.0xx` 라벨과 `Changelog.md` 최상단 엔트리를 함께 올린다. Changelog 형식:
  ```
  ## [Alpha V1.0xx] - YYYY-MM-DD HH:mm:ss

  ### 🔄 Build Update | 🐛 Bug Fix
  - **Summary**: 한 줄 요약
  - **Detail** :
    - **`파일경로` [MODIFY|ADD]**: 변경 내용
  - **Build Time**: YYYY-MM-DD HH:mm:ss
  ```
  라벨과 Changelog 최상단 버전은 항상 같아야 한다 (2026-09-07 기준 V1.090).
- **DailyReport**: 작업 마무리 시 `doc/DailyReport.md`를 갱신하고 날짜별 사본 `doc/DailyReport_YYYY-MM-DD.md`를 남긴다. 기존 리포트 형식(주요 작업 요약 → 수정 요청 반영 내역 → 다음 계획)을 따른다.
- **스타일링**: `/builder`, `/designer`, `/hub`와 대부분의 모달은 인라인 `style={{}}` 객체를, `/`, `/login`은 Tailwind를 쓴다. 파일이 이미 쓰는 방식을 따른다.
- 로고는 `app` 밖의 `resource/ANSSil_logo_final_B.png`를 상대경로로 import한다. `@/*` 별칭이 tsconfig에 있지만 코드 전반은 상대경로를 쓴다.
- 코드 주석과 UI 문구는 한국어.
