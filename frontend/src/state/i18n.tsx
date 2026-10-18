// Translation: every visible string goes through t(). In English t() returns the text as-is.
// In another language, t() returns the cached translation, or the English text while it collects
// the missing strings and asks the backend (Ollama) for them in one batch. The original
// messages and claims are never changed, only what's displayed.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, apiAvailable, errorMessage } from '../api'
import { useWorkspace } from './workspace'

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'tl', name: 'Tagalog', native: 'Tagalog' },
  { code: 'ko', name: 'Korean', native: '한국어' },
] as const
export type LangCode = (typeof LANGUAGES)[number]['code']

interface I18n {
  lang: LangCode
  setLang: (lang: LangCode) => void
  t: (text: string) => string
  translating: boolean
}

const Ctx = createContext<I18n>({ lang: 'en', setLang: () => {}, t: (s) => s, translating: false })

const readLang = (): LangCode => {
  try {
    const v = localStorage.getItem('accord-lang')
    return (LANGUAGES.find((l) => l.code === v)?.code ?? 'en') as LangCode
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { view, toast } = useWorkspace()
  const [lang, setLangState] = useState<LangCode>(readLang)
  const [version, setVersion] = useState(0)
  const [inflight, setInflight] = useState(0)
  const cache = useRef<Record<string, Map<string, string>>>({})
  const pending = useRef<Set<string>>(new Set())
  const requested = useRef<Set<string>>(new Set())
  const timer = useRef<number | null>(null)
  const langRef = useRef(lang)
  langRef.current = lang

  const setLang = useCallback((code: LangCode) => {
    setLangState(code)
    try {
      localStorage.setItem('accord-lang', code)
    } catch {
      /* private window: just don't remember it */
    }
  }, [])

  const flush = useCallback(async () => {
    timer.current = null
    const target = langRef.current
    if (target === 'en') return
    const texts = [...pending.current].filter((s) => !requested.current.has(`${target}|${s}`))
    pending.current.clear()
    if (texts.length === 0) return
    texts.forEach((s) => requested.current.add(`${target}|${s}`))
    setInflight((n) => n + 1)
    try {
      for (let i = 0; i < texts.length; i += 80) {
        const chunk = texts.slice(i, i + 80)
        const res = await api.post<{ translations: string[] }>('/translate', { language: target, texts: chunk })
        const map = (cache.current[target] ??= new Map())
        chunk.forEach((s, j) => map.set(s, res.translations[j] ?? s))
        setVersion((v) => v + 1)
      }
    } catch (err) {
      texts.forEach((s) => requested.current.delete(`${target}|${s}`))
      toast(`Couldn't translate: ${errorMessage(err)}`, 'error')
      setLang('en')
    } finally {
      setInflight((n) => n - 1)
    }
  }, [toast, setLang])

  const queue = useCallback(
    (s: string) => {
      pending.current.add(s)
      if (timer.current === null) timer.current = window.setTimeout(flush, 40)
    },
    [flush],
  )

  const t = useCallback(
    (text: string) => {
      if (lang === 'en' || !text || !text.trim() || !/[A-Za-z]/.test(text)) return text
      const hit = cache.current[lang]?.get(text)
      if (hit !== undefined) return hit
      if (apiAvailable) queue(text)
      return text
    },
    // version: re-create t (and re-render readers) when new translations arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, version, queue],
  )

  // Without a backend there's nothing to translate with
  useEffect(() => {
    if (lang !== 'en' && !apiAvailable) {
      toast('Translation needs the Accord backend and Ollama running.', 'error')
      setLang('en')
    }
  }, [lang, toast, setLang])

  // Fetch the whole conversation content up front, so opening a topic is already translated
  useEffect(() => {
    if (lang === 'en' || !apiAvailable) return
    const all = [
      ...view.topics.map((x) => x.title),
      ...view.claims.flatMap((c) => [c.text, c.answer ?? '']),
      ...view.messages.map((m) => m.content),
    ]
    all.forEach((s) => s && /[A-Za-z]/.test(s) && !cache.current[lang]?.has(s) && queue(s))
  }, [lang, view, queue])

  // Screen readers and the browser need the page language (and direction for Arabic)
  useEffect(() => {
    const info = LANGUAGES.find((l) => l.code === lang)
    document.documentElement.lang = lang
    document.documentElement.dir = info && 'rtl' in info && info.rtl ? 'rtl' : 'ltr'
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t, translating: inflight > 0 }), [lang, setLang, t, inflight])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
