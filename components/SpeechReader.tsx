'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechReaderProps {
  autoPlay?: boolean
}

export default function SpeechReader({ autoPlay = false }: SpeechReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(0.8)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(autoPlay)
  const [isClient, setIsClient] = useState(false)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const wordsRef = useRef<string[]>([])
  const wordElementsRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    setIsClient(true)
  }, [])

  const getArticleText = useCallback(() => {
    const article = document.querySelector('article')
    if (!article) return ''

    const textContent = article.textContent || ''
    return textContent.trim()
  }, [])

  const highlightWord = useCallback((index: number) => {
    wordElementsRef.current.forEach((el, i) => {
      if (el) {
        el.classList.toggle('bg-yellow-300 dark:bg-yellow-700', i === index)
        el.classList.toggle('text-yellow-900 dark:text-yellow-100', i === index)
      }
    })
    setCurrentWordIndex(index)
  }, [])

  const cleanupHighlight = useCallback(() => {
    wordElementsRef.current.forEach((el) => {
      if (el) {
        el.classList.remove('bg-yellow-300', 'dark:bg-yellow-700')
        el.classList.remove('text-yellow-900', 'dark:text-yellow-100')
      }
    })
    wordElementsRef.current = []
    setCurrentWordIndex(-1)
  }, [])

  const speak = useCallback(() => {
    if (!isClient || typeof window === 'undefined') return

    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel()
        setIsPlaying(false)
        setIsPaused(false)
        cleanupHighlight()
        return
      }

      const text = getArticleText()
      if (!text) return

      wordsRef.current = text.split(/\s+/).filter((w) => w.length > 0)

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = rate
      utterance.pitch = 1
      utterance.volume = 1

      let wordIndex = 0
      const startTime = Date.now()
      const avgWordTime = (1 / rate) * 1000 * 0.5

      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const elapsed = Date.now() - startTime
          wordIndex = Math.min(Math.floor(elapsed / avgWordTime), wordsRef.current.length - 1)
          highlightWord(wordIndex)
        }
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        cleanupHighlight()
      }

      utterance.onerror = () => {
        setIsPlaying(false)
        setIsPaused(false)
        cleanupHighlight()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }, [isClient, isPlaying, rate, getArticleText, highlightWord, cleanupHighlight])

  const togglePause = useCallback(() => {
    if (!isClient || typeof window === 'undefined') return

    if ('speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
      } else {
        window.speechSynthesis.pause()
        setIsPaused(true)
      }
    }
  }, [isClient, isPaused])

  const stop = useCallback(() => {
    if (!isClient || typeof window === 'undefined') return

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      setIsPaused(false)
      cleanupHighlight()
    }
  }, [isClient, cleanupHighlight])

  const adjustRate = useCallback(
    (delta: number) => {
      const newRate = Math.max(0.3, Math.min(2, rate + delta))
      setRate(newRate)

      if (utteranceRef.current) {
        utteranceRef.current.rate = newRate
      }
    },
    [rate]
  )

  useEffect(() => {
    if (autoPlayEnabled && !isPlaying && isClient) {
      const timer = setTimeout(() => {
        speak()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoPlayEnabled, isPlaying, speak, isClient])

  useEffect(() => {
    return () => {
      if (isClient && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isClient])

  if (!isClient || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  return (
    <>
      <div className="prose dark:prose-invert hidden max-w-none">
        <span className="sr-only">
          {getArticleText()
            .split(/\s+/)
            .map((word, index) => (
              <span
                key={index}
                ref={(el) => {
                  if (el) wordElementsRef.current[index] = el
                }}
                className="whitespace-pre-wrap"
              >
                {word}{' '}
              </span>
            ))}
        </span>
      </div>

      <div className="fixed right-6 bottom-6 z-50">
        <div
          className={`flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/80 p-3 shadow-xl backdrop-blur-lg transition-all duration-300 ease-out dark:border-gray-700 dark:bg-gray-800/80 ${isExpanded ? 'min-w-[200px]' : 'min-w-[52px]'} hover:scale-105 hover:shadow-2xl`}
        >
          {isExpanded && (
            <>
              <button
                onClick={() => adjustRate(-0.1)}
                className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                title="减慢语速"
                aria-label="减慢语速"
              >
                <svg
                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </button>

              <span className="min-w-[48px] text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                {rate.toFixed(1)}x
              </span>

              <button
                onClick={() => adjustRate(0.1)}
                className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                title="加快语速"
                aria-label="加快语速"
              >
                <svg
                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v3m0 0v3m0-3h3m-3 0h-3m2-5a4 4 0 11-8 0 4 4 0 018 0zM5 20a6 6 0 0112 0v1H5v-1z"
                  />
                </svg>
              </button>
            </>
          )}

          {!isPlaying ? (
            <button
              onClick={speak}
              className="rounded-full bg-blue-500 p-3 text-white shadow-lg transition-all hover:bg-blue-600 hover:shadow-blue-200 dark:hover:shadow-blue-900/50"
              title="开始朗读"
              aria-label="开始朗读"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={togglePause}
                  className="rounded-full bg-orange-500 p-3 text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-orange-200 dark:hover:shadow-orange-900/50"
                  title="暂停朗读"
                  aria-label="暂停朗读"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={togglePause}
                  className="rounded-full bg-green-500 p-3 text-white shadow-lg transition-all hover:bg-green-600 hover:shadow-green-200 dark:hover:shadow-green-900/50"
                  title="继续朗读"
                  aria-label="继续朗读"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              )}

              <button
                onClick={stop}
                className="rounded-full bg-red-500 p-3 text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-red-200 dark:hover:shadow-red-900/50"
                title="停止朗读"
                aria-label="停止朗读"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
            </>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isExpanded ? '收起控制' : '展开控制'}
            aria-label={isExpanded ? '收起控制' : '展开控制'}
          >
            <svg
              className={`h-4 w-4 text-gray-600 transition-transform dark:text-gray-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="rounded-full bg-white/60 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            朗读
          </span>
          <label
            htmlFor="auto-play-toggle"
            className="relative inline-flex cursor-pointer items-center"
          >
            <input
              id="auto-play-toggle"
              type="checkbox"
              checked={autoPlayEnabled}
              onChange={(e) => setAutoPlayEnabled(e.target.checked)}
              className="peer sr-only"
              aria-label="自动播放开关"
            />
            <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
          </label>
          <span className="rounded-full bg-white/60 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            自动播放
          </span>
        </div>
      </div>
    </>
  )
}
