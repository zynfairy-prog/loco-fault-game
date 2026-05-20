export interface SpeakOptions {
  rate?: number
  pitch?: number
  volume?: number
  onEnd?: () => void
}

class SpeechManager {
  private synth = window.speechSynthesis
  private enabled = true

  speak(text: string, options: SpeakOptions = {}) {
    if (!this.enabled || !text.trim()) return
    this.stop()

    const cleanText = this.cleanText(text)
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'zh-CN'
    utterance.rate = options.rate ?? 1.1
    utterance.pitch = options.pitch ?? 1
    utterance.volume = options.volume ?? 1

    const voices = this.synth.getVoices()
    const chineseVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('zh') &&
          (v.name.includes('女') || v.name.includes('Xiaoxiao') || v.name.includes('Yunxi'))
      ) || voices.find((v) => v.lang.startsWith('zh'))
    if (chineseVoice) utterance.voice = chineseVoice

    utterance.onend = () => options.onEnd?.()
    this.synth.speak(utterance)
  }

  stop() {
    if (this.synth.speaking) this.synth.cancel()
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) this.stop()
  }

  isEnabled() {
    return this.enabled
  }

  isSpeaking() {
    return this.synth.speaking
  }

  private cleanText(text: string): string {
    return text
      .replace(/[#*_~`]/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/^\s*[-•·]\s*/gm, '')
      .replace(/\n{2,}/g, '。')
      .replace(/\n/g, '，')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

export const speechManager = new SpeechManager()

if (typeof window !== 'undefined') {
  window.speechSynthesis.onvoiceschanged = () => {}
}
