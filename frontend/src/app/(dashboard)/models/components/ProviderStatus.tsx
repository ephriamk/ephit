'use client'

import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Check, X, ChevronDown, ChevronUp, KeyRound, Plus, Loader2 } from 'lucide-react'
import { ProviderAvailability } from '@/lib/types/models'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/lib/hooks/use-toast'
import { useUpsertProviderSecret, useProviderSecrets } from '@/lib/hooks/use-provider-secrets'
import { useProviders } from '@/lib/hooks/use-models'

interface ProviderStatusProps {
  providers: ProviderAvailability
}

const PROVIDER_NAMES: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'gemini': 'Google Gemini',
  'google': 'Google',
  'vertex': 'Google Vertex AI',
  'vertexai': 'Google Vertex AI',
  'groq': 'Groq',
  'mistral': 'Mistral',
  'deepseek': 'DeepSeek',
  'xai': 'xAI',
  'voyage': 'Voyage AI',
  'elevenlabs': 'ElevenLabs',
  'cohere': 'Cohere',
  'openrouter': 'OpenRouter',
  'ollama': 'Ollama',
  'azure': 'Azure OpenAI',
  'openai-compatible': 'OpenAI Compatible',
}

const providerSchema = z.object({
  apiKey: z.string().min(4, 'API key is required'),
  displayName: z.string().max(120).optional().or(z.literal('')),
})

type ProviderFormData = z.infer<typeof providerSchema>

function ConfigureProviderDialog({ provider }: { provider: string }) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const upsertSecret = useUpsertProviderSecret()
  const { refetch: refetchProviders } = useProviders()
  const { refetch: refetchSecrets } = useProviderSecrets()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      apiKey: '',
      displayName: '',
    },
  })

  const onSubmit = async (data: ProviderFormData) => {
    try {
      await upsertSecret.mutateAsync({
        provider: provider,
        value: data.apiKey.trim(),
        display_name: data.displayName?.trim() || undefined,
      })
      
      toast({
        title: 'Provider configured',
        description: `${PROVIDER_NAMES[provider] || provider} has been configured successfully.`,
      })
      
      reset()
      setOpen(false)
      
      // Refresh provider availability and secrets
      await refetchProviders()
      await refetchSecrets()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to configure provider',
        variant: 'destructive',
      })
    }
  }

  const providerName = PROVIDER_NAMES[provider] || provider

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2 gap-1 border-primary/30 hover:border-primary/50 hover:bg-primary/10"
          >
            <KeyRound className="h-3 w-3" />
            Configure
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Configure {providerName}
          </DialogTitle>
          <DialogDescription>
            Add your API key to enable {providerName} models. Your key will be encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={`Enter your ${providerName} API key`}
              {...register('apiKey')}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              id="displayName"
              placeholder="e.g., Work Account, Personal"
              {...register('displayName')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Save Key
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ProviderStatusProps {
  providers: ProviderAvailability
}

export function ProviderStatus({ providers }: ProviderStatusProps) {
  // Combine all providers, with available ones first
  const allProviders = useMemo(
    () => [
      ...providers.available.map((p) => ({ name: p, available: true })),
      ...providers.unavailable.map((p) => ({ name: p, available: false })),
    ],
    [providers.available, providers.unavailable],
  )

  const [expanded, setExpanded] = useState(false)

  const visibleProviders = useMemo(() => {
    if (expanded) {
      return allProviders
    }
    return allProviders.slice(0, 6)
  }, [allProviders, expanded])

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'language': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'embedding': 'bg-green-500/20 text-green-400 border-green-500/30',
      'text_to_speech': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'speech_to_text': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    }
    return colors[type] || 'bg-muted text-muted-foreground'
  }

  return (
    <Card className="liquid-glass border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">AI Providers</CardTitle>
            <CardDescription className="mt-2 text-base">
              Configure providers by adding API keys directly below, or through environment variables
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">
              <span className="text-primary font-bold">{providers.available.length}</span> of {allProviders.length}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LayoutGroup>
          <motion.div 
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            layout
          >
            <AnimatePresence>
              {visibleProviders.map((provider, index) => {
                const supportedTypes = providers.supported_types[provider.name] ?? []

                return (
                  <motion.div
                    key={provider.name}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.5
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`rounded-xl border px-4 py-3 transition-all ${
                      provider.available 
                        ? 'bg-gradient-to-br from-card/80 to-card/60 border-primary/30 hover:border-primary/50 shadow-md hover:shadow-lg' 
                        : 'bg-muted/40 border-muted-foreground/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className={`flex items-center justify-center rounded-full p-2 shrink-0 ${
                          provider.available
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/20'
                        }`}
                        whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {provider.available ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </motion.div>

                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span
                          className={`truncate text-sm font-semibold capitalize ${
                            !provider.available ? 'text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {provider.name}
                        </span>

                        {provider.available ? (
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {supportedTypes.length > 0 ? (
                              supportedTypes.map((type) => (
                                <Badge 
                                  key={type} 
                                  variant="outline" 
                                  className={`text-xs font-medium border ${getTypeColor(type)}`}
                                >
                                  {type.replace('_', ' ')}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">No models</Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground border-dashed shrink-0">
                            Not configured
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!provider.available && (
                      <div className="mt-3 flex justify-end">
                        <ConfigureProviderDialog provider={provider.name} />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        {allProviders.length > 6 ? (
          <motion.div 
            className="mt-6 flex justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 border border-primary/20 transition-all"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  See less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  See all {allProviders.length} providers
                </>
              )}
            </button>
          </motion.div>
        ) : null}

        <div className="mt-8 pt-6 border-t border-primary/10">
          <a
            href="https://github.com/lfnovo/open-notebook/blob/main/docs/features/ai-models.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1 group"
          >
            Learn how to configure providers
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
  )
}
