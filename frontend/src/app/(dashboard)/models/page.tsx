'use client'

import { AppShell } from '@/components/layout/AppShell'
import { ProviderStatus } from './components/ProviderStatus'
import { ModelTypeSection } from './components/ModelTypeSection'
import { DefaultModelsSection } from './components/DefaultModelsSection'
import { useModels, useModelDefaults, useProviders } from '@/lib/hooks/use-models'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { RefreshCw, Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function ModelsPage() {
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels()
  const { data: defaults, isLoading: defaultsLoading, refetch: refetchDefaults } = useModelDefaults()
  const { data: providers, isLoading: providersLoading, refetch: refetchProviders } = useProviders()

  const handleRefresh = () => {
    refetchModels()
    refetchDefaults()
    refetchProviders()
  }

  if (modelsLoading || defaultsLoading || providersLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!models || !defaults || !providers) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load models data</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const totalModels = models.length
  const configuredProviders = providers.available.length
  const totalProviders = providers.available.length + providers.unavailable.length

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="relative border-b border-primary/20 bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/10 opacity-50" />
          <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20"
                  >
                    <Bot className="h-7 w-7 text-primary" />
                  </motion.div>
                  <div>
                    <h1 
                      className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
                      style={{ fontFamily: "'Vortex Dancer', sans-serif" }}
                    >
                      Model Management
                    </h1>
                    <p className="text-muted-foreground mt-2 text-base lg:text-lg">
                      Configure AI models for different purposes across Datara
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 mt-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      <span className="text-primary font-bold">{totalModels}</span> Models
                    </span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium">
                      <span className="text-primary font-bold">{configuredProviders}</span> of {totalProviders} Providers
                    </span>
                  </motion.div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleRefresh}
                  className="liquid-glass border-primary/30 hover:border-primary/50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12 space-y-8 lg:space-y-12">
          {/* Provider Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProviderStatus providers={providers} />
          </motion.div>

          {/* Default Models */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DefaultModelsSection models={models} defaults={defaults} />
          </motion.div>

          {/* Model Types Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-wider">Model Types</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ModelTypeSection 
                type="language" 
                models={models} 
                providers={providers}
                isLoading={modelsLoading}
              />
              <ModelTypeSection 
                type="embedding" 
                models={models} 
                providers={providers}
                isLoading={modelsLoading}
              />
              <ModelTypeSection 
                type="text_to_speech" 
                models={models} 
                providers={providers}
                isLoading={modelsLoading}
              />
              <ModelTypeSection 
                type="speech_to_text" 
                models={models} 
                providers={providers}
                isLoading={modelsLoading}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  )
}
