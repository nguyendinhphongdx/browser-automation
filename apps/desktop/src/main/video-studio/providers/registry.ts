import { getSetting } from '../../services/settings-service'
import { createKlingProvider } from './kling-provider'
import { createRunwayProvider } from './runway-provider'
import { createComfyUIProvider } from './comfyui-provider'
import { createOpenAIImageProvider } from './openai-image-provider'
import { createFluxProvider } from './flux-provider'
import { createElevenLabsProvider } from './elevenlabs-provider'
import { createOpenAITTSProvider } from './openai-tts-provider'
import { createGoogleTTSProvider } from './google-tts-provider'
import type { VideoProvider, TTSProvider } from './types'

export function getVideoProvider(name: string): VideoProvider {
  switch (name) {
    case 'kling': {
      const accessKey = getSetting('videoStudio.kling.accessKey')
      const secretKey = getSetting('videoStudio.kling.secretKey')
      if (!accessKey || !secretKey) throw new Error('Chưa cấu hình Kling Access Key/Secret Key trong Cài đặt')
      return createKlingProvider(accessKey, secretKey)
    }
    case 'runway': {
      const apiKey = getSetting('videoStudio.runway.apiKey')
      if (!apiKey) throw new Error('Chưa cấu hình Runway API Key trong Cài đặt')
      return createRunwayProvider(apiKey)
    }
    case 'comfyui': {
      const baseUrl = getSetting('videoStudio.comfyui.baseUrl') || 'http://127.0.0.1:8188'
      return createComfyUIProvider(baseUrl)
    }
    case 'openai-image': {
      const dedicated = getSetting('videoStudio.openaiImage.apiKey')
      const aiProvider = getSetting('ai.provider')
      const fallback = aiProvider === 'openai' ? getSetting('ai.apiKey') : null
      const apiKey = dedicated || fallback
      if (!apiKey) throw new Error('Chưa cấu hình OpenAI API Key cho tạo ảnh trong Cài đặt')
      return createOpenAIImageProvider(apiKey)
    }
    case 'flux': {
      const apiKey = getSetting('videoStudio.flux.apiKey')
      if (!apiKey) throw new Error('Chưa cấu hình FLUX API Key trong Cài đặt')
      return createFluxProvider(apiKey)
    }
    default:
      throw new Error(`Video provider không hợp lệ: "${name}"`)
  }
}

export function getTTSProvider(name: string): TTSProvider {
  switch (name) {
    case 'elevenlabs': {
      const apiKey = getSetting('videoStudio.elevenlabs.apiKey')
      if (!apiKey) throw new Error('Chưa cấu hình ElevenLabs API Key trong Cài đặt')
      return createElevenLabsProvider(apiKey)
    }
    case 'openai-tts': {
      // Tái dùng ai.apiKey nếu người dùng đã cấu hình OpenAI cho AI Agent —
      // chỉ bắt nhập riêng khi provider AI Agent hiện tại không phải OpenAI.
      const dedicated = getSetting('videoStudio.openaiTts.apiKey')
      const aiProvider = getSetting('ai.provider')
      const fallback = aiProvider === 'openai' ? getSetting('ai.apiKey') : null
      const apiKey = dedicated || fallback
      if (!apiKey) throw new Error('Chưa cấu hình OpenAI API Key cho TTS trong Cài đặt')
      return createOpenAITTSProvider(apiKey)
    }
    case 'google-tts': {
      const apiKey = getSetting('videoStudio.googleTts.apiKey')
      if (!apiKey) throw new Error('Chưa cấu hình Google TTS API Key trong Cài đặt')
      return createGoogleTTSProvider(apiKey)
    }
    default:
      throw new Error(`TTS provider không hợp lệ: "${name}"`)
  }
}
