'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import anssilLogo from '../../resource/ANSSil_logo_final_B.png'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)
        setMessage(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setErrorMsg(error.message)
            setLoading(false)
            return
        }

        router.push('/builder')
        router.refresh()
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)
        setMessage(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            setErrorMsg(error.message)
        } else {
            setMessage('계정 생성이 요청되었습니다! (이메일 확인 필요)')
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 p-8">
                <div className="flex justify-center mb-8">
                    <Image src={anssilLogo} alt="ANSSil Logo" width={140} height={40} className="object-contain" />
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">직원 인증 (Agent Login)</h2>
                    <p className="text-sm text-slate-500 mt-2">사내 매트리스 전용 에이전트에 접근합니다.</p>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">사내 이메일 (Email)</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                            placeholder="name@anssil.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">비밀번호 (Password)</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900"
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">{errorMsg}</div>}
                    {message && <div className="p-3 bg-green-50 text-green-600 text-sm font-medium rounded-lg border border-green-100">{message}</div>}

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            type="submit"
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? '인증 중...' : '로그인 (Login)'}
                        </button>

                        <button
                            type="button"
                            onClick={handleSignUp}
                            disabled={loading}
                            className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-70"
                        >
                            새 직원 계정 만들기 (Sign Up)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
