'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useOpenRouterModels, type OpenRouterModel } from '@/lib/hooks/use-openrouter-models'
import { Badge } from '@/components/ui/badge'

interface ModelSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  modelType: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text'
  provider: string
  disabled?: boolean
}

export function ModelSelector({ value, onValueChange, modelType, provider, disabled }: ModelSelectorProps) {
  const { data: models, isLoading, error } = useOpenRouterModels(modelType)

  // Limit to first 200 models for performance
  // Must be called before any conditional returns (React hooks rule)
  const displayModels = useMemo(() => {
    if (!models) return []
    return models.slice(0, 200)
  }, [models])

  // Only show selector for OpenRouter
  if (provider !== 'openrouter') {
    return null
  }

  const selectedModel = models?.find((model) => model.id === value)

  const formatModelName = (model: OpenRouterModel) => {
    // Extract provider name from model ID (e.g., "openai/gpt-4" -> "OpenAI")
    const parts = model.id.split('/')
    if (parts.length > 1) {
      const providerName = parts[0]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return `${providerName}: ${model.name}`
    }
    return model.name
  }

  const formatPrice = (price?: string) => {
    if (!price || price === '0') return null
    const num = parseFloat(price)
    if (num === 0) return null
    if (num >= 1) {
      return `$${num.toFixed(2)}/M`
    }
    return `$${num.toFixed(4)}/M`
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/20 bg-input/50">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading models...</span>
        </div>
      </div>
    )
  }

  if (error || !models || models.length === 0) {
    return (
      <div className="w-full">
        <Input
          value={value || ''}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Enter OpenRouter model ID (e.g., openai/gpt-4)"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {error ? 'Failed to load models. Enter model ID manually.' : 'No models available. Enter model ID manually.'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <Select value={value || ''} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full liquid-glass border-primary/20">
          <SelectValue placeholder="Select a model...">
            {selectedModel ? formatModelName(selectedModel) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[100] max-h-[400px]">
          {displayModels.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No models available
            </div>
          ) : (
            displayModels.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                className="py-2"
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-semibold text-sm">{formatModelName(model)}</span>
                    {model.pricing?.prompt && formatPrice(model.pricing.prompt) && (
                      <Badge variant="outline" className="text-xs shrink-0 border-primary/20">
                        {formatPrice(model.pricing.prompt)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {model.context_length && (
                      <span>{model.context_length.toLocaleString()} context</span>
                    )}
                    {model.pricing?.completion && formatPrice(model.pricing.completion) && (
                      <span>• {formatPrice(model.pricing.completion)}</span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {selectedModel && (
        <p className="text-xs text-muted-foreground">
          Model ID: <code className="text-primary font-mono text-xs">{selectedModel.id}</code>
        </p>
      )}
      {models.length > 200 && (
        <p className="text-xs text-muted-foreground">
          Showing first 200 models. Use search on{' '}
          <a
            href="https://openrouter.ai/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            OpenRouter
          </a>{' '}
          to find more.
        </p>
      )}
    </div>
  )
}

