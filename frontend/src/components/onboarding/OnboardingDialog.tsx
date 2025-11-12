'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Notebook, FileText, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react'
import { ApiKeyStep } from './ApiKeyStep'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
  showApiKeyInput?: boolean
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Welcome to Datara',
    description: 'Your personal crypto research assistant',
    icon: <Notebook className="h-12 w-12 text-primary" />,
    features: [
      'Organize crypto research with notebooks',
      'Upload whitepapers and documents',
      'Generate AI-powered research podcasts',
      'Track insights and analysis'
    ]
  },
  {
    title: 'Add Your API Key (Optional)',
    description: 'Connect your AI provider to unlock full features',
    icon: <KeyRound className="h-12 w-12 text-primary" />,
    features: [
      'Your keys are encrypted and stored securely',
      'We support OpenAI, Anthropic, Groq, and more',
      'You can add or update keys anytime in Settings',
      'Or skip this step if using organization keys'
    ],
    showApiKeyInput: true
  },
  {
    title: 'Create Your First Notebook',
    description: 'Notebooks help you organize crypto research topics',
    icon: <FileText className="h-12 w-12 text-primary" />,
    features: [
      'Click "Create Notebook" to get started',
      'Organize by project or token',
      'Add sources and analysis inside',
      'Track your research journey'
    ]
  },
  {
    title: 'Upload Sources & Documents',
    description: 'Add whitepapers, articles, and crypto documents',
    icon: <FileText className="h-12 w-12 text-primary" />,
    features: [
      'Upload PDFs and documents',
      'Paste text or URLs',
      'AI extracts and organizes content',
      'Query your sources with AI'
    ]
  },
  {
    title: 'Generate AI Podcasts',
    description: 'Turn your crypto research into engaging conversations',
    icon: <Sparkles className="h-12 w-12 text-primary" />,
    features: [
      'Select a research topic or notebook',
      'Choose speakers and personalities',
      'AI generates a conversational podcast',
      'Listen to your research insights'
    ]
  },
  {
    title: 'Take Notes & Track Insights',
    description: 'Capture analysis and ideas as you research',
    icon: <CheckCircle2 className="h-12 w-12 text-primary" />,
    features: [
      'Create notes linked to sources',
      'Use markdown for formatting',
      'Search across all your research',
      'Export your analysis anytime'
    ]
  }
]

interface OnboardingDialogProps {
  open: boolean
  onComplete: () => void
}

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const currentStepData = onboardingSteps[currentStep]
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {currentStepData.icon}
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={progress} className="h-2" />

          {currentStepData.showApiKeyInput ? (
            <ApiKeyStep
              onComplete={handleNext}
              onSkip={handleNext}
            />
          ) : (
            <>
              <div className="space-y-2">
                {currentStepData.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <Button variant="ghost" onClick={handleSkip}>
                  Skip Tutorial
                </Button>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" onClick={handlePrevious}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                  )}
                  <Button onClick={handleNext} className="flex items-center gap-2">
                    {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-1 justify-center">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-8 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

