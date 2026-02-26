export interface Point { x: number; y: number }
export interface Corners { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
export interface FaceData { visible: boolean; corners: Corners }
export interface FaceCoords { topSurface: FaceData; frontPanel: FaceData; sidePanel: FaceData }

export const DEFAULT_EXTRACT_COORDS: FaceCoords = {
    topSurface: { visible: true, corners: { topLeft: { x: 10, y: 10 }, topRight: { x: 90, y: 10 }, bottomRight: { x: 90, y: 55 }, bottomLeft: { x: 10, y: 55 } } },
    frontPanel: { visible: true, corners: { topLeft: { x: 10, y: 55 }, topRight: { x: 90, y: 55 }, bottomRight: { x: 90, y: 85 }, bottomLeft: { x: 10, y: 85 } } },
    sidePanel: { visible: false, corners: { topLeft: { x: 0, y: 0 }, topRight: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 }, bottomLeft: { x: 0, y: 0 } } },
};

// 각 커버 ID별 기본값 매핑 (상단/하단 커버 좌표 분리)
export const PREDEFINED_EXTRACTION_DATA: Record<string, {
    image: string;
    upperCoords: FaceCoords;
    lowerImage?: string;
    lowerCoords?: FaceCoords;
}> = {
    /* ── 컴팩트 (베이직, 상단만) ── */
    'COMPACT': {
        image: '/covers/컴팩트02.png',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 83.9, y: 36.1 }, topRight: { x: 47.2, y: 57.9 }, bottomRight: { x: 14.4, y: 33.3 }, bottomLeft: { x: 48.4, y: 20 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 14.3, y: 34.3 }, topRight: { x: 48.5, y: 59.3 }, bottomRight: { x: 48.7, y: 79.7 }, bottomLeft: { x: 14.5, y: 49.8 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 50.5, y: 59.4 }, topRight: { x: 84.7, y: 37.7 }, bottomRight: { x: 84, y: 54.7 }, bottomLeft: { x: 50.5, y: 79.4 } } },
        },
    },

    /* ── 힐링넘버 (베이직, 상단만) ── */
    'HEALING_NUMBER': {
        image: '/covers/힐링넘버02.png',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 83.9, y: 36.1 }, topRight: { x: 47.2, y: 57.9 }, bottomRight: { x: 14.4, y: 33.3 }, bottomLeft: { x: 48.4, y: 20 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 14.3, y: 34.3 }, topRight: { x: 48.5, y: 59.3 }, bottomRight: { x: 48.7, y: 79.7 }, bottomLeft: { x: 14.5, y: 49.8 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 50.5, y: 59.4 }, topRight: { x: 84.7, y: 37.7 }, bottomRight: { x: 84, y: 54.7 }, bottomLeft: { x: 50.5, y: 79.4 } } },
        },
    },

    /* ── 플랫그리드 (상단 + 하단) ── */
    'FLAT_GRID': {
        image: '/covers/플랫그리드02.png',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 49.6, y: 35.6 }, topRight: { x: 92.5, y: 42.1 }, bottomRight: { x: 48.3, y: 50.9 }, bottomLeft: { x: 7.5, y: 42.3 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 7.4, y: 42.7 }, topRight: { x: 49.2, y: 51.5 }, bottomRight: { x: 49.1, y: 55.7 }, bottomLeft: { x: 7.3, y: 45.9 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 51, y: 51.3 }, topRight: { x: 93, y: 42.4 }, bottomRight: { x: 93.1, y: 45.8 }, bottomLeft: { x: 51.5, y: 55.6 } } },
        },
        lowerImage: '/covers/플랫그리드02.png',
        lowerCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 15.4, y: 32.2 }, topRight: { x: 20.1, y: 32.5 }, bottomRight: { x: 20.2, y: 36.8 }, bottomLeft: { x: 14.7, y: 36.2 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 6.4, y: 45.5 }, topRight: { x: 48.6, y: 55.7 }, bottomRight: { x: 48.7, y: 68.6 }, bottomLeft: { x: 6.6, y: 55.3 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 51.5, y: 55.8 }, topRight: { x: 93.1, y: 45.6 }, bottomRight: { x: 92.9, y: 55.8 }, bottomLeft: { x: 52, y: 68.1 } } },
        },
    },

    /* ── 오크트위드 (상단 + 하단) ── */
    'OAK_TWEED': {
        image: '/covers/오크트위드02.png',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 45, y: 21.3 }, topRight: { x: 91.3, y: 33 }, bottomRight: { x: 55.1, y: 51.9 }, bottomLeft: { x: 8, y: 33.7 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 7.7, y: 34.8 }, topRight: { x: 55, y: 52.4 }, bottomRight: { x: 55, y: 60.6 }, bottomLeft: { x: 7.8, y: 41 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 56.6, y: 52.3 }, topRight: { x: 91, y: 34.1 }, bottomRight: { x: 91.3, y: 40.6 }, bottomLeft: { x: 56.7, y: 60.7 } } },
        },
        lowerImage: '/covers/오크트위드02.png',
        lowerCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 21.7, y: 11.4 }, topRight: { x: 27.4, y: 11.9 }, bottomRight: { x: 27.6, y: 18.4 }, bottomLeft: { x: 21.9, y: 19.1 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 7.9, y: 41.1 }, topRight: { x: 54.2, y: 60.5 }, bottomRight: { x: 54.1, y: 79.3 }, bottomLeft: { x: 8.2, y: 55.2 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 55.9, y: 60.6 }, topRight: { x: 91.6, y: 40.1 }, bottomRight: { x: 90.8, y: 55.2 }, bottomLeft: { x: 55.9, y: 79.7 } } },
        },
    },

    /* ── 올케어 (상단 + 하단) ── */
    'ALL_CARE': {
        image: '/covers/올케어02.jpg',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 49.2, y: 31.8 }, topRight: { x: 93.9, y: 41.9 }, bottomRight: { x: 43, y: 53.2 }, bottomLeft: { x: 6.4, y: 36.8 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 5.9, y: 37.1 }, topRight: { x: 43.3, y: 52.6 }, bottomRight: { x: 42.9, y: 58.8 }, bottomLeft: { x: 5.6, y: 41.8 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 44.6, y: 52.3 }, topRight: { x: 94.5, y: 42 }, bottomRight: { x: 94.3, y: 47.2 }, bottomLeft: { x: 44.4, y: 58.9 } } },
        },
        lowerImage: '/covers/올케어02.jpg',
        lowerCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 4.4, y: 20.6 }, topRight: { x: 9.6, y: 20.9 }, bottomRight: { x: 10.1, y: 25.8 }, bottomLeft: { x: 4.1, y: 26.3 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 4.6, y: 41.2 }, topRight: { x: 42.2, y: 59.3 }, bottomRight: { x: 43.3, y: 71.2 }, bottomLeft: { x: 5.5, y: 50 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 42.9, y: 59.2 }, topRight: { x: 94.6, y: 46.8 }, bottomRight: { x: 94.2, y: 56.9 }, bottomLeft: { x: 43.3, y: 71.3 } } },
        },
    },

    /* ── i5 (상단 + 하단) ── */
    'I5': {
        image: '/covers/i502.jpg',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 49.2, y: 32.4 }, topRight: { x: 82.2, y: 39.4 }, bottomRight: { x: 48.5, y: 48.4 }, bottomLeft: { x: 16.3, y: 38.2 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 15.8, y: 37.9 }, topRight: { x: 48.5, y: 47.9 }, bottomRight: { x: 48.2, y: 55.3 }, bottomLeft: { x: 14.9, y: 44 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 48.8, y: 48 }, topRight: { x: 83, y: 39.2 }, bottomRight: { x: 83.2, y: 45.6 }, bottomLeft: { x: 48.8, y: 55.2 } } },
        },
        lowerImage: '/covers/i502.jpg',
        lowerCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 12, y: 11.9 }, topRight: { x: 15.9, y: 11.9 }, bottomRight: { x: 16.1, y: 19 }, bottomLeft: { x: 12, y: 19.1 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 15.1, y: 43.7 }, topRight: { x: 48, y: 55.3 }, bottomRight: { x: 48, y: 73 }, bottomLeft: { x: 15.4, y: 57.5 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 49, y: 54.7 }, topRight: { x: 83.7, y: 45.1 }, bottomRight: { x: 83.6, y: 59.4 }, bottomLeft: { x: 49, y: 72.8 } } },
        },
    },

    /* ── 젠틀브리즈 (상단 + 하단) ── */
    'GENTLE_BREED': {
        image: '/covers/젠틀브리즈02.jpg',
        upperCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 46.9, y: 33.2 }, topRight: { x: 94.4, y: 42.5 }, bottomRight: { x: 58.2, y: 60.7 }, bottomLeft: { x: 4.2, y: 48.3 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 3.8, y: 48.5 }, topRight: { x: 57.5, y: 60.5 }, bottomRight: { x: 57.3, y: 65.1 }, bottomLeft: { x: 4, y: 52.5 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 58.3, y: 61 }, topRight: { x: 94.3, y: 43 }, bottomRight: { x: 94.1, y: 46.7 }, bottomLeft: { x: 58.9, y: 65.2 } } },
        },
        lowerImage: '/covers/젠틀브리즈02.jpg',
        lowerCoords: {
            topSurface: { visible: true, corners: { topLeft: { x: 9.2, y: 26 }, topRight: { x: 15.3, y: 25.9 }, bottomRight: { x: 15, y: 35.5 }, bottomLeft: { x: 9.4, y: 35.1 } } },
            frontPanel: { visible: true, corners: { topLeft: { x: 4.3, y: 52.4 }, topRight: { x: 57.6, y: 65.2 }, bottomRight: { x: 57.5, y: 76.3 }, bottomLeft: { x: 4.9, y: 62.3 } } },
            sidePanel: { visible: true, corners: { topLeft: { x: 58.6, y: 65.3 }, topRight: { x: 93.8, y: 46.8 }, bottomRight: { x: 93.5, y: 55.7 }, bottomLeft: { x: 58.5, y: 76.4 } } },
        },
    },
};
