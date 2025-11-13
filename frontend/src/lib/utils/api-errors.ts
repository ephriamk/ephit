/**
 * Utility functions for parsing and handling API errors, especially API key errors
 */

export interface ApiKeyErrorInfo {
  isApiKeyError: boolean
  provider?: string
  message: string
  actionText?: string
  actionUrl?: string
}

/**
 * Parse error message to detect API key issues
 */
export function parseApiKeyError(error: any): ApiKeyErrorInfo {
  const errorMessage = error?.message || error?.toString() || ''
  const lowerMessage = errorMessage.toLowerCase()

  // Check for common API key error patterns
  const apiKeyPatterns = [
    {
      pattern: /incorrect api key|invalid api key|api key.*invalid/i,
      provider: extractProviderFromError(errorMessage),
      message: 'Your API key is invalid or incorrect',
      actionText: 'Update API Key',
    },
    {
      pattern: /api key.*not found|missing api key|no api key/i,
      provider: extractProviderFromError(errorMessage),
      message: 'API key is missing or not configured',
      actionText: 'Add API Key',
    },
    {
      pattern: /api key.*expired|expired.*api key/i,
      provider: extractProviderFromError(errorMessage),
      message: 'Your API key has expired',
      actionText: 'Update API Key',
    },
    {
      pattern: /api key.*required|api key.*needed/i,
      provider: extractProviderFromError(errorMessage),
      message: 'An API key is required for this operation',
      actionText: 'Add API Key',
    },
    {
      pattern: /authentication.*failed|unauthorized.*api/i,
      provider: extractProviderFromError(errorMessage),
      message: 'API authentication failed',
      actionText: 'Check API Key',
    },
  ]

  for (const pattern of apiKeyPatterns) {
    if (pattern.pattern.test(errorMessage)) {
      return {
        isApiKeyError: true,
        provider: pattern.provider,
        message: pattern.message,
        actionText: pattern.actionText,
        actionUrl: '/settings', // Link to settings page
      }
    }
  }

  // Check for OpenAI-specific errors
  if (lowerMessage.includes('openai') || lowerMessage.includes('platform.openai.com')) {
    if (lowerMessage.includes('api key') || lowerMessage.includes('api-keys')) {
      return {
        isApiKeyError: true,
        provider: 'OpenAI',
        message: 'OpenAI API key is invalid or missing',
        actionText: 'Configure OpenAI Key',
        actionUrl: '/settings',
      }
    }
  }

  // Check for Anthropic-specific errors
  if (lowerMessage.includes('anthropic') || lowerMessage.includes('claude')) {
    if (lowerMessage.includes('api key') || lowerMessage.includes('authentication')) {
      return {
        isApiKeyError: true,
        provider: 'Anthropic',
        message: 'Anthropic API key is invalid or missing',
        actionText: 'Configure Anthropic Key',
        actionUrl: '/settings',
      }
    }
  }

  // Generic error
  return {
    isApiKeyError: false,
    message: errorMessage || 'An unexpected error occurred',
  }
}

/**
 * Extract provider name from error message
 */
function extractProviderFromError(message: string): string | undefined {
  const providers = [
    'openai',
    'anthropic',
    'claude',
    'gemini',
    'google',
    'groq',
    'mistral',
    'deepseek',
    'xai',
    'voyage',
    'elevenlabs',
    'cohere',
    'openrouter',
  ]

  const lowerMessage = message.toLowerCase()
  for (const provider of providers) {
    if (lowerMessage.includes(provider)) {
      // Capitalize first letter
      return provider.charAt(0).toUpperCase() + provider.slice(1)
    }
  }

  return undefined
}

/**
 * Format error message for display
 */
export function formatApiKeyError(errorInfo: ApiKeyErrorInfo): string {
  if (!errorInfo.isApiKeyError) {
    return errorInfo.message
  }

  if (errorInfo.provider) {
    return `${errorInfo.provider}: ${errorInfo.message}`
  }

  return errorInfo.message
}

