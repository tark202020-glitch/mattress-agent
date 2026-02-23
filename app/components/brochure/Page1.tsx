/* eslint-disable @next/next/no-img-element */
import { BrochureData } from '../../types/brochure';

export default function Page1({ data }: { data: BrochureData }) {
    const { meta, images } = data;

    return (
        <div className="w-full h-full bg-white flex overflow-hidden">
            {/* Left: Main Image (65%) */}
            <div className="w-[65%] h-full bg-gray-100 relative">
                <img
                    src={images.page1_main}
                    alt="Mattress Main View"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Right: Content Panel (35%) - Magazine Style */}
            <div className="w-[35%] h-full flex flex-col p-16 justify-between bg-zinc-50 border-l border-zinc-200">

                {/* Top: Title & Description */}
                <div className="flex flex-col gap-8 mt-10">
                    <div>
                        <h2 className="text-3xl font-light text-blue-900 tracking-wide uppercase mb-3">
                            {meta.subtitle}
                        </h2>
                        <h1 className="text-7xl font-bold text-gray-900 leading-none tracking-tight">
                            {meta.title}
                        </h1>
                    </div>

                    <div className="w-16 h-1 bg-blue-900" />

                    <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap font-serif">
                        {meta.description}
                    </p>
                </div>

                {/* Center: Sub Image Area */}
                <div className="w-full aspect-video bg-gray-200 my-12 overflow-hidden shadow-md">
                    <img
                        src={images.page1_sub}
                        alt="Detail View"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                    />
                </div>

                {/* Bottom: Spec Info */}
                <div className="mt-4 space-y-8">
                    {/* Colors */}
                    <div className="flex items-center justify-between border-t border-zinc-300 pt-6">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Color</h4>
                        <div className="flex gap-4">
                            {meta.colors.map((color, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sizes */}
                    <div className="flex justify-between items-start border-t border-zinc-300 pt-6">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Available Sizes</h4>
                        <div className="flex gap-2 flex-wrap justify-end pl-10">
                            {meta.sizes.map((size) => (
                                <span
                                    key={size}
                                    className="px-3 py-1.5 border border-gray-300 text-xs text-gray-700 font-medium"
                                >
                                    {size}
                                </span>
                            ))}
                            <span className="px-3 py-1.5 bg-blue-900 text-white text-xs font-bold">
                                CUSTOM
                            </span>
                        </div>
                    </div>

                    {/* Page Number */}
                    <div className="pt-10 text-right text-gray-400 font-serif text-xl">
                        01
                    </div>
                </div>

            </div>
        </div>
    );
}
