'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechReaderProps {
  autoPlay?: boolean
}

export default function SpeechReader({ autoPlay = false }: SpeechReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(autoPlay)
  const [mounted, setMounted] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true)
    }
  }, [])

  const getArticleText = useCallback(() => {
    if (typeof document === 'undefined') return ''

    // 获取文章正文内容
    const article = document.querySelector('article')
    if (!article) {
      // 尝试获取 prose 区域
      const prose = document.querySelector('.prose')
      return prose?.textContent?.trim() || ''
    }

    // 提取文章内容，排除导航、侧边栏等
    const proseContent = article.querySelector('.prose')
    if (proseContent) {
      return proseContent.textContent?.trim() || ''
    }

    return article.textContent?.trim() || ''
  }, [])

  const speak = useCallback(() => {
    if (!speechSupported || typeof window === 'undefined') return

    const synth = window.speechSynthesis

    // 如果正在播放，点击则停止
    if (isPlaying) {
      synth.cancel()
      setIsPlaying(false)
      setIsPaused(false)
      return
    }

    // 获取文章文本
    const text = getArticleText()
    if (!text) {
      console.warn('未找到文章内容')
      return
    }

    // 取消之前的朗读
    synth.cancel()

    // 创建新的朗读实例
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = rate
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error)
      setIsPlaying(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance

    // 某些浏览器需要延迟才能正常工作
    setTimeout(() => {
      synth.speak(utterance)
    }, 100)
  }, [speechSupported, isPlaying, rate, getArticleText])

  const togglePause = useCallback(() => {
    if (!speechSupported || typeof window === 'undefined') return

    const synth = window.speechSynthesis

    if (isPaused) {
      synth.resume()
      setIsPaused(false)
    } else {
      synth.pause()
      setIsPaused(true)
    }
  }, [speechSupported, isPaused])

  const stop = useCallback(() => {
    if (!speechSupported || typeof window === 'undefined') return

    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }, [speechSupported])

  const adjustRate = useCallback(
    (delta: number) => {
      const newRate = Math.max(0.5, Math.min(2, rate + delta))
      setRate(newRate)

      // 更新当前朗读的语速
      if (utteranceRef.current) {
        utteranceRef.current.rate = newRate
      }
    },
    [rate]
  )

  // 自动播放
  useEffect(() => {
    if (autoPlayEnabled && !isPlaying && mounted && speechSupported) {
      const timer = setTimeout(() => {
        speak()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [autoPlayEnabled, isPlaying, speak, mounted, speechSupported])

  // 组件卸载时停止朗读
  useEffect(() => {
    return () => {
      if (speechSupported && typeof window !== 'undefined') {
        window.speechSynthesis.cancel()
      }
    }
  }, [speechSupported])

  // 服务端渲染时不显示
  if (!mounted) return null

  // 浏览器不支持时不显示
  if (!speechSupported) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {/* 控制面板 */}
      <div
        className={`flex items-center gap-1.5 rounded-2xl border border-gray-200/50 bg-white/90 p-2.5 shadow-lg backdrop-blur-md transition-all duration-300 sm:gap-2 sm:p-3 dark:border-gray-700/50 dark:bg-gray-900/90 ${isExpanded ? 'min-w-[180px] sm:min-w-[200px]' : 'min-w-[48px] sm:min-w-[52px]'} hover:shadow-xl`}
      >
        {/* 语速控制 - 展开时显示 */}
        {isExpanded && (
          <>
            <button
              onClick={() => adjustRate(-0.1)}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100 sm:p-2 dark:hover:bg-gray-800"
              title="减慢语速"
              aria-label="减慢语速"
            >
              <svg
                className="h-3.5 w-3.5 text-gray-600 sm:h-4 sm:w-4 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <span className="min-w-[40px] text-center text-xs font-medium text-gray-700 sm:min-w-[48px] sm:text-sm dark:text-gray-300">
              {rate.toFixed(1)}x
            </span>

            <button
              onClick={() => adjustRate(0.1)}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100 sm:p-2 dark:hover:bg-gray-800"
              title="加快语速"
              aria-label="加快语速"
            >
              <svg
                className="h-3.5 w-3.5 text-gray-600 sm:h-4 sm:w-4 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </>
        )}

        {/* 播放/暂停按钮 */}
        {!isPlaying ? (
          <button
            onClick={speak}
            className="rounded-full bg-blue-500 p-2.5 text-white shadow-md transition-all hover:bg-blue-600 hover:shadow-lg sm:p-3"
            title="开始朗读"
            aria-label="开始朗读"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button
                onClick={togglePause}
                className="rounded-full bg-orange-500 p-2.5 text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg sm:p-3"
                title="暂停朗读"
                aria-label="暂停朗读"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={togglePause}
                className="rounded-full bg-green-500 p-2.5 text-white shadow-md transition-all hover:bg-green-600 hover:shadow-lg sm:p-3"
                title="继续朗读"
                aria-label="继续朗读"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}

            {/* 停止按钮 */}
            <button
              onClick={stop}
              className="rounded-full bg-red-500 p-2.5 text-white shadow-md transition-all hover:bg-red-600 hover:shadow-lg sm:p-3"
              title="停止朗读"
              aria-label="停止朗读"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
          </>
        )}

        {/* 展开/收起按钮 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full p-1.5 transition-colors hover:bg-gray-100 sm:p-2 dark:hover:bg-gray-800"
          title={isExpanded ? '收起控制' : '展开控制'}
          aria-label={isExpanded ? '收起控制' : '展开控制'}
        >
          <svg
            className={`h-3.5 w-3.5 text-gray-600 transition-transform sm:h-4 sm:w-4 dark:text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 自动播放开关 */}
      <div className="mt-1.5 flex items-center justify-center gap-1.5 sm:mt-2 sm:gap-2">
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-xs text-gray-500 sm:px-2 sm:py-1 dark:bg-gray-800/70 dark:text-gray-400">
          自动朗读
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
          <div className="peer h-4 w-7 rounded-full bg-gray-300 peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-400 peer-focus:outline-none after:absolute after:top-[1px] after:left-[1px] after:h-3.5 after:w-3.5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-3.5 peer-checked:after:border-white sm:h-5 sm:w-9 sm:after:top-[2px] sm:after:left-[2px] sm:after:h-4 sm:after:w-4 sm:peer-checked:after:translate-x-4 dark:bg-gray-600"></div>
        </label>
      </div>
    </div>
  )
}
