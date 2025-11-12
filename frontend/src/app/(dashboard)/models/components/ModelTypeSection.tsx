'use client'

import { Model, ProviderAvailability } from '@/lib/types/models'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddModelForm } from './AddModelForm'
import { Bot, Mic, Volume2, Search, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useDeleteModel } from '@/lib/hooks/use-models'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModelTypeSectionProps {
  type: 'language' | 'embedding' | 'text_to_speech' | 'speech_to_text'
  models: Model[]
  providers: ProviderAvailability
  isLoading: boolean
}

const COLLAPSED_ITEM_COUNT = 5

export function ModelTypeSection({ type, models, providers, isLoading }: ModelTypeSectionProps) {
  const [deleteModel, setDeleteModel] = useState<Model | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const deleteModelMutation = useDeleteModel()

  const getTypeInfo = () => {
    switch (type) {
      case 'language':
        return {
          title: 'Language Models',
          description: 'Chat, transformations, and text generation',
          icon: Bot,
          iconColor: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30'
        }
      case 'embedding':
        return {
          title: 'Embedding Models',
          description: 'Semantic search and vector embeddings',
          icon: Search,
          iconColor: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30'
        }
      case 'text_to_speech':
        return {
          title: 'Text-to-Speech',
          description: 'Generate audio from text',
          icon: Volume2,
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-500/30'
        }
      case 'speech_to_text':
        return {
          title: 'Speech-to-Text',
          description: 'Transcribe audio to text',
          icon: Mic,
          iconColor: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-500/30'
        }
    }
  }

  const { title, description, icon: Icon, iconColor, bgColor, borderColor } = getTypeInfo()
  
  // Filter and sort models
  const filteredModels = useMemo(() => {
    let filtered = models.filter(model => model.type === type)
    
    // Apply provider filter if selected
    if (selectedProvider) {
      filtered = filtered.filter(model => model.provider === selectedProvider)
    }
    
    // Sort by name alphabetically
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [models, type, selectedProvider])

  // Get unique providers for this model type
  const modelProviders = useMemo(() => {
    const typeModels = models.filter(model => model.type === type)
    const uniqueProviders = [...new Set(typeModels.map(m => m.provider))]
    return uniqueProviders.sort()
  }, [models, type])

  const handleDelete = () => {
    if (deleteModel) {
      deleteModelMutation.mutate(deleteModel.id)
      setDeleteModel(null)
    }
  }

  return (
    <>
      <Card className="h-full liquid-glass border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <motion.div 
                className={`rounded-xl p-3 ${bgColor} border ${borderColor}`}
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-bold">{title}</CardTitle>
                <CardDescription className="text-xs mt-1">{description}</CardDescription>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AddModelForm modelType={type} providers={providers} />
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Provider filter badges */}
          {modelProviders.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge
                variant={selectedProvider === null ? "default" : "outline"}
                className={`cursor-pointer text-xs transition-all ${
                  selectedProvider === null 
                    ? 'bg-primary/20 text-primary border-primary/30' 
                    : 'hover:bg-primary/10'
                }`}
                onClick={() => setSelectedProvider(null)}
              >
                All
              </Badge>
              {modelProviders.map(provider => (
                <Badge
                  key={provider}
                  variant={selectedProvider === provider ? "default" : "outline"}
                  className={`cursor-pointer text-xs capitalize transition-all ${
                    selectedProvider === provider
                      ? 'bg-primary/20 text-primary border-primary/30'
                      : 'hover:bg-primary/10'
                  }`}
                  onClick={() => setSelectedProvider(provider === selectedProvider ? null : provider)}
                >
                  {provider}
                  {selectedProvider === provider && (
                    <X className="ml-1 h-2.5 w-2.5" />
                  )}
                </Badge>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredModels.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-sm text-muted-foreground rounded-xl bg-muted/30 border border-primary/10"
            >
              {selectedProvider 
                ? `No ${selectedProvider} models configured`
                : 'No models configured'
              }
            </motion.div>
          ) : (
            <div className="space-y-2">
              <div className={`space-y-2 ${!isExpanded && filteredModels.length > COLLAPSED_ITEM_COUNT ? 'max-h-[280px] overflow-hidden relative' : ''}`}>
                <AnimatePresence mode="wait">
                  {filteredModels.slice(0, isExpanded ? undefined : COLLAPSED_ITEM_COUNT).map((model, index) => (
                    <motion.div
                      key={model.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-2 group"
                    >
                      <motion.div
                        whileHover={{ scale: 1.01, x: 4 }}
                        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-gradient-to-r from-card/60 to-card/40 border-primary/20 hover:border-primary/40 transition-all"
                      >
                        <span className="font-medium text-sm">{model.name}</span>
                        <Badge variant="outline" className="text-xs border-primary/20">
                          {model.provider}
                        </Badge>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity border border-transparent hover:border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteModel(model)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!isExpanded && filteredModels.length > COLLAPSED_ITEM_COUNT && (
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              {filteredModels.length > COLLAPSED_ITEM_COUNT && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full mt-2 border border-primary/20 hover:bg-primary/10"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show {filteredModels.length - COLLAPSED_ITEM_COUNT} more
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteModel}
        onOpenChange={(open) => !open && setDeleteModel(null)}
        title="Delete Model"
        description={`Are you sure you want to delete "${deleteModel?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}