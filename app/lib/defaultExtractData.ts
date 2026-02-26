export interface Point { x: number; y: number }
export interface Corners { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
export interface FaceData { visible: boolean; corners: Corners }
export interface FaceCoords { topSurface: FaceData; frontPanel: FaceData; sidePanel: FaceData }

export const DEFAULT_EXTRACT_COORDS: FaceCoords = {
    topSurface: { visible: true, corners: { topLeft: { x: 10, y: 10 }, topRight: { x: 90, y: 10 }, bottomRight: { x: 90, y: 55 }, bottomLeft: { x: 10, y: 55 } } },
    frontPanel: { visible: true, corners: { topLeft: { x: 10, y: 55 }, topRight: { x: 90, y: 55 }, bottomRight: { x: 90, y: 85 }, bottomLeft: { x: 10, y: 85 } } },
    sidePanel: { visible: false, corners: { topLeft: { x: 0, y: 0 }, topRight: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 }, bottomLeft: { x: 0, y: 0 } } },
};

// 각 커버 ID별 기본값 매핑
export const PREDEFINED_EXTRACTION_DATA: Record<string, { image: string, coords: FaceCoords }> = {
    'COMPACT': { image: '/covers/컴팩트.jpg', coords: DEFAULT_EXTRACT_COORDS },
    'HEALING_NUMBER': { image: '/covers/힐링넘버.jpg', coords: DEFAULT_EXTRACT_COORDS },
    'FLAT_GRID': { image: '/covers/플랫그리드.jpg', coords: DEFAULT_EXTRACT_COORDS },
    'OAK_TWEED': { image: '/covers/오크트위드.jpg', coords: DEFAULT_EXTRACT_COORDS },
    'ALL_CARE': { image: '/covers/올케어.jpg', coords: DEFAULT_EXTRACT_COORDS },
    'I5': { image: '/covers/i5.jpg', coords: DEFAULT_EXTRACT_COORDS },
    'GENTLE_BREED': { image: '/covers/젠틀브리즈.jpg', coords: DEFAULT_EXTRACT_COORDS },
};
