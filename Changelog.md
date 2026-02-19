## [Alpha V1.027] - 2026-02-20 01:10:00

### 📋 개발 요청서 구조 변경
- **Summary**: 개발 요청서 섹션 순서 변경 및 디자인 컨셉/특이사항 섹션 추가
- **Detail**:
  - **구조 변경**: 1.디자인컨셉 → 2.상세스펙 → 3.3D프리뷰 → 4.기술도면 → 5.특이사항
  - **디자인 컨셉 섹션** [NEW]: 커버 이미지 표시 (AI 생성 이미지 우선) + Gemini Vision API로 디자인 키워드 자동 분석
  - **특이사항 섹션** [NEW]: 사용자 직접 텍스트 입력 + 저장 버튼 (인쇄 시 버튼 숨김)
  - **analyze-image API** [NEW]: `app/api/analyze-image/route.ts` — Gemini 2.0 Flash로 커버 이미지 분석
- **Build Time**: 2026-02-20 01:10:00

---

## [Alpha V1.026] - 2026-02-20 00:13:00

### 🎯 반복 선택형 4장 동시 생성
- **Summary**: 4장 동시 생성 → 선택 → 참고 이미지 등록 → 재생성 반복 워크플로우
- **Detail**:
  - **route.ts**: sampleCount=4, 모든 이미지 `images[]` 배열 반환, 비정사각형 비율 참고이미지 2장 제한
  - **CoverImageGeneratorModal.tsx**: 2×2 그리드 선택 UI, "참고 등록 & 재생성" / "확정" 분기
  - 라운드 카운터, 원본+선택 참고 이미지 썸네일 표시
- **Build Time**: 2026-02-20 00:13:00

---

## [Alpha V1.025] - 2026-02-19 23:49:00

### 🎯 Subject Customization 복수 참고 이미지 지원
- **Summary**: 커버당 최대 4장의 참고 이미지를 지원하여 생성 품질 대폭 향상
- **Detail**:
  - **route.ts**: `referenceImages[]` 배열 지원 — 동일 `referenceId: 1`로 복수 Subject 이미지 전달
  - **CoverImageGeneratorModal.tsx**: `/covers/` 폴더에서 기본 + `_01`~`_04` 넘버링 이미지 자동 탐색
  - 참고 이미지 썸네일 미리보기 패널, 이미지별 사이즈 표시
  - Subject Description 커버별 영문 매핑 유지
- **Build Time**: 2026-02-19 23:49:00

---

## [Alpha V1.024] - 2026-02-19 23:36:00

### 🎯 BGSWAP 배경 교체 모드 구현
- **Summary**: 원본 매트리스 이미지를 픽셀 단위로 100% 보존하고 배경만 AI가 교체
- **Detail**:
  - **route.ts**: Subject Customization → BGSWAP 방식으로 전환
    - `REFERENCE_TYPE_RAW` (원본 이미지) + `REFERENCE_TYPE_MASK` (`MASK_MODE_BACKGROUND` 자동 마스크) + `editConfig.editMode: EDIT_MODE_BGSWAP`
  - **CoverImageGeneratorModal.tsx**: 배경 교체 전용 UI로 완전 재작성
    - Subject Description/프롬프트 형식 제거, 배경 프리셋 5종 (따뜻한 침실, 밝은 스튜디오, 럭셔리 스위트, 미니멀 룸, 코지 모던)
    - BGSWAP 모드 상태 표시, 버튼에 "배경 교체 (원본 보존)" 표기
- **Build Time**: 2026-02-19 23:36:00

---

## [Alpha V1.023] - 2026-02-19 23:17:00

### 🔧 Subject Reference 프롬프트 형식 수정
- **Summary**: Google 공식 권장 프롬프트 패턴으로 변경하여 참고 이미지 반영도 개선
- **Detail**:
  - **route.ts**: Pages Router config 제거, 디버깅 로그 강화, capability-001에서 불필요 파라미터(enhancePrompt, personGeneration) 제거
  - **CoverImageGeneratorModal.tsx**: 프롬프트를 `Create an image about [subject] [1] to match the description: [scene]` 패턴으로 변경
  - **CoverImageGeneratorModal.tsx**: 최종 프롬프트 미리보기 패널 추가, 디버그 정보 표시 추가
  - 분위기 프리셋을 scene-only 방식으로 분리
- **Build Time**: 2026-02-19 23:17:00

---

## [Alpha V1.021] - 2026-02-19 22:47:00

### 🎯 커버별 맞춤 프롬프트 & 번역 Fallback
- **Summary**: AI 이미지 생성 시 커버별 상세 프롬프트 적용 및 번역 실패 안전 처리
- **Detail**:
  - **CoverImageGeneratorModal.tsx**: `COVER_PROMPT_MAP` 추가 — 커버 7종(힐링넘버, 오크트위드, 플랫그리드, 올케어, 젠틀브리즈, i5, 컴팩트)마다 원단 색상/질감/봉제/라벨 위치를 정확히 묘사하는 전용 영문 프롬프트 작성
  - **StepCover.tsx**: `coverId` prop 전달하여 커버 선택 시 해당 프롬프트 자동 적용
  - **route.ts**: Translation API 실패(403) 시 원본 프롬프트로 fallback하여 이미지 생성 중단 방지
- **Build Time**: 2026-02-19 22:47:00

---

## [Alpha V1.020] - 2026-02-19 22:15:00

### 🎨 AI Cover Image Generation
- **Summary**: 커버 선택 단계에서 AI 이미지 생성 기능 추가 및 브로셔 기능 제거
- **Detail**:
  - **CoverImageGeneratorModal.tsx** [NEW]: AI 이미지 생성 모달 컴포넌트
    - 커버별 자동 프롬프트 생성 (이름/설명/색상 반영)
    - 한글 프롬프트 자동 번역 지원
    - 비율 선택 (1:1, 4:3, 3:4, 16:9)
    - 생성된 이미지 미리보기 및 적용 기능
  - **StepCover.tsx**: 각 커버 카드에 "🎨 AI 이미지" 버튼 추가
    - AI 생성 이미지 적용 시 원본 썸네일 대체 + "AI" 배지 표시
  - **store.ts**: `customCoverImages` 상태 추가 (커버별 AI 이미지 저장)
  - **브로셔 기능 제거**: `page.tsx`, `DevelopmentRequestModal.tsx`에서 브로셔 관련 코드 정리
- **Build Time**: 2026-02-19 22:15:00

---

## [Alpha V1.019] - 2026-02-19 18:30:00

### 🚀 Brochure Feature
- **Summary**: 매트리스 브로셔 생성 기능 추가
- **Detail**:
  - **Data & Logic**: 브로셔 데이터 구조(`BrochureData`) 및 프롬프트 생성 로직(`promptGenerator`) 구현
  - **UI Implementation**: 
    - 2페이지(표지, 상세) 브로셔 미리보기 (`BrochurePreview`, `Page1`, `Page2`)
    - A4 비율 레이아웃 및 디자인 적용 (레퍼런스 PDF 기반)
  - **User Interaction**:
    - 헤더에 "브로셔 생성" 버튼 추가
    - AI 이미지 생성을 위한 프롬프트 편집 모달 추가
- **Build Time**: 2026-02-19 18:30:00

---

## [Alpha V1.018] - 2026-02-19 14:58:00

### 🎨 UI Improvements
- **Summary**: UI 그리드 여백 수정 + 커버 스타일 이미지 적용
- **Detail**:
  - **Card padding**: `.card` 클래스에 기본 `padding: 16px` 추가하여 카드 내부 여백 확보
  - **Option grid gap**: `12px` → `16px`로 확대하여 카드 간 간격 개선
  - **커버 이미지**: `resource/` 폴더의 이미지 7종을 `public/covers/`로 복사하여 적용
    - 힐링넘버, 오크트위드, 플랫그리드, 올케어, 젠틀브리즈, i5, 컴팩트
  - **커버 UI**: 2열 그리드 → 1열 이미지+텍스트 카드 레이아웃으로 변경
  - **커버 옵션**: CUSTOM(준비중) → COMPACT(컴팩트 스타일)로 교체
  - `CoverOption` 인터페이스에 `image?: string` 속성 추가
- **Build Time**: 2026-02-19 14:58:00

---

## [Alpha V1.017] - 2026-02-19 14:32:00

### 🔄 Build Update
- **Summary**: 커스텀 옵션 추가 시 2D/3D 도면 및 전체 UI 즉시 반영
- **Detail**:
  - `MattressDrawing.tsx`: `customOptionsStore` 병합하여 커스텀 코어/커버/상단폼/사이즈 도면 반영
  - `Mattress3D.tsx`: 커스텀 코어/상단폼 3D 뷰 반영
  - `SpecSummary.tsx`: 선택 현황에 커스텀 옵션 정상 표시
  - `DevelopmentRequestModal.tsx`: 개발요청서에 커스텀 옵션 반영
  - Dual Top View: 가드폼 OFF 시에도 중앙 구분 가드폼 표시 수정
  - 도면 내 "코어" → "스트링" 텍스트 변경
- **Build Time**: 2026-02-19 14:32:00

---

## [Alpha V1.016] - 2026-02-19 14:17:33

### 🚀 Features & Improvements
- **프리셋 저장/불러오기**: 현재 설계 설정을 프리셋으로 저장하고 불러오기 (최대 20개, localStorage 영속)
  - 헤더에 "💾 프리셋" 드롭다운 패널 추가
  - `presetStore.ts`, `PresetPanel.tsx` 신규 생성
- **커스텀 옵션 추가/삭제**: 모든 Step에서 "+" 버튼으로 사용자 정의 옵션 추가 가능
  - Step 1 사이즈: 이름, 지역, W, D 입력
  - Step 2 폼: 상단폼 옵션, 가드폼 두께/경도, 하단폼 두께/경도 각각 추가
  - Step 3 스트링: 제목, 소재명, 설명, 높이 입력
  - Step 4 커버: 네이밍, 특징, 등급, 색상 입력
  - Step 5~7 컨트롤러/포장/배송: 네이밍, 특징 입력
  - `customOptionsStore.ts`, `AddOptionModal.tsx` 신규 생성
- **명칭 변경**: "코어(Core)" → "스트링(String)" 전면 변경
  - WIZARD_STEPS, SpecSummary, store 주석 등 모든 UI 텍스트 업데이트
- **Build Time**: 2026-02-19 14:17:33

---

## [Alpha V1.015] - 2026-02-19 13:30:00

### 🚀 Features & Improvements
- **Visual**: 상단폼(Top Foam) 멀티 레이어 시각화.
  - **3D Preview**: 2Layer 이상인 상단폼 선택 시, 각 layer 높이에 맞춰 적층하고 컬러를 달리하여(진한 회색/연한 회색 계열) 구분.
  - **2D Front View**: 도면 정면도에서도 상단폼의 레이어를 구분된 사각형과 투명도 차이로 표현.

---

## [Alpha V1.014] - 2026-02-19 13:25:00

### 🚀 Features & Improvements
- **Visual**: 가드폼 조립 라인(Seam) 시각화 강화.
  - **2D Top View**: 가드폼을 4개(Dual 5개)의 독립된 파트로 구분하여 렌더링.
  - **3D Preview**: 가드폼 모서리에 라운딩(2mm Bevel)을 적용하여 조립 경계선 가시화.

---

## [Alpha V1.013] - 2026-02-19 13:15:00

### 🚀 Features & Improvements
- **Enhanced**: 3D 분해 뷰(Exploded View) 로직 개선.
  - 가드폼 프레임은 분해 시에도 결합 상태 유지 (수평 확장 제거).
  - 코어 레이어는 수직으로 더 높게 상승하여 가드폼과 명확히 분리.
- **Visual**: 3D 가드폼(Head) 타공(Ø120) 시각화 유지.

---

## [Alpha V1.012] - 2026-02-19 09:30:00

### 🧊 3D Visualization Module
- **Summary**: 매트리스 3D 시각화 모듈 구현 및 2D/3D 뷰 전환 기능 추가.
- **Detail**:
  - `Mattress3D.tsx` (React Three Fiber) 컴포넌트 추가.
  - 하단폼, 코어(싱글/듀얼), 가드폼, 상단폼 레이어 시각화.
  - Exploded View (분해 보기) 인터랙션 구현.
  - `Mattress3D.tsx`: 2D Drawing / 3D Preview 전환 토글 UI 구현.
  - **Fixed**: 3D 코어 레이어 축 방향 오류 수정 (Width/Depth/Height 매핑 교정).
  - **Enhanced**: 분해 뷰(Exploded View) 시 코어와 가드폼이 수평 방향으로도 분리되도록 개선.
  - **Visual**: 코어 모서리 라운딩(30mm) 적용 및 분해 뷰 간격 1.5배 확대.
  - **Fixed**: 첫 화면(2D) 레이아웃 여백 소실 및 스크롤 불가 현상 수정.
  - **Enhanced**: 3D 가드폼(Head) 타공(Ø120) 시각화 적용 (Single/Dual 반영).
- **Note**: AI 이미지 생성 기능은 서비스 이슈(503)로 지연됨.

---

## [Alpha V1.007] - 2026-02-19 08:27:39

### 🔄 Build Update
- **Summary**: UI 디자인 개선 및 선택 상태 시각화 강화
- **Detail** :
  - **Step Indicator**: 텍스트 중심의 와이드 레이아웃으로 변경 (아이콘 삭제, 가독성 개선)
  - **Step Titles**: 타이포그래피 강조 (Gradient Text + 사이즈 확대)
  - **Selection UI Refinement**:
    - 도면 색상(CO)과 동일한 컬러 시스템 적용 (Core: Blue, Top: Green, Guard: Orange, Bottom: Teal)
    - 선택된 항목에 Ring Border, 배경색, Shadow 효과 추가하여 시각적 인지 강화
    - Grid 레이아웃 간격 조정 및 카드 디자인 개선
- **Build Time**: 2026-02-19 08:27:39

---

## [Alpha V1.008] - 2026-02-19 08:48:12

### 🔄 Build Update
- **Summary**: 가드폼(W) 타공(Hole) 시각화 및 도면 상세 업데이트
- **Detail** :
  - **MattressDrawing**: Parts Detail 영역의 '가드폼 W'를 Front View(정면도)로 변경하여 타공 표현
  - **Hole Logic**:
    - Single: 정중앙 1개 (Ø120)
    - Dual: 좌/우 코어의 중앙에 각각 1개 (총 2개) 위치 자동 계산
  - **Dimension**: 가드폼 두께(T) 대신 높이(H)를 사용하여 타공 위치 명확화

---

## [Alpha V1.011] - 2026-02-19 09:05:25

### 🔄 Build Update
- **Summary**: 사이트 전체 디자인 리뉴얼 (Global White Mode & Premium Light Design)
- **Detail** :
  - **Theme Overhaul**: Dark → **Premium Light** 전면 전환
    - `globals.css` 전면 재작성 (297줄 → 243줄, Noise Overlay 제거)
    - Background: `#f0f4f8` (Cool Slate) / Cards: Pure White
    - Typography: Slate 900/600/400 (Sharp Contrast)
  - **Component Styling**:
    - Header: Glassmorphism (`blur(16px)` + `rgba(255,255,255,0.85)`)
    - Step Badge: Pill 스타일 (`Step 1/7`)
    - Cards: Refined Shadow (`shadow-card`, `shadow-card-hover`)
    - Buttons: Indigo Glow Shadow + Focus Ring
    - Inputs: Focus Ring (`0 0 0 3px rgba(79,70,229,0.1)`)
  - **Cache Reset**: `.next` 캐시 초기화 및 서버 재시작
- **Build Time**: 2026-02-19 09:05:25

---

## [Alpha V1.010] - 2026-02-19 09:12:30

### 🔄 Build Update
- **Summary**: 도면 UI 개선 (Professional White Mode)
- **Detail** :
  - **Color Theme**: PDF 변환 및 인쇄 최적화를 위해 Dark Mode → **White Mode**로 변경
  - **Styling**:
    - 배경: Pure White (#FFFFFF)
    - 치수선/텍스트: 가독성 높은 Dark Grey / Black 적용
    - 테두리/표제란(Title Block): 깔끔한 라인 스타일로 리파인
  - **Drawing Quality**: 전문 설계 도면 스타일의 Line Weight 및 색상 조합 적용

---

## [Alpha V1.009] - 2026-02-19 09:00:00

### 🔄 Build Update
- **Summary**: 가드폼(W) 타공 위치 치수(Dimension) 표기 추가
- **Detail** :
  - **Single**: 좌/우 끝에서 타공 중심까지 거리 (W/2) 표기
  - **Dual**: 좌측 끝 → 좌측 타공, 우측 타공 → 우측 끝 거리 (gfT + coreW/2) 표기

---

## [Alpha V1.006] - 2026-02-19 08:12:21

### 🔄 Build Update
- **Summary**: 도면 표제란 타이틀 입력 기능 추가 + 코드 클린업
- **Detail** :
  - 헤더 프로젝트 제목 입력 제거 → 도면 표제란(Title Block)에 foreignObject input 배치
  - 사용자가 도면 내에서 직접 타이틀 편집 가능 (실시간 반영)
  - 색상 상수 `C` → `CO`로 변경 (ESLint 충돌 방지)
  - 중복 코드 정리 및 전체 파일 클린 재작성
- **Build Time**: 2026-02-19 08:12:21

---

## [Alpha V1.005] - 2026-02-19 07:43:05

### 🔄 Build Update
- **Summary**: Title 입력, Dual 코어 옵션, 가드폼 순서 변경
- **Detail** :
  - 헤더에 프로젝트 제목 입력 필드 추가 (도면 표제란 실시간 반영)
  - Q 이상 사이즈 Dual 옵션 (코어 2개 W 방향 배치)
  - Dual + 가드폼 유: 외곽 + 중앙 가드폼 (보더 3개 + W가드 2개)
  - Dual + 가드폼 무: 중앙 구분 가드폼만 1개
  - 가드폼 선택 순서 변경 (두께 먼저 → 유/무 → 경도)
  - calcCoreDimensions() 헬퍼로 코어/가드폼 수량 자동 계산
  - Parts Detail에 수량(×ea) 자동 표시
- **Build Time**: 2026-02-19 07:43:05

---

### 🔄 Build Update
- **Summary**: 도면 겹침 문제 해결 — 모든 영역 동적 레이아웃 계산
- **Detail** :
  - 모든 도면 영역(Top View, Front View, Parts Detail) 위치를 동적 계산으로 전환
  - Front View: 레이어를 위→아래 순차 쌓기(yPointer)로 정확한 단면도 구현
  - Parts Detail: 각 부품 Y좌표를 이전 부품 높이 기반 누적 계산
  - SVG 전체 높이를 콘텐츠에 맞게 동적 산출 (고정값 제거)
  - Front View 최소 높이 120px 보장으로 얇은 레이어도 가시화
  - 각 레이어별 개별 높이 치수선(Front View 좌측) 추가
- **Build Time**: 2026-02-19 07:29:17

---

### 🔄 Build Update
- **Summary**: 도면 스타일을 공식 엔지니어링 도면 형식으로 전면 업그레이드
- **Detail** :
  - 도면 테두리(Border) 및 내부 마진선 추가
  - 표제란(Title Block): 제목, 사이즈(W×D×H), 스케일(NTS), 도면번호(MDA-XXX-001)
  - 치수선: 삼각형 화살표 + 연장선(Extension Lines) 적용
  - 센터라인: 일점쇄선(dash-dot) 패턴 적용
  - 각 부품별 구분 해치 패턴: 코어(45° 사선), 상단폼(점 패턴), 가드폼(-45° 사선), 하단폼(30° 사선)
  - 폰트: Courier New 모노스페이스 (엔지니어링 표준)
- **Build Time**: 2026-02-19 07:16:29

---

### 🔄 Build Update
- **Summary**: UI 레이아웃 및 폼 선택 구조 대규모 리팩토링
- **Detail** :
  - 레이아웃 변경: 좌측(위자드+선택현황) / 우측(실시간 도면 크게)
  - Step 순서 변경: 폼 선택(Step2) → 코어(Step3)
  - 폼 Step을 3단계로 분리: 상단폼, 가드폼, 하단폼 (각각 유/무 + 두께 + 경도)
  - 도면 전면 재설계: Top View + Front View(레이어 단면) + 우측 부품 상세(1/3 스케일)
  - 부품별 상세 사이즈 정보 표기 (코어, 상단/하단폼, 가드폼D, 가드폼W)
- **Build Time**: 2026-02-19 06:54:04

---

### 🔄 Build Update
- **Summary**: 매트리스 설계 에이전트 초기 빌드 - Designer Agent (위자드 UI + SVG 도면) 구현
- **Detail** :
  - Next.js 14 + Tailwind CSS + Zustand 프로젝트 초기화
  - 7단계 Step-by-Step 위자드 UI (사이즈→코어→가드폼→커버→컨트롤러→포장→배송)
  - 실시간 2D SVG 단면도 자동 생성 (코어/가드폼/커버 레이어 + 치수선)
  - 스펙 요약 사이드 패널
  - 다크 모드 프리미엄 디자인 시스템 (globals.css)
- **Build Time**: 2026-02-19 05:56:22
