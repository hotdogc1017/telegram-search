export interface CoreSentEvents {
  'core:error': (data: { error?: string | Error | unknown }) => void
}
