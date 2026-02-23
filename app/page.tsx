import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-slate-200 selection:text-slate-900">

      {/* ── GLOBAL NOISE/DOT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <div className="relative z-10 p-4 sm:p-8 md:p-12">
        {/* ── HEADER ── */}
        <header className="flex justify-between items-center w-full max-w-6xl mx-auto mb-4 pb-6 border-b border-slate-300">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-white border border-slate-800 flex items-center justify-center p-1.5">
              <Image src="/icon.png" alt="ANSSil Logo" width={32} height={32} className="object-contain" />
            </div>
            <h1 className="text-2xl md:text-[1.75rem] font-mono tracking-tight uppercase font-medium text-slate-800">
              ANSSil <span className="font-light">Agent</span>
            </h1>
          </div>
          <div>
            <Link href="/builder">
              <button className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-800 px-6 py-2.5 transition-colors text-[0.8rem] tracking-[0.1em] font-mono uppercase flex items-center gap-2">
                Launch
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </Link>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="w-full max-w-6xl mx-auto flex flex-col gap-4">

          {/* HERO SECTION */}
          <div className="bg-white border border-slate-300 shadow-sm flex flex-col md:flex-row relative overflow-hidden">
            <div className="flex-1 p-8 md:p-14 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-300 relative z-10 bg-white">

              <div className="font-mono text-[0.65rem] text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse border border-green-700"></span>
                Internal Tool Manual
              </div>

              <h2 className="text-[3rem] md:text-[4.5rem] font-sans font-semibold leading-[1.1] text-slate-900 tracking-tighter mb-14 pb-2">
                Automate from design<br />
                to manufacturing.
              </h2>

              <p className="text-[0.95rem] text-slate-700 max-w-xl leading-[1.8] font-medium mb-12">
                사내 업무 환경을 고도화하는 스마트 설계 도구입니다. 규격을 입력하고 옵션을 고르면 실시간 도면과 3D 뷰가 생성되며, 클릭 한 번으로 제조 공장 및 파트너사에게 전달할 문서가 자동 산출됩니다.
              </p>

              <div className="flex items-center gap-4 font-mono">
                <Link href="/builder">
                  <button className="bg-slate-900 text-white px-8 py-4 text-xs tracking-[0.15em] font-bold uppercase hover:bg-slate-800 transition-colors border border-slate-900 flex items-center gap-3">
                    {`> GET STARTED`}
                  </button>
                </Link>
              </div>
            </div>

            {/* Hero Visual abstraction */}
            <div className="w-full md:w-5/12 min-h-[400px] bg-[#FAFAFA] border-t md:border-t-0 p-6 flex items-center justify-center relative overflow-hidden">
              {/* Decorative background grid in the visual area */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <div className="relative w-full aspect-[4/5] border border-slate-300 shadow-sm bg-white overflow-hidden p-2 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                <img
                  src="/images/2d-drawing.png"
                  alt="2D Drawing Preview"
                  className="object-contain w-full h-full p-2"
                />
              </div>
            </div>
          </div>

          {/* BENTO GRID (Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr">

            {/* Card 1: Customization */}
            <div className="bg-white border border-slate-300 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="p-5 border-b border-slate-200 bg-white">
                <h3 className="font-mono text-[0.8rem] uppercase tracking-[0.15em] font-semibold text-slate-800">FULL CUSTOMIZATION</h3>
              </div>
              <div className="p-8 md:p-10 flex-1 flex flex-col">
                <p className="text-slate-600 text-[0.95rem] font-medium leading-[1.8] mb-10">
                  사이즈, 폼, 스트링 코어, 커버 디자인, 컨트롤러, 포장 및 배송까지. 7가지 모든 스텝을 직관적인 UI를 통해 정확하게 설정합니다.
                </p>
                <div className="mt-auto flex flex-col gap-3">
                  {['Size & Spec', 'String Core', 'Cover Material', 'Controller Type', 'Packaging'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 font-mono text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 bg-slate-300 group-hover:bg-slate-800 transition-colors"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: 3D Preview */}
            <div className="bg-white border border-slate-300 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="p-5 border-b border-slate-200 bg-white">
                <h3 className="font-mono text-[0.8rem] uppercase tracking-[0.15em] font-semibold text-slate-800">REAL-TIME 2D & 3D PREVIEW</h3>
              </div>
              <div className="p-8 md:p-10 flex-1 flex flex-col">
                <p className="text-slate-600 text-[0.95rem] font-medium leading-[1.8] mb-10">
                  옵션을 변경할 때마다 즉시 반영되는 평면 도면과 3D 모델링 뷰어를 통해 제품의 최종 형태를 시각적으로 즉각 검증할 수 있습니다.
                </p>
                <div className="mt-auto w-full aspect-video bg-[#FAFAFA] relative flex items-center justify-center overflow-hidden border-t border-slate-100 group-hover:bg-[#F3F4F6] transition-colors">
                  <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                  <img
                    src="/images/3d-preview.png"
                    alt="3D Mattress Preview"
                    className="object-contain w-full h-full p-4 relative z-10 group-hover:scale-105 transition-transform duration-500 saturate-[1.2] contrast-105 drop-shadow-md"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: AI Cover */}
            <div className="bg-white border border-slate-300 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="p-5 border-b border-slate-200 bg-white">
                <h3 className="font-mono text-[0.8rem] uppercase tracking-[0.15em] font-semibold text-slate-800">AI MATTRESS DESIGN</h3>
              </div>
              <div className="p-8 md:p-10 flex-1 flex flex-col">
                <p className="text-slate-600 text-[0.95rem] font-medium leading-[1.8] mb-10">
                  나노 바나나로 원하는 매트리스 디자인을 직접 할 수 있습니다.
                </p>
                <div className="mt-auto flex justify-center pb-4">
                  {/* Abstract jigsaw/AI shape */}
                  <div className="relative w-24 h-24">
                    <div className="absolute top-0 right-0 w-12 h-12 border border-slate-800 bg-[#E5E7EB]" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border border-slate-400 bg-slate-50"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border border-slate-800 bg-white flex items-center justify-center">
                      <span className="font-mono text-xs text-slate-400">+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Pricing */}
            <div className="bg-white border border-slate-300 shadow-sm flex flex-col md:col-span-2 relative overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-white">
                <h3 className="font-mono text-[0.8rem] uppercase tracking-[0.15em] font-semibold text-slate-800">REAL-TIME ESTIMATION</h3>
              </div>
              <div className="flex flex-col md:flex-row flex-1">
                <div className="p-8 md:p-10 md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-200">
                  <p className="text-slate-600 text-[0.95rem] font-medium leading-[1.8] mb-8">
                    등록된 컴포넌트 공식 단가를 분석하여 매트리스 옵션에 따른 정밀한 가격을 산출합니다. 변경 사항은 즉각적으로 반영됩니다.
                  </p>
                  <div className="mt-auto">
                    <div className="font-mono text-xs text-slate-400 mb-2">Cost Components</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">Material</span>
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">Labor</span>
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">Shipping</span>
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">+ Margin</span>
                    </div>
                  </div>
                </div>

                <div className="md:w-1/2 p-6 md:p-8 bg-[#FAFAFA] flex items-center justify-center relative">
                  {/* Receipt Graphic */}
                  <div className="w-full max-w-[220px] bg-white border border-slate-300 shadow-sm p-5 relative transform rotate-2 hover:rotate-0 transition-transform">
                    <div className="absolute -top-2 left-0 right-0 h-4 bg-white" style={{ clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)' }}></div>

                    <div className="font-mono text-center mb-4 text-xs text-slate-400 border-b border-dashed border-slate-300 pb-2">ESTIMATE</div>

                    <div className="space-y-2 font-mono text-xs text-slate-500 mb-4">
                      <div className="flex justify-between"><span>Core</span><span>$X.XX</span></div>
                      <div className="flex justify-between"><span>Cover</span><span>$X.XX</span></div>
                      <div className="flex justify-between"><span>Foam</span><span>$X.XX</span></div>
                    </div>

                    <div className="border-t border-slate-800 pt-2 flex justify-between font-mono font-bold text-slate-800">
                      <span>TOTAL</span>
                      <span>₩ 0.00</span>
                    </div>

                    <div className="absolute -bottom-2 left-0 right-0 h-4 bg-white" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Documents */}
            <div className="bg-white border border-slate-300 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="p-5 border-b border-slate-200 bg-white">
                <h3 className="font-mono text-[0.8rem] uppercase tracking-[0.15em] font-semibold text-slate-800">DOCUMENT AUTOMATION</h3>
              </div>
              <div className="p-8 md:p-10 flex-1 flex flex-col">
                <p className="text-slate-600 text-[0.95rem] font-medium leading-[1.8] mb-10">
                  버튼 하나로 공장용 개발요청서(PDF)와 영업 브로슈어/견적서(Excel)를 자동 다운로드합니다.
                </p>
                <div className="mt-auto flex justify-center gap-4">
                  {/* Document Icons */}
                  <div className="w-14 h-16 border border-slate-800 bg-white flex flex-col justify-between p-2 shadow-[4px_4px_0_0_rgba(203,213,225,0.5)] group-hover:-translate-y-1 transition-transform">
                    <div className="w-6 h-1 bg-red-400 mb-1"></div>
                    <div className="w-8 h-1 bg-slate-200 mb-1"></div>
                    <div className="w-4 h-1 bg-slate-200 mt-auto"></div>
                    <div className="text-[9px] font-mono font-bold text-slate-800 self-end mt-1">PDF</div>
                  </div>
                  <div className="w-14 h-16 border border-slate-800 bg-white flex flex-col justify-between p-2 shadow-[4px_4px_0_0_rgba(203,213,225,0.5)] group-hover:-translate-y-1 transition-transform delay-75">
                    <div className="w-6 h-1 bg-green-500 mb-1"></div>
                    <div className="grid grid-cols-2 gap-1 mb-1">
                      <div className="w-full h-1 bg-slate-200"></div><div className="w-full h-1 bg-slate-200"></div>
                      <div className="w-full h-1 bg-slate-200"></div><div className="w-full h-1 bg-slate-200"></div>
                    </div>
                    <div className="text-[9px] font-mono font-bold text-slate-800 self-end mt-auto pt-1">XLSX</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* SECURITY BANNER */}
          <div className="bg-white border border-slate-300 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 border border-slate-800 flex-shrink-0 flex items-center justify-center text-slate-800 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '4px 4px' }}>
                <svg className="w-5 h-5 bg-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                <h4 className="text-slate-900 font-mono font-bold tracking-widest uppercase mb-1">Security Notice (사내 전용 툴)</h4>
                <p className="text-slate-500 text-sm">이 시스템은 허가된 사내 계정으로만 접근이 가능합니다. 외부 유출 및 보안에 유의하세요.</p>
              </div>
            </div>
            <Link href="/builder" className="w-full sm:w-auto flex-shrink-0">
              <button className="w-full bg-white text-slate-900 px-8 py-3.5 border border-slate-800 text-sm font-mono tracking-widest uppercase transition-colors hover:bg-slate-50 flex items-center justify-center gap-2">
                Auth Login
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </Link>
          </div>
        </main>

        <footer className="w-full max-w-6xl mx-auto mt-4 pb-8 border-t border-slate-300 pt-8 flex justify-between items-center text-xs text-slate-500 font-mono tracking-widest uppercase">
          <span>&copy; {new Date().getFullYear()} ANSSil Project.</span>
          <span>Open source under Apache 2.0</span>
        </footer>
      </div>
    </div>
  );
}
