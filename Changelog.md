## [Alpha V1.075] - 2026-02-28 00:43:24

### 🔄 Build Update
- **Summary**: 커버 선택 기능 및 3D/2D 프리뷰 뷰어 UI 간소화
- **Detail** : 
  - **`app/components/Mattress3D.tsx` [MODIFY]**: 3D 프리뷰에서 부품 간격 조절 슬라이더 사용 시, 3D 모델간 설정된 `baseGap`을 0 으로 없애서, 최소값이 완벽히 '0'(다 붙은 상태)이 될 수 있도록 렌더링 수정.
  - **`app/components/Mattress3D.tsx` [MODIFY]**: 커버 선택 시 3D 프리뷰 오버레이로 렌더링되던 커버 단면 이미지 기능을 완전히 삭제 (샌드위치 뷰 제거).
  - **`app/components/steps/StepCover.tsx` [MODIFY]**: 커버 선택 단계의 각 스타일 카드 우측의 "✨ AI이미지", "✂️ 텍스쳐추출" 버튼 삭제 및 이와 연결된 모달 컴포넌트 호출 삭제.
- **Build Time**: 2026-02-28 00:43:24

## [Alpha V1.074] - 2026-02-28 00:36:06

### 🔄 Build Update
- **Summary**: 빌더 페이지 설정 및 3D/2D 프리뷰 뷰어 개선
- **Detail** : 
  - **`app/builder/page.tsx` [MODIFY]**: 3D 뷰어 화면에서 2D 도면 보기로 전환되지 않는 버그 수정 (2D/3D 토글 z-index 상향).
  - **`app/components/Mattress3D.tsx` [MODIFY]**: 3D 프리뷰에서 불필요한 '커버 숨기기' 버튼 기능 삭제.
  - **`app/components/steps/StepFoam.tsx` [MODIFY]**: 상단폼, 가드폼, 하단폼 옵션 단계에서 불필요한 "테두리 라운드값(R값)" 슬라이더 UI 렌더링 제거.
- **Build Time**: 2026-02-28 00:36:06

## [Alpha V1.073] - 2026-02-26 16:35:00

### 🔄 UI Update
- **Summary**: 로그인 후 Hub 페이지 이동 + Builder 페이지 홈 버튼 추가 + 상단 커버 겹침 방지
- **Detail** :
  - **`app/login/page.tsx` [MODIFY]**: 로그인 성공 후 리다이렉트 경로를 `/builder` → `/hub`으로 변경.
  - **`app/builder/page.tsx` [MODIFY]**: 헤더 좌측에 `🏠 홈` 버튼 추가, `/hub`으로 이동 가능.
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: 상단 커버의 W/D를 10mm 확장하여 조립 상태에서 내부 폼과의 z-fighting(녹색 겹침) 방지.
- **Build Time**: 2026-02-26 16:35:00

## [Alpha V1.072] - 2026-02-26 16:14:00

### 🚀 Feature + 🐛 Bug Fix
- **Summary**: 커버별 정교한 크롭 좌표 프리셋 적용 + 베이직 커버 모델링 수정
- **Detail** :
  - **`app/lib/defaultExtractData.ts` [MODIFY]**: 7개 커버(컴팩트, 힐링넘버, 플랫그리드, 오크트위드, 올케어, i5, 젠틀브리즈)의 정교한 크롭 좌표를 사용자가 직접 설정한 값으로 하드코딩. 데이터 구조를 `coords` → `upperCoords`/`lowerCoords` 분리 체계로 개편하여 상단/하단 커버의 독립 좌표 지원.
  - **`app/lib/autoInitTextures.ts` [MODIFY]**: 상단/하단 커버 분리 크롭을 지원하도록 업데이트. 하단 커버 좌표가 있는 경우(스탠다드/프리미엄) 자동으로 하단 크롭도 실행.
  - **`app/components/TextureExtractorModal.tsx` [MODIFY]**: 새 데이터 구조(`upperCoords`/`lowerCoords`)에 맞게 프리셋 좌표 참조 방식 수정.
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: 베이직 커버(컴팩트/힐링넘버) 모델링 수정:
    - 하단 커버 제거 (botCoverT = 0)
    - 상단 커버 높이 = 코어(200mm) + 상단폼 두께 (전체를 감싸는 단일 커버)
    - 상단 커버 Y축 위치를 코어 중앙 기준으로 배치
- **Build Time**: 2026-02-26 16:14:00

## [Alpha V1.071] - 2026-02-26 15:03:00

### 🚀 Feature
- **Summary**: 프리셋 커버 텍스처 자동 초기화 — 프로그램 시작 시 모든 커버의 텍스처 추출이 자동 완료
- **Detail** :
  - **`app/lib/autoInitTextures.ts` [NEW]**: 앱 시작 시 `PREDEFINED_EXTRACTION_DATA`에 등록된 7개 커버(컴팩트, 힐링넘버, 플랫그리드, 오크트위드, 올케어, i5, 젠틀브리즈)의 원본 이미지를 자동으로 perspectiveCrop하여 default 텍스처로 저장하는 `useAutoInitTextures` 훅 구현.
  - **`app/designer/page.tsx` [MODIFY]**: 디자이너 페이지 진입 시 `useAutoInitTextures()` 호출 연결. localStorage에 이미 저장된 default가 있으면 중복 실행을 방지합니다.
  - 프로그램을 처음 시작해도 모든 커버에 기본 텍스처가 적용된 상태로 분해도가 표시됩니다.
- **Build Time**: 2026-02-26 15:03:00

## [Alpha V1.070] - 2026-02-26 14:11:00

### 🐛 Bug Fix + 🔄 UI Update
- **Summary**: Default 텍스처 커버별 독립 관리 수정 + 분해도 간격 슬라이더 최대값 600mm 확장
- **Detail** :
  - **`app/components/steps/StepCover.tsx` [MODIFY]**: 커버 변경 시(`coverId` 변경) 해당 커버의 Default 텍스처를 자동으로 불러오는 `useEffect` 추가. 저장된 default가 있으면 해당 커버의 텍스처/좌표/원본이미지를 자동 적용하고, 없으면 텍스처를 초기화하여 이전 커버의 텍스처가 남지 않도록 수정.
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: 부품별 이격 간격 슬라이더의 최대값을 300mm에서 **600mm**로 확장.
- **Build Time**: 2026-02-26 14:11:00

## [Alpha V1.069] - 2026-02-26 12:47:00

### 🐛 Bug Fix
- **Summary**: 텍스처 매핑 깨짐(Tearing) 근본 수정 — RoundedBox → BoxGeometry 전환
- **Detail** :
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: 텍스처가 적용되는 커버 레이어의 3D 지오메트리를 `RoundedBox` + 수동 UV 재계산(`ProjectedRoundedBox`)에서 **표준 `BoxGeometry` 6면 멀티 머티리얼(`StableTexturedBox`)**로 완전 교체. BoxGeometry의 면 인덱스(0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z, 5:-Z)는 항상 고정이므로 UV 매핑이 절대 깨지지 않습니다.
  - **텍스처 로딩 시스템 안정화**: 개별 `new Image()` 로딩을 `loadTextureFromUrl()` 캐시 기반 유틸로 교체하여 동일 텍스처 중복 로딩 방지, 컴포넌트 언마운트 시 비동기 콜백 취소(cancel) 처리 추가.
  - **Fallback 텍스처 메모이제이션 개선**: `createQuiltedTexture`/`createRibbedTexture` fallback을 `isTop`과 `color`에만 의존하도록 분리하여 불필요한 재생성 방지.
  - **미사용 코드 정리**: `ProjectedRoundedBox` 함수 및 `useLayoutEffect` 임포트 제거.
- **Build Time**: 2026-02-26 12:47:00

## [Alpha V1.068] - 2026-02-26 12:30:00

### 🐛 Bug Fix
- **Summary**: 텍스쳐 깨짐(Tearing) 수정 + Default 저장 범위 커버별 독립 분리
- **Detail** :
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: `ProjectedRoundedBox` UV 프로젝션 방식을 법선(Normal) 기반 Tri-planar에서 **Face-Group Index 기반** 방식으로 전면 교체. RoundedBox의 `geometry.groups` 배열로 각 면(Right/Left/Top/Bottom/Front/Back)에 속하는 정점을 정확히 식별하여 동일 투영축을 일관 적용함으로써 곡면 모서리에서 발생하던 텍스처 왜곡·찢어짐(tearing) 현상을 완전히 제거했습니다.
  - **`app/components/TextureExtractorModal.tsx` [MODIFY]**: "Default로 저장" 버튼 클릭 시 저장 키를 기존 `structureType`(basic/standard/premium)에서 **`coverId`(COMPACT, FLAT_GRID 등)** 로 변경하여, 특정 커버에서만 저장한 기본 텍스쳐가 다른 커버에 영향을 주지 않도록 완전 독립 분리. 불러오기 시에도 `coverId` 저장본 → `structureType` 저장본 → 프리셋(PREDEFINED) 순으로 우선순위를 적용합니다.
- **Build Time**: 2026-02-26 12:30:00

## [Alpha V1.067] - 2026-02-26 12:20:00

### 🔄 Build Update
- **Summary**: 텍스쳐 추출기 기본 프리셋 이미지 소스 변경 (02번 측면 디테일 컷 적용)
- **Detail** :
  - **`app/lib/defaultExtractData.ts` [MODIFY]**: 텍스쳐 추출기를 열었을 때 기본적으로 로드되는 커버 제품 사진을 전체 풀샷(`.jpg`)에서 텍스쳐 추출에 용이한 전용 근접 측면/파이핑 디테일컷(`*02.png` 또는 `*02.jpg`)으로 교체 적용했습니다. (i502, 오크트위드02, 올케어02, 젠틀브리즈02, 힐링넘버02, 플랫그리드02, 컴팩트02)
- **Build Time**: 2026-02-26 12:20:00

## [Alpha V1.066] - 2026-02-26 10:25:00

### 🔄 Build Update
- **Summary**: 텍스쳐 추출기 기본 제품 스펙(이미지/좌표) 데이터 프리셋 구축 및 연결
- **Detail** :
  - **`app/lib/defaultExtractData.ts` [NEW]**: 6가지 주요 커버 제품(컴팩트, 힐링넘버, 플랫그리드, 오크트위드, 올케어, i5, 젠틀브리즈) 각각에 대한 원본 이미지와 기본 추출 좌표(Perspective Coordinates) 프리셋을 선언했습니다.
  - **`app/components/TextureExtractorModal.tsx` & `StepCover.tsx` [MODIFY]**: 텍스쳐 추출기를 최초로 열었을 때, 기존 등록된 `structureType` 기반 전역 설정보다 "커버 제품 고유 프리셋 데이터"를 최우선으로 불러오도록 우선순위 초기화 로직을 변경했습니다. 이를 통해 빈 화면을 방지하고 커버 제품 변경 시 즉각적으로 알맞은 이미지가 에디터에 등록되게 지원합니다.
- **Build Time**: 2026-02-26 10:25:00

## [Alpha V1.065] - 2026-02-26 09:45:00

### 🔄 Build Update
- **Summary**: 텍스쳐 추출기 모달 전체화면 UI 적용 및 이미지 줌/팬(Pan&Zoom) 기능 탑재
- **Detail** :
  - **`app/components/TextureExtractorModal.tsx` [MODIFY]**: 
    - 텍스처(꼭짓점 편집) 설정 시 화면을 더 크게 볼 수 있도록 모달 컨테이너의 제한된 크기(90vw/80vh)를 디스플레이 화면 전체(Full Screen 100vw/100vh)를 꽉 채우도록 개편.
    - 추출기 이미지 에디터 영역 내 마우스 휠(Wheel) 조작을 통한 화면 확대/축소(Zoom In/Out) 기능 구현 (배율 10% ~ 1000% 지원).
    - 화면 배경부를 마우스로 클릭 후 드래그하여 이미지를 화면 내에서 상하좌우로 이동(Pan)시킬 수 있는 뷰포트 이동 기능 추가.
    - 우측 상단에 직관적인 확대(+), 축소(-), 100% 초기화 컨트롤 패널 버튼 배치 완료.
- **Build Time**: 2026-02-26 09:45:00

## [Alpha V1.064] - 2026-02-26 09:34:00

### 🔄 Build Update
- **Summary**: 분해도 보기 클릭 시 화면 전체 오류(Client-side exception) 디버깅 및 수정
- **Detail** :
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: 3D 모델 렌더링 시 `ProjectedRoundedBox` 컴포넌트 내부에서 `geomRef.current`가 `THREE.BufferGeometry` 대신 `THREE.Mesh`를 참조하여 `.attributes.position.count`를 읽지 못해 발생하던 런타임 에러(TypeError)를 안전하게 처리하도록 수정.
  - React Hook의 호출 순서 안정성을 위해 `useRef`(`innerCoreRef`)의 선언문을 `useFrame` 위로 이동.
- **Build Time**: 2026-02-26 09:34:00

## [Alpha V1.063] - 2026-02-26 01:05:00

### 🔄 Build Update
- **Summary**: 분해도 부품별 개별 간격 조절 기능(Slider UI) 추가 
- **Detail** :
  - **`app/components/MattressExplodedView.tsx` [MODIFY]**: 상단 커버, 상단 폼, 코어(스트링), 하단 폼, 하단 커버 등 각 부품의 분해 이격 거리를 사용자가 개별적으로 0~300mm까지 실시간 조절할 수 있는 슬라이더 UI 패널을 추가했습니다.
- **Build Time**: 2026-02-26 01:05:00

## [Alpha V1.062] - 2026-02-26 00:24:00

### 🔄 Build Update
- **Summary**: Vercel 빌드 중 발생한 TypeScript 에러(PresetPanel.tsx) 수정
- **Detail** :
  - **`app/components/PresetPanel.tsx` [MODIFY]**: `store.ts`의 `DesignState` 인터페이스에 새로 추가되었던 `defaultTextures` 필드가 프리셋 저장 시의 상태 객체 매핑에 누락되어 발생한 TypeScript 컴파일 에러(Type error: Property 'defaultTextures' is missing...)를 해결했습니다.
- **Build Time**: 2026-02-26 00:24:00

## [Alpha V1.061] - 2026-02-26 00:03:00

### 🔄 Build Update
- **Summary**: 매트리스 커버 추출기 Default 설정 및 분해 뷰 렌더링 개선
- **Detail** :
  - **`store.ts` & `TextureExtractorModal.tsx` [MODIFY]**: 텍스쳐 추출기에서 설정한 커버 이미지를 스타일(Basic, Standard, Premium)별 Default 값으로 전역 저장하고, 각 스타일 진입 시 기본값으로 자동 불러오도록 연결.
  - **`MattressExplodedView.tsx` [MODIFY]**: 
    - 3D 분해도 렌더링 시 외부 환경(지평면, Grid Helper, ContactShadows)을 제거하여 순수한 제품만 출력되도록 개선.
    - 커버(CoverBox)의 모서리 라운드 값을 내부 폼(상단/하단폼)의 라운드 값과 일치하도록 `RoundedBox` 기반으로 전면 리팩토링 및 투명 재질 혼합 적용.
    - 분해 애니메이션 재생 중 코어(스트링) 3D 모델이 가드폼 위로 100mm(10cm) 떠오르도록 Y축 애니메이션 오프셋 적용.
    - Basic 타입 선택 시 하단 커버를 텍스쳐 렌더링 및 모델링에서 제외.
- **Build Time**: 2026-02-26 00:03:00

## [Alpha V1.060] - 2026-02-25 23:42:00

### 🔄 Build Update
- **Summary**: Vercel 배포 실패 원인 해결 (Next.js config / TS Type Error 수정)
- **Detail** :
  - **`app/api/analyze-image-prompt/route.ts` & `app/api/generate-image/route.ts` [MODIFY]**: Next.js App Router 환경에서 지원하지 않는 `export const config = { api: { bodyParser: ... } }` 구문 삭제 (Vercel Build Error 해결).
  - **`app/api/generate-face-texture/route.ts` [MODIFY]**: Base64 이미지 용량 초과로 인하여 json 파싱 실패할 경우를 대비하여 `req.json()`에 try-catch 에러 핸들링 추가 적용 (Next.js 500 에러 다운 방지).
  - **`app/components/PresetPanel.tsx` [MODIFY]**: 프리셋 저장 시 `DesignState` 타입에 새로 추가된 커버 이미지 매핑 관련 필드들(`upperCoverTextures`, `lowerCoverTextures`, `upperCoverCoords`, `lowerCoverCoords`, `coverExtractSourceImage`)이 누락되어 발생한 TypeScript 빌드 에러 해결.
- **Build Time**: 2026-02-25 23:42:00

## [Alpha V1.059] - 2026-02-25 23:21:40

### 🔄 Build Update
- **Summary**: 매트리스 상하단 커버 3D 입체 렌더링 형태 개선 (뚜껑 및 바구니 형태)
- **Detail** :
  - **MattressExplodedView.tsx [MODIFY]**: 
    - 상단 커버를 막힌 육면체가 아닌, 상단폼을 정확히 덮는 2mm 두께의 **뚜껑(Lid) 형태**로 개선 (하단면 개방).
    - 하단 커버를 하단폼과 가드폼을 모두 감싸는 2mm 두께의 **바구니(Basket) 형태**로 개선 (상단면 개방).
    - CoverBox 컴포넌트를 단일 BoxGeometry에서 5개의 면(BoxGeometry) 조합으로 변경하여 두께감 및 텍스처(외부, 내부, 테두리)의 왜곡 없는 1:1 매핑 구현.
    - 조립 상태(분해 간격 0)에서 내부의 폼들(상단폼, 코어, 하단폼)이 상하단 커버 내부 공간에 완벽히 수납되어 틈새 없이 보이도록 Y축 좌표 동적 계산 로직 정밀 조정.
- **Build Time**: 2026-02-25 23:21:40

## [Alpha V1.058] - 2026-02-24 23:59:23

### 🔄 Build Update
- **Summary**: 매트리스 3D 분해도 전용 뷰어 및 디자이너 페이지 구현
- **Detail** :
  - **MattressExplodedView.tsx [NEW]**: 매트리스 내부 구조를 3D 분해도로 시각화하는 전용 컴포넌트 신규 생성 (726줄)
    - 커버 상단면에 퀼팅(quilted) 패턴 텍스처를 Canvas API로 프로그래매틱 생성 (쿠션 그라데이션, 대각선 스티칭, 터프팅 버튼)
    - 커버 측면에 리브드(ribbed) 직물 텍스처를 Canvas API로 생성 (세로 골 패턴, 직물 노이즈)
    - CoverBox 컴포넌트: BoxGeometry 멀티 플레인 방식으로 상단(퀼팅/AI이미지), 측면(리브드), 하단(무지) 개별 재질 적용
    - 분해/조립 애니메이션: `useFrame` + lerp 기반 부드러운 전환
    - 5개 레이어(상단커버, 상단폼, 가드폼+코어, 하단폼, 하단커버) 동적 렌더링
  - **designer/page.tsx [NEW]**: `/designer` 경로에 5단계 위자드(사이즈→구조→스트링→커버→분해도) 페이지 구현
    - Step 1~4: 좌측 사이드바에서 옵션 선택, 우측에 설계 현황 요약 프리뷰
    - Step 5: 전체화면 3D 분해도 뷰어 표시
  - **hub/page.tsx [MODIFY]**: 허브에서 디자이너 페이지로 이동 가능한 카드 추가
  - **middleware.ts [MODIFY]**: 인증 후 `/hub`으로 리다이렉트하도록 미들웨어 수정
- **Build Time**: 2026-02-24 23:59:23

## [Alpha V1.057] - 2026-02-24 11:58:01

### 🔄 Build Update
- **Summary**: 3D 미리보기 커버 이미지 표시 토글 기능 추가
- **Detail** :
  - **커버 숨기기/보기 버튼 (`Mattress3D.tsx`)**: 사용자 피드백을 반영하여 3D 뷰어 우측 상단에 2D 커버(샌드위치 뷰)를 On/Off 할 수 있는 버튼을 추가했습니다. 커버 이미지 오버레이가 내장 3D 렌더링에 방해되거나 어색하게 느껴질 때 숨김 처리하고 내부 부품만을 자세히 들여다볼 수 있습니다.
- **Build Time**: 2026-02-24 11:58:01

## [Alpha V1.056] - 2026-02-24 11:52:42

### 🔄 Build Update
- **Summary**: 3D 미리보기 2D 커버 이미지 동적 분할 샌드위치 뷰 적용
- **Detail** :
  - **이미지 자동 분석 분할 (`Mattress3D.tsx`)**: 사용자가 선택한 커버 이미지(AI 생성 또는 기본 제공품)를 Canvas API로 렌더링하고 Edge Detection(밝기 대비)을 통해 옆면의 명확한 파이핑(경계선) Y좌표 비율을 동적으로 찾아냅니다. 
  - **커버 상하 샌드위치 기법**: 찾아진 비율을 기준으로 2D 커버 이미지를 상판과 하판으로 각각 `clip-path` 분할한 뒤, 중간에 실제 3D 폼 모델이 투시도 각도와 유사한 형태로 배치되도록 설계했습니다.
  - **다이내믹 렌더링**: '부품 간격 조절' 슬라이더를 올리면 2D 상단 이미지는 위로 솟아오르고, 하단 이미지는 살짝 아래로 비례 이동하며 그 사이의 3D 매트리스 폼 부품들(항상 미세하게 띄워진 상태 유지)이 극적으로 보여지는 혼합 시각화 처리(샌드위치 분해 뷰)를 구축했습니다.
- **Build Time**: 2026-02-24 11:52:42

## [Alpha V1.055] - 2026-02-24 11:30:33

### 🔄 Build Update
- **Summary**: 3D 미리보기 분해 뷰 UI 및 방식 개선
- **Detail** :
  - **UI 단순화 (`Mattress3D.tsx`)**: 기존 '분해 뷰 보기/끄기' 토글 버튼을 제거하고, '부품 간격 조절' 슬라이더만 단독으로 노출시키도록 UI 개선.
  - **자연스러운 분해 로직 적용**: 슬라이더의 기본값을 0(완전 결합 상태)으로 적용하여 초기 로드 시 조립된 상태를 보여주며, 슬라이더를 이동하는 것에 비례하여 부품들이 상하로 부드럽게 분해되도록 3D 모델(Three.js) 좌표 렌더링 로직 수정.
- **Build Time**: 2026-02-24 11:30:33

## [Alpha V1.054] - 2026-02-24 11:06:22

### 🔄 Build Update
- **Summary**: 3D 미리보기 분해 뷰 간격 조절 기능 추가
- **Detail** :
  - **간격 슬라이더 UI 추가 (`Mattress3D.tsx`)**: 분해 뷰 활성화 시 우측 상단에 간격 조절 슬라이더(0.05 ~ 0.5 범위)를 추가 노출하여, 사용자가 실시간으로 매트리스 부품 간 상하 간격을 원하는 대로 제어할 수 있도록 개선
- **Build Time**: 2026-02-24 11:06:22

## [Alpha V1.053] - 2026-02-23 22:08:00

### 🔄 Build Update
- **Summary**: 매트리스 생성 기본 참고 이미지(Reference Images) 전면 교체 적용
- **Detail** :
  - **이미지 에셋 업데이트**: `/public/covers/` 폴더 내에 위치한 AI 이미지 생성용 디폴트 참고 이미지 세트(올케어, 젠틀브리즈 등)를 사용자가 선정한 신규 사진 에셋으로 전면 교체하여 배포.

## [Alpha V1.052] - 2026-02-23 21:55:00

### 🔄 Build Update
- **Summary**: AI 배경 생성 "참고 이미지" 사용자 커스텀 업로드/삭제 기능 추가
- **Detail** :
  - **참고 이미지 갤러리 개편 (`CoverImageGeneratorModal.tsx`)**: `input[type="file"]`을 활용하여 시스템 기본 이미지 외에 사용자가 직접 원하는 패턴/디자인 이미지를 마음껏 업로드할 수 있는 [+ 추가] 버튼 기능 신설.
  - **개별 삭제 및 전체 비우기 기능**: 원하지 않는 기본 썸네일을 참고 이미지에서 제외할 수 있도록 개별 이미지의 우상단에 [X] 마크를 달고, 전체 이미지를 일괄 삭제하는 [비우기] 버튼 UI 배치. 자유로운 레퍼런스 이미지 조합 제공.

## [Alpha V1.051] - 2026-02-23 21:10:00

### 🔄 Build Update
- **Summary**: AI 배경 생성 프롬프트 투명성 확보 및 UI 노출 강화
- **Detail** :
  - **하드코딩 제거 및 UI 노출**: 백엔드 API 단에서 숨겨진 채 전송되던 매트리스 디자인 프롬프트(`SUBJECT_DESC`)를 프론트엔드 UI 영역(매트리스 텍스트 박스)에 기본값으로 노출시켜 사용자가 직접 확인하고 수정할 수 있도록 개편.
  - **최종 프롬프트 직관성 개선**: "배경/분위기", "카메라 앵글", "매트리스(디자인/색상)" 3가지 요소의 텍스트가 어떻게 조합되어 최종 AI API로 전송되는지 UI 상단에 투명하게 표기.

## [Alpha V1.050] - 2026-02-23 21:05:00

### 🔄 Build Update
- **Summary**: AI 커버이미지 색상 프롬프트 개선 (젠틀브리즈, 올케어)
- **Detail** :
  - **색상 왜곡 문제 해결 (`CoverImageGeneratorModal.tsx`)**: '젠틀브리즈(GENTLE_BREED)' 모델 선택 시 기본 색상 프롬프트가 `dark navy`로 하드코딩 되어있어 어두운 네이비색 매트리스가 생성되던 현상 해결 (`warm beige or light grey`로 변경).
  - '올케어(ALL_CARE)' 모델 또한 `light blue`에서 `white and light grey`로 실제 제품 색상에 맞게 조정하여 원본 참고 이미지의 색상 톤이 유지되도록 정확도 향상.

## [Alpha V1.049] - 2026-02-23 20:30:00

### 🔄 Build Update
- **Summary**: AI 커버이미지 로딩 시 Next.js Payload 한도 초과 오류 방어를 위한 리사이즈 구현
- **Detail** :
  - **프론트엔드 리사이징 로직 추가**: `CoverImageGeneratorModal.tsx`에 참고 이미지(고화질 2~4장)를 Base64 인코딩 시 Canvas API를 통해 Max Size 800px로 1차 압축하여 병목을 줄이도록 성능 개선
  - **API Payload Limit 해제**: `app/api/generate-image/route.ts` 라우트 환경 설정에 `bodyParser: { sizeLimit: '10mb' }`를 선언하여 1MB 초과 시 413 코드와 함께 뱉어내던 Next.js JSON 파싱 에러(Unexpected token R) 구조적 해결

## [Alpha V1.048] - 2026-02-23 20:01:21

### 🔄 Build Update
- **Summary**: 랜딩페이지 이미지 로딩 배포 오류 및 텍스트 수정
- **Detail** :
  - **이미지 로딩 오류 수정**: 로컬 전용으로 동작하던 2D/3D 미리보기 이미지 API 대신, 자동 배포 환경에서도 에셋이 정상 로드되도록 `deploy.js` 빌드 스크립트를 통해 `public/images` 폴더로 배포 전 자동 복사 처리 추가
  - **텍스트 한글화 및 병합**: 랜딩페이지 하단 그리드의 영문 제목(AI-DRIVEN DESIGN)을 문맥에 맞게 `AI MATTRESS DESIGN`으로 변경하고, 내용을 "나노 바나나로 원하는 매트리스 디자인을 직접 할 수 있습니다."로 직관적으로 한글화 변경
- **Build Time**: 2026-02-23 20:01:21

## [Alpha V1.047] - 2026-02-23 02:22:00

### 🔄 Build Update
- **Summary**: 디자인 레이아웃 및 여백 최적화, 이미지 서빙 API 구성, 로그인/아웃 구현 마무리
- **Detail** :
  - **랜딩페이지 브루탈리스트 레이아웃 여백 최소화**: 컴포넌트 간 상/하, 그리드 간격을 `gap-8(32px)`에서 `gap-4(16px)`로 일일이 줄여 밀도 있는 설계도면 컨셉 와이어프레임 구축
  - **자체 로컬 이미지 제공 API**: 브라우저 로컬 `file:///` 스키마 엑스박스 차단 방지를 우회하기 위한 백엔드(`app/api/local-image`) 신규 개설. 2D/3D 이미지 렌더링 검증 완료
  - **Supabase 인증 마무리**: 빌더(`app/builder`) 헤더 상단에 세션 강제 종료인 `supabase.auth.signOut()` 기능을 연결한 로그아웃 버튼 배치 배포 완료
- **Build Time**: 2026-02-23 02:22:00

## [Alpha V1.046] - 2026-02-22 04:46:00

### 🔄 Build Update
- **Summary**: 브로셔 자동 생성 시스템 구축 및 PDF 인쇄 연동
- **Detail** :
  - **브로셔 이미지 생성 UI 대규모 개편**: `BrochureGenerator.tsx` 뷰를 `CoverImageGeneratorModal` 구조와 통일하여 풀스크린 2단 분할 레이아웃 적용
  - **이미지 장바구니 기능**: 우측 하단에 생성된 이미지 중 브로셔에 쓰일 5장을 선택해 담을 수 있는 슬롯 컴포넌트 추가
  - **브로셔 PDF 다운로드**: `BrochurePreview` 화면에 `@media print` 훅을 통한 인쇄 맞춤형 히든 A3 CSS를 적용, 원클릭 시 1,2페이지가 하나의 문서로 브라우저 PDF 저장이 가능토록 구현
  - **모달 Z-Index 간섭 버그 해결**: `CompletionModal` 내부에서 호출 시 인라인 스타일 기반의 `z-index: 9999` 를 할당하여 화면의 가장 최상단에 마운트되도록 조정
- **Build Time**: 2026-02-22 04:46:00

## [Alpha V1.045] - 2026-02-22 02:05:00

### 🔄 Build Update
- **Summary**: AI 커버 이미지 카메라 앵글, 흰색 배경 옵션 추가 및 비율/성능 개선
- **Detail** :
  - `🎥 카메라 앵글` 옵션(정면, 퍼스펙티브) 및 프롬프트 편집 영역 추가
  - 배경 분위기 옵션에 `🛏️ 매트리스만 (흰색 배경)` 프리셋 추가
  - 6가지 배경 프롬프트를 `doc/background_prompts.md`로 문서화
  - 생성 이미지 우측 렌더링 시 크롭(`objectFit: cover`) 제거 → **원하는 비율의 전체 화면(native ratio)** 그대로 표시되도록 개선
  - Gemini API 호출 시 `aspectRatio` 설정값을 `generationConfig`로 주입해 요청 비율 정확하게 생성
- **Build Time**: 2026-02-22 02:05:00

## [Alpha V1.044] - 2026-02-22 01:00:00

### 🔄 Build Update
- **Summary**: 3D Preview에 커버 레이어 추가 (커버 이미지 텍스처 적용)
- **Detail** :
  - `Mattress3D.tsx`에 `CoverLayer` 컴포넌트 추가
  - 커버 선택 시 3D 예시 최상단에 커버 패드가 표시됨
  - 커버 이미지(`/covers/*.jpg`)를 Three.js TextureLoader로 로드하여 상단면에 텍스쳐 매핑
  - 이미지가 없을 시켄 커버의 선택 색상으로 표시
  - 분해 뷰에서도 커버 레이어가 개별적으로 분리되어 표시
- **Build Time**: 2026-02-22 01:00:00

## [Alpha V1.043] - 2026-02-22 00:40:00

### 🔄 Build Update
- **Summary**: 이미지 4장 동시 병렬 생성 + 다시 생성 시 첫 조건 코드를 수정
- **Detail** :
  - `handleGenerate` 시작 시 `selectedAsRef` 쳐음화 → **다시 생성해도 항상 원본 커버 기준으로 생성**
  - `Promise.all()`로 API 4회 병렬 호출 → **4장 동시 생성** (1장싩 순차 요청 안 함)
  - Vertex AI 폴백에서도 `sampleCount: 4` 적용
- **Build Time**: 2026-02-22 00:40:00

## [Alpha V1.042] - 2026-02-22 00:37:00

### 🔄 Build Update
- **Summary**: 이미지 생성 비율 옵션에 16:9, 9:16 추가
- **Detail** :
  - 비율 선택버튼: 1:1 / 3:4 / 4:3 / **16:9 / 9:16** 추가
  - 우측 미리보기 패널에서 **선택한 비율 그대로** 이미지가 표시됨
  - 16:9 선택시 1열(널직한 화면) 그리드, 9:16 선택시 2x2 확생형 그리드
- **Build Time**: 2026-02-22 00:37:00

## [Alpha V1.041] - 2026-02-22 00:24:00

### 🔄 Build Update
- **Summary**: AI 커버 이미지 생성 모달 → 풀스크린 좌우 분할 레이아웃으로 전면 재설계
- **Detail** :
  - 기존 작은 모달(620px) → **전체 화면 풀스크린 뷰**로 변경
  - 좌측 패널 (420px, 흰 배경): 탭, 참고 이미지, 배경/분위기 프리셋, 매트리스 추가 설명, 비율 선택, 생성 버튼 등 모든 입력 컨트롤
  - 우측 패널 (나머지, 다크 배경): 생성된 이미지 4장 대형 2x2 그리드 표시
  - 각 생성 이미지에 **⬇️ 다운로드** 버튼 개별 추가
  - 최종 확정 이미지도 크게 표시 + **⬇️ 최종 이미지 다운로드** 버튼 추가
  - 생성 중 로딩 스피너 애니메이션 (우측 패널 중앙 표시)
- **Build Time**: 2026-02-22 00:24:00

## [Alpha V1.040] - 2026-02-21 23:55:00

### 🔄 Build Update
- **Summary**: 부위별 2D 커스텀 제거 및 Gemini 인페인팅 방식 신규 도입
- **Detail** :
  - **제거**: `CoverCustomizerModal.tsx` (2D SVG 커스터마이저) 및 `/api/generate-texture` 엔드포인트 완전 삭제
  - **신규 API**: `/api/inpaint/route.ts` 생성 - Gemini `gemini-2.5-flash-preview` 모델로 원본 커버 이미지 + 마스크를 받아 선택 영역의 원단을 AI가 교체
  - **UI 탭 추가**: `CoverImageGeneratorModal`에 "🖌️ 원단 인페인팅" 탭 신규 생성:
    - 원본 커버 사jin 위에 Canvas 오버레이로 수정할 영역을 직접 진하게 칠하기 (brush + 마스크 지우기)
    - AI 프롬프트로 선택 영역을 새로운 원단/재질로 자동 대체 및 결과 저장
- **Build Time**: 2026-02-21 23:55:00

---

## [Alpha V1.039] - 2026-02-21 23:28:00

### 🔄 Build Update
- **Summary**: 부위별 디자인 커스텀 이미지 결과 저장 기능 구현 및 모달 Z-Index 버그 수정
- **Detail** :
  - **SVG to PNG 렌더링 내장**: Customizer 툴에서 컬러 및 AI 원단 패턴으로 만들어낸 2D 프리뷰(SVG)를 `XMLSerializer`와 `Canvas` API를 이용해 즉석에서 High-Quality PNG (Base64) 로 렌더링하여 저장
  - **커버 옵션 적용 연동**: 위자드 화면에서 "디자인 적용" 클릭 시 최종 합성된 이미지를 해당 커버 카드의 메인 썸네일로 전역 스토어(`customCoverImages`)에 등록
  - **Modal Portal 적용**: `CoverCustomizerModal` 및 `CoverImageGeneratorModal`이 사이드바 부모 요소의 `overflow/transform`에 갇혀 잘리거나 가려지는 현상을 `react-dom`의 `createPortal`을 활용해 `document.body` 레벨로 끌어올림으로써 완벽히 해결
- **Build Time**: 2026-02-21 23:28:00

---

## [Alpha V1.038] - 2026-02-21 23:03:00

### 🔄 Build Update
- **Summary**: 매트리스 구조별 부분 디자인 툴 (Cover Customizer) 신규 추가
- **Detail** :
  - **4가지 매트리스 구조 타입 지원**: 기본 구조, 유로탑, 중앙 지퍼형, 무파이핑/일체형 등 4종의 구조 타입에 따른 부위별(상단, 옆면, 파이핑) 디자인 선택(단색, AI 원단) 옵션 제공
  - **2D 레이어 마스킹 시뮬레이션(Placeholder)**: SVG를 이용한 실시간 디자인 레이어 부분 합성 UI 연동 (추후 실제 투명 PNG 에셋과 mix-blend/mask 속성으로 교체 예정)
  - **AI 원단 패턴 (Seamless Texture) 생성 API**: Gemini `gemini-2.5-flash-image` 기반의 끊김없는 평면 텍스처 패턴 전용 생성 엔드포인트 구축
  - 위자드 커버 스텝 영역 내 '🎨 부위별 커스텀' 버튼 연동
- **Build Time**: 2026-02-21 23:03:00

---

## [Alpha V1.037] - 2026-02-21 21:55:00
### 🔄 Build Update
- **Summary**: StepIndicator 디자인 강화 및 듀얼 스펙(Q이상) 도면/3D 렌더링 수정
- **Detail** :
  - **StepIndicator 디자인 강화**: 현재 진행 중인 단계의 배경색을 연한 스카이블루 계열(`e0e7ff`)로, 하단 활성화 테두리를 3px 두께의 선명한 블루계열(`4338ca`), 내부 텍스트 컬러를 더 짙게(`3730a3`) 변경하여 현재 단계가 "눈에 띄게" 식별되도록 시각적 강도 상향 적용
  - **듀얼 스펙 코어 및 가드폼 렌더링 수정**:
    - `Basic` 등 가드폼이 들어가지 않는 구조에서 Q 이상 듀얼 사이즈 선택 시, **좌우 외곽 가드폼은 미포함하되 중앙 센터 가드폼 1개는 기본 포함되도록 렌더링 지원** (도면 Top View, Front View 및 3D View 일괄 반영)
    - 듀얼 선택 시 실제 코어 스트링이 2개(스트링 L/R)로 분리된 상태로 정면(Front View) 및 평면도(Top View), 3D 뷰에서 정상 표기 및 렌더링되게 svg 컴포넌트 내부 계산 로직 보완
  - **스토어 상태 독립성 강화**: 기존에 듀얼(isDual) 여부에 따라 가드폼(guardFoamEnabled)을 강제 활성화 하던 의존성을 제거하고, 오직 구조타입('Premium' 등)에만 폼 옵션 권한을 위임하도록 `store.ts` 설계 개선
- **Build Time**: 2026-02-21 21:55:00

---

## [Alpha V1.036] - 2026-02-21 21:45:00

### 🔄 Build Update
- **Summary**: 헤더 UI 및 진행 상황 인디케이터 개편 (전폭 테이블 형식)
- **Detail** :
  - 기존 칩(Pill) 형태의 단계 표시기를 전체 너비를 활용하는 테이블(Grid) 형태의 UI로 전면 개편
  - 단순 단계 이름뿐만 아니라, 하단에 각 단계별로 현재 선택된 옵션의 값(ex: SS 1100*2000, Basic, 힐링넘버 스타일 등)을 실시간으로 가져와 요약 표시하도록 개선
  - 헤더 영역을 2행 레이아웃(Top: 로고 및 기타 메뉴, Bottom: 인디케이터)으로 분리하여 더 직관적이고 넓은 화면을 제공
- **Build Time**: 2026-02-21 21:45:00

---

## [Alpha V1.035] - 2026-02-21 04:30:00

### 🔄 Build Update
- **Summary**: AI 모델 파이프라인 개편 및 폼 선택 UI 구조 변경
- **Detail** :
  - **AI 커버 생성 모델 갱신**: Vertex AI 기반 호출 방식에서 AI Studio 다이렉트 호출 방식(Gemini 2.5 Flash / Nano Banana)으로 전면 교체 적용 완료
  - **폼 선택(Step 2) 기능 리팩토링**:
    - "폼 선택" 단계를 "구조 선택"으로 타이틀 변경 및 개념 개편
    - 초기 상태에 `Basic`(스트링 단독), `Standard`(상단폼 추가), `Premium`(가드/하단폼 포함 케이스)의 3가지 대분류 구조 선택 버튼 UI를 도입
    - 구조 선택 값 (`structureType`) 에 따라 하위의 상세 폼(Top/Guard/Bottom) 입력 영역 노출 여부를 조건부 자동 제어
- **Build Time**: 2026-02-21 04:30:00

---

## [Alpha V1.034] - 2026-02-21 03:55:00

### 🔄 Build Update
- **Summary**: 완료 UI 개편 및 엑셀 견적서 포맷 최종 픽스
- **Detail** :
  - **설계 완료 모달**: 필수 옵션 Validation 후 `개발요청서` 및 `견적 엑셀 다운로드` 버튼이 포함된 최종 팝업창 모달 신규 구성
  - **단가 표 UI 신설**: `PricingPanel` 하단 우측에 모든 사이즈별 [ 규격 | D | W | H | 1k 단가 ] 를 나타내는 HTML Table 배치
  - **엑셀 템플릿 수정**: 텍스트 출력 서식(접두사 제외 로직 등) 및 `B33` 셀 고정 삽입 반영 완료
- **Build Time**: 2026-02-21 03:55:00

---

## [Alpha V1.033] - 2026-02-21 03:00:00

### 🔄 Build Update
- **Summary**: 엑셀 견적서 자동 생성 및 다운로드 기능 추가
- **Detail** :
  - **엑셀 템플릿 연동**: `resource/견적포맷.xlsx` 양식의 29행부터 데이터를 기입하는 방식 적용 (`exceljs` 모듈 활용)
  - **사용자 서식 반영**: 첫 행에만 '분류', '모델명', '구성' 데이터를 단일 텍스트(줄바꿈 포함)로 기재하여 가독성 증대
  - **다중 사이즈별 단가 산출 목록화**: 국내/해외 사이즈를 선택함에 따라 자동으로 관련 모든 규격들(SS/Q/K/LK 또는 T/F/Q/K/CK)의 예상 단가를 재산출하여 표기
  - **UI 제공**: 우측 '예상 단가' 패널 하단에 `견적서 엑셀 다운로드` 기능 제공
- **Build Time**: 2026-02-21 03:00:00

---

## [Alpha V1.032] - 2026-02-21 02:45:00

### 🔄 Build Update
- **Summary**: 포장 선택 사항에 따른 박스 규격 정보 제공 추가
- **Detail** :
  - **견적표 상세 연동**: `ROLL`(type A) 및 `FOLD_3`(type B) 포장 방식 선택 후, 매트리스 형태(Width)에 따라 각각의 박스 규격 상수(1400x310x310 등)가 견적 스펙에 `(Box: ...)` 형태로 나오도록 반영
  - **2D 도면 기능 보강**: 도면 하단 `TITLE BLOCK` 섹션 내 `SCALE` 표시부 우측에 박스 규격정보 연동 표시
- **Build Time**: 2026-02-21 02:45:00

---

## [Alpha V1.031] - 2026-02-21 02:22:00

### 🔄 Build Update
- **Summary**: 포장 방식 및 배송 방식 간소화 및 옵션 개편
- **Detail** :
  - **포장 방식**: 기존 3개 옵션에서 2개(롤 타입 type A, 압축 3단접 type B)로 라벨 및 수량 축소
  - **배송 방식**: 기존 3개 옵션에서 4개(자체 배송(VIP), 택배 배송(일반), 컨테이너(파렛), 미정)로 전면 개편
  - StepGenericSelect UI에서 해당 옵션들에 매칭되는 아이콘 수정
- **Build Time**: 2026-02-21 02:22:00

---

## [Alpha V1.030] - 2026-02-21 02:04:00

### 🔄 Build Update
- **Summary**: 상단폼 단일/2Layer 옵션 UI 라벨 및 두께/밀도 설명 텍스트 업데이트
- **Detail** :
  - **constants.ts, pricingData.ts**: 50mm/70mm 단일 레이어, 70mm 2Layer(5:2), 80mm 2Layer(6:2)에 대한 세부 밀도 정보(HR 40kg, HR 50kg) 및 텍스트를 UI 요구사항에 맞게 변경 적용
  - 3D/2D 뷰포트에서도 `5:2` 형태의 레이어 두께(50mm+20mm) 분리 시각화가 정상 반영되도록 호환성 검증
- **Build Time**: 2026-02-21 02:04:00

---

## [Alpha V1.029] - 2026-02-21 01:44:00

### 🔄 Build Update
- **Summary**: 가드폼 단가 계산 수량 및 규격 산정 로직 수정
- **Detail** :
  - **pricingStore.ts**: 가드폼 전체 영역을 통째로 계산하던 이전 방식에서, 가이드 치수(D 방향 2~3ea, W 방향 2ea)에 알맞게 실제 재단되는 사이즈로 분리하여 계산하도록 변경
  - 스펙 요약 및 단가 관리에 항목이 "가드폼 D" 및 "가드폼 W" 등 명확하게 분할 표기됨 (e.g. `80 x 1840 x 200 x 3ea`)
- **Build Time**: 2026-02-21 01:44:00

---

## [Alpha V1.028] - 2026-02-21 01:34:00

### 🔄 Build Update
- **Summary**: 단가 계산 오류 및 런타임 에러 수정
- **Detail** :
  - **PricingManageModal**: `toLocaleString` (`fmt`) 함수가 `undefined` 인자를 안전하게 처리하도록 개선
  - **pricingStore**: 구버전 로컬 스토리지 데이터 로드 시 누락된 최신 필드(`basePrice`, `constant` 등) 속성들을 기본 데이터와 자동으로 병합 적용
- **Build Time**: 2026-02-21 01:34:00

---

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
