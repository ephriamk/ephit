'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ModelDefaults, Model } from '@/lib/types/models'
import { useUpdateModelDefaults } from '@/lib/hooks/use-models'
import { AlertCircle, X } from 'lucide-react'
import { EmbeddingModelChangeDialog } from './EmbeddingModelChangeDialog'
import { motion } from 'framer-motion'

interface DefaultModelsSectionProps {
  models: Model[]
  defaults: ModelDefaults
}

interface DefaultConfig {
  key: keyof ModelDefaults
  label: string
  description: string
  modelType: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text'
  required?: boolean
}

const defaultConfigs: DefaultConfig[] = [
  {
    key: 'default_chat_model',
    label: 'Chat Model',
    description: 'Used for chat conversations',
    modelType: 'language',
    required: true
  },
  {
    key: 'default_transformation_model',
    label: 'Transformation Model',
    description: 'Used for summaries, insights, and transformations',
    modelType: 'language',
    required: true
  },
  {
    key: 'default_tools_model',
    label: 'Tools Model',
    description: 'Used for function calling - OpenAI or Anthropic recommended',
    modelType: 'language'
  },
  {
    key: 'large_context_model',
    label: 'Large Context Model',
    description: 'Used for processing large documents - Gemini recommended',
    modelType: 'language'
  },
  {
    key: 'default_embedding_model',
    label: 'Embedding Model',
    description: 'Used for semantic search and vector embeddings',
    modelType: 'embedding',
    required: true
  },
  {
    key: 'default_text_to_speech_model',
    label: 'Text-to-Speech Model',
    description: 'Used for podcast generation',
    modelType: 'text_to_speech'
  },
  {
    key: 'default_speech_to_text_model',
    label: 'Speech-to-Text Model',
    description: 'Used for audio transcription',
    modelType: 'speech_to_text'
  }
]

export function DefaultModelsSection({ models, defaults }: DefaultModelsSectionProps) {
  const updateDefaults = useUpdateModelDefaults()
  const { setValue, watch } = useForm<ModelDefaults>({
    defaultValues: defaults
  })

  // State for embedding model change dialog
  const [showEmbeddingDialog, setShowEmbeddingDialog] = useState(false)
  const [pendingEmbeddingChange, setPendingEmbeddingChange] = useState<{
    key: keyof ModelDefaults
    value: string
    oldModelId?: string
    newModelId?: string
  } | null>(null)

  // Update form when defaults change
  useEffect(() => {
    if (defaults) {
      Object.entries(defaults).forEach(([key, value]) => {
        setValue(key as keyof ModelDefaults, value)
      })
    }
  }, [defaults, setValue])

  const handleChange = (key: keyof ModelDefaults, value: string) => {
    // Special handling for embedding model changes
    if (key === 'default_embedding_model') {
      const currentEmbeddingModel = defaults[key]

      // Only show dialog if there's an existing embedding model and it's changing
      if (currentEmbeddingModel && currentEmbeddingModel !== value) {
        setPendingEmbeddingChange({
          key,
          value,
          oldModelId: currentEmbeddingModel,
          newModelId: value
        })
        setShowEmbeddingDialog(true)
        return
      }
    }

    // For all other changes or new embedding model assignment
    const newDefaults = { [key]: value || null }
    updateDefaults.mutate(newDefaults)
  }

  const handleConfirmEmbeddingChange = () => {
    if (pendingEmbeddingChange) {
      const newDefaults = {
        [pendingEmbeddingChange.key]: pendingEmbeddingChange.value || null
      }
      updateDefaults.mutate(newDefaults)
      setPendingEmbeddingChange(null)
    }
  }

  const handleCancelEmbeddingChange = () => {
    setPendingEmbeddingChange(null)
    setShowEmbeddingDialog(false)
  }

  const getModelsForType = (type: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text') => {
    return models.filter(model => model.type === type)
  }

  const missingRequired = defaultConfigs
    .filter(config => {
      if (!config.required) return false
      const value = defaults[config.key]
      if (!value) return true
      // Check if the model still exists
      const modelsOfType = models.filter(m => m.type === config.modelType)
      return !modelsOfType.some(m => m.id === value)
    })
    .map(config => config.label)

  return (
    <>
      <Card className="liquid-glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Default Model Assignments</CardTitle>
          <CardDescription className="mt-2 text-base">
            Configure which models to use for different purposes across Datara
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {missingRequired.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-foreground">
                  <strong>Missing required models:</strong> {missingRequired.join(', ')}. 
                  Datara may not function properly without these.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {defaultConfigs.map((config, index) => {
              const availableModels = getModelsForType(config.modelType)
              const currentValue = watch(config.key) || undefined
              
              // Check if the current value exists in available models
              const isValidModel = currentValue && availableModels.some(m => m.id === currentValue)
              const selectedModel = currentValue ? models.find(m => m.id === currentValue) : null

              return (
                <motion.div
                  key={config.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-card/50 to-card/30 border border-primary/10 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      {config.label}
                      {config.required && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-destructive/20 text-destructive border border-destructive/30">
                          Required
                        </span>
                      )}
                    </Label>
                    {selectedModel && (
                      <Badge variant="outline" className="text-xs">
                        {selectedModel.provider}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={currentValue || ""}
                      onValueChange={(value) => handleChange(config.key, value)}
                    >
                      <SelectTrigger className={
                        config.required && !isValidModel && availableModels.length > 0
                          ? 'border-destructive bg-destructive/10' 
                          : 'border-primary/20 bg-input/50'
                      }>
                        <SelectValue placeholder={
                          config.required && !isValidModel && availableModels.length > 0 
                            ? "⚠️ Required - Select a model"
                            : "Select a model"
                        } />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        {availableModels.sort((a, b) => a.name.localeCompare(b.name)).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {model.provider}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!config.required && currentValue && (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleChange(config.key, "")}
                          className="h-10 w-10 border border-primary/20 hover:border-destructive/30 hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
                </motion.div>
              )
            })}
          </div>

          <div className="pt-6 border-t border-primary/10">
            <a
              href="https://github.com/lfnovo/open-notebook/blob/main/docs/features/ai-models.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 group"
            >
              Which model should I choose?
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block"
              >
                →
              </motion.span>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Embedding Model Change Dialog */}
      <EmbeddingModelChangeDialog
        open={showEmbeddingDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelEmbeddingChange()
          }
        }}
        onConfirm={handleConfirmEmbeddingChange}
        oldModelName={
          pendingEmbeddingChange?.oldModelId
            ? models.find(m => m.id === pendingEmbeddingChange.oldModelId)?.name
            : undefined
        }
        newModelName={
          pendingEmbeddingChange?.newModelId
            ? models.find(m => m.id === pendingEmbeddingChange.newModelId)?.name
            : undefined
        }
      />
    </>
  )
}