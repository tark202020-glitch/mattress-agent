/* eslint-disable @next/next/no-img-element */
import { BrochureData } from '../../types/brochure';

export default function Page2({ data }: { data: BrochureData }) {
    const { specs, images } = data;

    return (
        <div className="w-full h-full bg-zinc-50 flex overflow-hidden">

            {/* Left Column (30%): Specifications & Detail Image */}
            <div className="w-[30%] h-full flex flex-col bg-white border-r border-zinc-200">
                {/* Detail Feature Image (Top) */}
                <div className="h-[35%] bg-zinc-100 overflow-hidden relative">
                    <img
                        src={images.page2_detail}
                        alt="Detail Feature View"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-blue-900 px-6 py-3 font-bold text-white tracking-widest text-lg shadow-sm">
                        SPECIFICATIONS
                    </div>
                </div>

                {/* Specs Table (Bottom) */}
                <div className="p-12 flex-1 flex flex-col justify-center">
                    <table className="w-full text-base text-left">
                        <tbody className="divide-y divide-zinc-200">
                            <tr>
                                <td className="py-5 font-bold text-blue-900 w-32 uppercase tracking-wide">Product</td>
                                <td className="py-5 text-gray-800 font-medium">{specs.productName}</td>
                            </tr>
                            <tr>
                                <td className="py-5 font-bold text-blue-900 uppercase tracking-wide">Structure</td>
                                <td className="py-5 text-gray-800">{specs.structure}</td>
                            </tr>
                            <tr>
                                <td className="py-5 font-bold text-blue-900 uppercase tracking-wide">Hardness</td>
                                <td className="py-5 text-gray-800">{specs.hardness}</td>
                            </tr>
                            <tr>
                                <td className="py-5 font-bold text-blue-900 uppercase tracking-wide">Fabric</td>
                                <td className="py-5 text-gray-800">{specs.fabric}</td>
                            </tr>
                            <tr>
                                <td className="py-5 font-bold text-blue-900 uppercase tracking-wide align-top">Features</td>
                                <td className="py-5 text-gray-600 text-sm leading-relaxed">
                                    <span className="font-semibold text-gray-800">{specs.certifications.join(', ')} Certified</span><br />
                                    Anti-microbial treated<br />
                                    Dust-mite resistant
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Center Column (50%): Exploded Layer View */}
            <div className="w-[50%] h-full bg-zinc-50 p-16 flex flex-col relative justify-center items-center">

                <h3 className="absolute top-16 left-16 text-4xl font-light text-blue-900 tracking-wider">
                    LAYER <span className="font-bold">STRUCTURE</span>
                </h3>

                <div className="flex-1 w-full flex items-center justify-center relative mt-20">
                    <img
                        src={images.page2_layer}
                        alt="Mattress Layer Structure"
                        className="w-[85%] object-contain drop-shadow-2xl z-10 hover:scale-[1.02] transition-transform duration-700"
                    />

                    {/* Example Labels for Layers - Visual Decor */}
                    <div className="absolute left-0 top-1/4 space-y-24 text-sm text-gray-500 font-medium font-serif tracking-wide border-l border-blue-200 pl-4">
                        <div className="flex items-center gap-3 relative before:content-[''] before:absolute before:w-16 before:h-px before:bg-blue-300 before:-left-20">
                            <span className="w-2 h-2 bg-blue-600 rounded-full" /> Memory Foam Layer
                        </div>
                        <div className="flex items-center gap-3 relative before:content-[''] before:absolute before:w-16 before:h-px before:bg-blue-300 before:-left-20">
                            <span className="w-2 h-2 bg-blue-600 rounded-full" /> Transition Guard Foam
                        </div>
                        <div className="flex items-center gap-3 relative before:content-[''] before:absolute before:w-16 before:h-px before:bg-blue-300 before:-left-20">
                            <span className="w-2 h-2 bg-blue-600 rounded-full" /> Air String Core
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-16 right-16 text-right">
                    <p className="text-gray-400 font-serif italic max-w-sm text-sm">
                        *The internal layer structure may vary slightly depending on the specific custom dimensions and firmness selected.
                    </p>
                </div>
            </div>

            {/* Right Column (20%): Extra Features & Badges */}
            <div className="w-[20%] h-full flex flex-col bg-white border-l border-zinc-200 p-12 justify-between">

                {/* Top: Controller / Extra Image */}
                <div className="flex flex-col items-center">
                    <h4 className="text-sm font-bold text-gray-500 tracking-widest uppercase mb-6 w-full text-center border-b border-gray-200 pb-4">
                        Smart Logic
                    </h4>
                    <div className="w-full aspect-square bg-white rounded-xl shadow-lg p-2 flex items-center justify-center overflow-hidden border border-gray-100">
                        <img
                            src={images.page2_extra}
                            alt="Controller/Extra Feature"
                            className="w-full h-full object-cover rounded-lg"
                        />
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-4 leading-relaxed">
                        IoT Smart Controller included for precise comfort management.
                    </p>
                </div>

                {/* Bottom: Certifications (Vertical Stack) */}
                <div className="flex flex-col gap-8 w-full">
                    <h4 className="text-sm font-bold text-gray-500 tracking-widest uppercase w-full text-center border-b border-gray-200 pb-4">
                        Certifications
                    </h4>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 shrink-0 bg-blue-50 rounded-full flex items-center justify-center text-sm font-bold text-blue-900 border border-blue-100">
                            KFI
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Flame Retardant</p>
                            <p className="text-xs text-gray-500">Jacquard Fabric</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 shrink-0 bg-blue-50 rounded-full flex items-center justify-center text-sm font-bold text-blue-900 border border-blue-100">
                            ECO
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Eco-Friendly</p>
                            <p className="text-xs text-gray-500">Non-toxic Materials</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 shrink-0 bg-blue-50 rounded-full flex items-center justify-center text-sm font-bold text-blue-900 border border-blue-100">
                            10Y
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Durability</p>
                            <p className="text-xs text-gray-500">10-Year Warranty</p>
                        </div>
                    </div>
                </div>

                {/* Page Number */}
                <div className="pt-8 text-center text-gray-400 font-serif text-xl border-t border-gray-200 w-full">
                    02
                </div>

            </div>
        </div>
    );
}
