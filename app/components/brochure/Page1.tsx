/* eslint-disable @next/next/no-img-element */
import { BrochureData } from '../../types/brochure';

export default function Page1({ data }: { data: BrochureData }) {
    const { meta, images } = data;

    return (
        <div className="w-full h-full bg-white flex overflow-hidden">
            {/* Left: Main Image (50%) */}
            <div className="w-1/2 h-full bg-gray-100 relative">
                <img
                    src={images.page1_main}
                    alt="Mattress Main View"
                    className="w-full h-full object-cover"
                />
                {/* 오버레이 텍스트 (옵션 - 이미지 내부 텍스트 대신 HTML로 얹을 경우) */}
                {/* <div className="absolute top-10 left-10 text-white drop-shadow-lg">
          <h1 className="text-6xl font-light leading-tight">{meta.title}</h1>
        </div> */}
            </div>

            {/* Right: Content Panel (50%) */}
            <div className="w-1/2 h-full flex flex-col p-14 justify-between">

                {/* Top: Sub Image Area */}
                <div className="w-full aspect-[4/3] bg-gray-50 mb-8 overflow-hidden rounded-sm">
                    <img
                        src={images.page1_sub}
                        alt="Detail View"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    />
                </div>

                {/* Center: Title & Description */}
                <div className="flex-1 flex flex-col gap-6">
                    <div>
                        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-2">
                            {meta.title}
                        </h1>
                        <h2 className="text-2xl font-medium text-blue-800">
                            {meta.subtitle}
                        </h2>
                    </div>

                    <hr className="border-gray-300 w-full" />

                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {meta.description}
                    </p>
                </div>

                {/* Bottom: Spec Info */}
                <div className="mt-10 space-y-6">
                    {/* Colors */}
                    <div>
                        <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Color</h4>
                        <div className="flex gap-3">
                            {meta.colors.map((color, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div
                                        className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                    {/* 첫 번째 색상만 텍스트 표시 (대표 색상) */}
                                    {i === 0 && <span className="text-xs text-gray-500">Selected</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sizes */}
                    <div>
                        <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Available Sizes</h4>
                        <div className="flex gap-1 flex-wrap">
                            {meta.sizes.map((size) => (
                                <span
                                    key={size}
                                    className="px-2 py-1 border border-gray-300 text-[10px] text-gray-600 min-w-[30px] text-center"
                                >
                                    {size}
                                </span>
                            ))}
                            <span className="px-2 py-1 bg-blue-900 text-white text-[10px] min-w-[30px] text-center">
                                CUSTOM
                            </span>
                        </div>
                    </div>

                    {/* Page Number */}
                    <div className="pt-8 text-right text-gray-400 text-xs">
                        01
                    </div>
                </div>

            </div>
        </div>
    );
}
