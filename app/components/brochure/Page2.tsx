/* eslint-disable @next/next/no-img-element */
import { BrochureData } from '../../types/brochure';

export default function Page2({ data }: { data: BrochureData }) {
    const { specs, images } = data;

    return (
        <div className="w-full h-full bg-white flex overflow-hidden">

            {/* Left: Layer View (50%) */}
            <div className="w-1/2 h-full bg-gray-50 p-14 flex flex-col relative">
                <h3 className="text-xl font-bold text-blue-900 mb-6 border-b border-blue-200 pb-2 w-24">구조</h3>

                <div className="flex-1 flex items-center justify-center relative">
                    {/* 배경 그래픽 요소 (선) */}
                    <div className="absolute inset-0 border-l border-gray-200 ml-10 pointer-events-none opacity-50" />

                    <img
                        src={images.page2_layer}
                        alt="Mattress Layer Structure"
                        className="w-full object-contain max-h-[800px] drop-shadow-xl z-10"
                    />

                    {/* 레이어 라벨 (하드코딩된 위치 예시 - 실제로는 동적 계산 필요할 수 있음) */}
                    <div className="absolute left-4 top-1/4 space-y-12 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full" /> 상단 메모리폼 레이어
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full" /> 가드 폼
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full" /> 에어 스트링 코어
                        </div>
                    </div>
                </div>

                {/* 좌측 하단 이미지 (IoT 컨트롤러 등) */}
                <div className="absolute bottom-10 left-10 w-24 h-24 bg-white rounded-lg shadow-md p-2 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mb-2" />
                    <span className="text-[10px] text-gray-500 text-center">IoT Controller</span>
                </div>
            </div>

            {/* Right: Specs & Features (50%) */}
            <div className="w-1/2 h-full flex flex-col bg-white border-l border-gray-100">

                {/* Top Image */}
                <div className="h-[40%] bg-gray-100 overflow-hidden relative">
                    <img
                        src={images.page2_detail}
                        alt="Detail Feature View"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-white px-6 py-3 font-bold text-blue-900 text-lg shadow-sm">
                        사양
                    </div>
                </div>

                {/* Spec Table */}
                <div className="p-10 flex-1 flex flex-col">
                    <table className="w-full text-sm text-left mb-10">
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="py-3 font-bold text-blue-900 w-24">제품명</td>
                                <td className="py-3 text-gray-700">{specs.productName}</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-bold text-blue-900">구조</td>
                                <td className="py-3 text-gray-700">{specs.structure}</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-bold text-blue-900">경도</td>
                                <td className="py-3 text-gray-700">{specs.hardness}</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-bold text-blue-900">원단</td>
                                <td className="py-3 text-gray-700">{specs.fabric}</td>
                            </tr>
                            <tr>
                                <td className="py-3 font-bold text-blue-900">기능성</td>
                                <td className="py-3 text-gray-700 text-xs">
                                    {specs.certifications.join(', ')} 인증<br />
                                    항균 처리 완료, 진드기 방지
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="flex-1" />

                    {/* Bottom Icons (Certifications) */}
                    <div className="flex gap-4 justify-between pt-6 border-t border-gray-200">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">
                                KFI
                            </div>
                            <p className="text-[10px] text-gray-600 font-bold">방염 인증</p>
                            <p className="text-[8px] text-gray-400">자가드 원단</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">
                                Comfort
                            </div>
                            <p className="text-[10px] text-gray-600 font-bold">최적의 편안함</p>
                            <p className="text-[8px] text-gray-400">인체공학 설계</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">
                                Durability
                            </div>
                            <p className="text-[10px] text-gray-600 font-bold">내구성</p>
                            <p className="text-[8px] text-gray-400">10년 보증</p>
                        </div>
                    </div>

                    <div className="pt-8 text-right text-gray-400 text-xs">
                        02
                    </div>
                </div>
            </div>
        </div>
    );
}
