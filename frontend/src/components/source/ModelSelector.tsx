'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings2, Sparkles } from 'lucide-react'
import { useModelDefaults, useModels } from '@/lib/hooks/use-models'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ModelSelectorProps {
  currentModel?: string
  onModelChange: (model?: string) => void
  disabled?: boolean
}

export function ModelSelector({ 
  currentModel, 
  onModelChange,
  disabled = false 
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState(currentModel || 'default')
  const { data: models, isLoading } = useModels()
  const { data: defaults } = useModelDefaults()

  useEffect(() => {
    setSelectedModel(currentModel || 'default')
  }, [currentModel])

  // Filter for language models only and sort by name
  const languageModels = useMemo(() => {
    if (!models) {
      return []
    }
    const filtered = [...models]
      .filter((model) => model.type === 'language')
      .sort((a, b) => a.name.localeCompare(b.name))
    console.log('Language models:', filtered.length, filtered)
    return filtered
  }, [models])

  const defaultModel = useMemo(() => {
    if (!defaults?.default_chat_model) return undefined
    return languageModels.find(model => model.id === defaults.default_chat_model)
  }, [defaults?.default_chat_model, languageModels])

  const currentModelName = useMemo(() => {
    if (currentModel) {
      return languageModels.find(model => model.id === currentModel)?.name || currentModel
    }
    if (defaultModel) {
      return defaultModel.name
    }
    return 'Default Model'
  }, [currentModel, languageModels, defaultModel])

  const handleSave = () => {
    onModelChange(selectedModel === 'default' ? undefined : selectedModel)
    setOpen(false)
  }

  const handleReset = () => {
    setSelectedModel('default')
    onModelChange(undefined)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-xs">
            {currentModelName}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Model Configuration
          </DialogTitle>
          <DialogDescription>
            Override the default model for this chat session. Leave empty to use the system default.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select a model (or use default)" />
              </SelectTrigger>
              <SelectContent className="z-[200] max-h-[300px]">
                <SelectItem value="default">
                  {defaultModel ? `Default (${defaultModel.name})` : 'System Default'}
                  {defaultModel?.provider && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {defaultModel.provider}
                    </span>
                  )}
                </SelectItem>
                {isLoading ? (
                  <div className="flex items-center justify-center py-2 px-2">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : languageModels.length === 0 ? (
                  <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading models...' : 'No language models available. Add models in Settings → Models.'}
                  </div>
                ) : (
                  languageModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <span className="font-medium">{model.name}</span>
                      {model.provider && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({model.provider})
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedModel && selectedModel !== 'default' && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                This session will use <strong>{languageModels.find(m => m.id === selectedModel)?.name}</strong> instead of the default model.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
