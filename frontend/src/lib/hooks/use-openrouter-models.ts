import { useQuery } from '@tanstack/react-query'

export interface OpenRouterModel {
  id: string
  canonical_slug: string
  name: string
  description?: string
  context_length: number
  architecture?: {
    input_modalities: string[]
    output_modalities: string[]
    tokenizer: string
    instruct_type?: string | null
  }
  pricing?: {
    prompt?: string
    completion?: string
    request?: string
    image?: string
    web_search?: string
    internal_reasoning?: string
    input_cache_read?: string
    input_cache_write?: string
  }
  top_provider?: {
    context_length?: number
    max_completion_tokens?: number | null
    is_moderated?: boolean
  }
  per_request_limits?: {
    prompt_tokens?: string
    completion_tokens?: string
  } | null
  supported_parameters?: string[]
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

export function useOpenRouterModels(modelType?: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text') {
  return useQuery<OpenRouterModel[]>({
    queryKey: ['openrouter-models', modelType],
    queryFn: async () => {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Datara',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch OpenRouter models')
      }

      const data: OpenRouterModelsResponse = await response.json()
      
      let models = data.data || []

      // Filter by model type if specified
      if (modelType) {
        models = models.filter((model) => {
          const inputModalities = model.architecture?.input_modalities || []
          const outputModalities = model.architecture?.output_modalities || []
          const modelId = model.id.toLowerCase()
          const modelName = model.name.toLowerCase()
          
          switch (modelType) {
            case 'language':
              // Language models: text input/output, or multimodal with text output
              return (
                (inputModalities.includes('text') && outputModalities.includes('text')) ||
                (inputModalities.includes('image') && outputModalities.includes('text')) ||
                (inputModalities.includes('file') && outputModalities.includes('text'))
              )
            case 'embedding':
              // Embedding models: typically have "embedding" in name/id
              return (
                modelId.includes('embedding') ||
                modelName.includes('embedding') ||
                modelId.includes('embed') ||
                modelName.includes('embed')
              )
            case 'text_to_speech':
              // TTS models: audio output, or have "tts" in name/id
              return (
                outputModalities.includes('audio') ||
                modelId.includes('tts') ||
                modelName.includes('tts') ||
                modelId.includes('text-to-speech')
              )
            case 'speech_to_text':
              // STT models: audio input, or have "whisper" or "stt" in name/id
              return (
                inputModalities.includes('audio') ||
                modelId.includes('whisper') ||
                modelId.includes('stt') ||
                modelName.includes('whisper') ||
                modelName.includes('speech-to-text')
              )
            default:
              return true
          }
        })
      }

      // Sort by name
      return models.sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 2,
  })
}

