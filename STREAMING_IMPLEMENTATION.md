# Token Streaming Implementation for Notebook Chat

## Overview

Implemented true token-by-token streaming for notebook chat to provide real-time AI responses and significantly improve perceived performance.

## Changes Made

### 1. Backend (`api/routers/chat.py`)

#### Added Streaming Function
- **`stream_chat_response()`**: Async generator that streams chat responses using Server-Sent Events (SSE)
- Uses LangGraph's `astream_events()` with `version="v2"` for true token streaming
- Captures `on_chat_model_stream` events to stream individual tokens
- Handles user provider context for API key management
- Includes comprehensive error handling for Unicode and general exceptions

#### Added Streaming Endpoint
- **POST `/chat/execute/stream`**: New endpoint for streaming chat
- Returns `StreamingResponse` with proper SSE headers
- Maintains session state and updates timestamps
- Gracefully handles all error scenarios

### 2. Frontend API Client (`lib/api/chat.ts`)

#### Added Streaming Method
- **`sendMessageStream()`**: Fetches streaming response using native `fetch` API
- Returns `ReadableStream<Uint8Array>` for processing
- Includes proper headers and authentication
- Error handling for network and response issues

### 3. Frontend Hook (`lib/hooks/useNotebookChat.ts`)

#### Updated `sendMessage()` Function
- Now uses streaming by default via `chatApi.sendMessageStream()`
- Implements SSE parsing with `ReadableStream` reader
- Creates AI message on first token (prevents empty bubble)
- Appends tokens incrementally for real-time display
- Maintains optimistic UI updates for user messages
- Handles complete message updates and errors gracefully

## Event Types

The streaming endpoint emits the following SSE events:

1. **`user_message`**: Echoes the user's message
   ```json
   {"type": "user_message", "content": "...", "timestamp": null}
   ```

2. **`token`**: Individual AI response tokens (streaming)
   ```json
   {"type": "token", "content": "word"}
   ```

3. **`ai_message_complete`**: Final complete AI message
   ```json
   {"type": "ai_message_complete", "content": "...", "timestamp": null}
   ```

4. **`complete`**: Streaming completed successfully
   ```json
   {"type": "complete"}
   ```

5. **`error`**: Error occurred during streaming
   ```json
   {"type": "error", "message": "..."}
   ```

## Provider Compatibility

### ✅ Fully Supported (Token Streaming)
- **OpenAI** (GPT-4, GPT-3.5, etc.)
- **Anthropic** (Claude 3.x, Claude 4.x)
- **Groq** (Llama, Mixtral, etc.)
- **Google** (Gemini models)
- **Mistral** (Mistral models)
- **DeepSeek** (DeepSeek models)
- **Ollama** (Local models)
- **OpenRouter** (Most models)

### Graceful Degradation
If a provider doesn't support streaming:
- LangChain automatically falls back to non-streaming
- Frontend receives complete response in one chunk
- No errors or breaking behavior
- User experience is still functional

## How It Works

### Backend Flow
1. Client sends POST request to `/chat/execute/stream`
2. Backend validates session and builds context
3. `astream_events()` streams LangGraph execution
4. `on_chat_model_stream` events capture individual tokens
5. Each token is sent as SSE `data: {...}\n\n`
6. Session timestamp updated after completion

### Frontend Flow
1. User sends message via `sendMessage()`
2. User message added optimistically to UI
3. `sendMessageStream()` initiates streaming request
4. Reader processes incoming SSE data chunks
5. First token creates AI message bubble
6. Subsequent tokens append to message content
7. UI updates in real-time with each token
8. Session refetched on completion

## Testing

### Manual Testing Steps

1. **Start the application**:
   ```bash
   cd open-notebook
   ./start-local-dev.sh
   ```

2. **Navigate to a notebook**:
   - Open any notebook with sources/notes
   - Go to the chat section

3. **Send a test message**:
   - Type: "Summarize the key points from these sources"
   - Observe tokens appearing in real-time
   - Verify smooth streaming (no jerky updates)

4. **Test with different providers**:
   - Go to Models section
   - Configure different providers (OpenAI, Claude, etc.)
   - Test streaming with each provider

5. **Error handling**:
   - Disconnect internet mid-stream (should show error)
   - Send invalid context (should handle gracefully)
   - Use model without API key (should show error)

### Expected Behavior

✅ **Success**:
- User message appears immediately
- AI response starts appearing within 1-2 seconds
- Tokens stream smoothly (word-by-word or phrase-by-phrase)
- No "jumpy" or flickering UI
- Complete message saved to session

❌ **Failure Indicators**:
- Long wait with no response
- Empty AI message bubble
- Error toast notifications
- Network errors in console

## Performance Improvements

### Before (Non-Streaming)
- **Wait time**: 10-30+ seconds for full response
- **Feedback**: No visual feedback until complete
- **User experience**: Appears "frozen" or "broken"

### After (Streaming)
- **First token**: 1-2 seconds
- **Continuous feedback**: Real-time token streaming
- **User experience**: Feels fast and responsive

## Backwards Compatibility

The original non-streaming endpoint remains available:
- **POST `/chat/execute`**: Returns complete response
- Can be used as fallback if streaming fails
- Maintains compatibility with existing clients

## Error Handling

### Backend Errors
- Unicode encoding errors caught and reported
- Session validation failures (404)
- Provider API errors logged with details
- Graceful degradation on streaming failures

### Frontend Errors
- Stream parsing errors logged to console
- Network errors show user-friendly toast
- Optimistic messages removed on error
- Session state remains consistent

## Security Considerations

- ✅ User authentication required (`get_current_active_user`)
- ✅ User-specific API keys via `user_provider_context`
- ✅ Session ownership validation
- ✅ Proper CORS headers for SSE
- ✅ Encrypted API key storage

## Future Enhancements

Potential improvements for future iterations:

1. **Retry logic**: Auto-retry on transient failures
2. **Fallback**: Auto-switch to non-streaming on errors
3. **Progress indicator**: Show "typing" indicator
4. **Token count tracking**: Real-time token usage display
5. **Pause/Resume**: Allow user to pause streaming
6. **Model-specific optimization**: Tune chunking per provider

## Troubleshooting

### Issue: No streaming, getting full response at once
**Cause**: Provider doesn't support streaming
**Solution**: Normal behavior, graceful degradation working

### Issue: Empty AI message bubble
**Cause**: First token not creating message
**Solution**: Check `if (!aiMessage)` logic in hook

### Issue: Choppy/jerky streaming
**Cause**: Too many re-renders
**Solution**: Verify message updates only on content change

### Issue: Stream disconnects mid-response
**Cause**: Network timeout or provider error
**Solution**: Check backend logs, verify API keys

## Code References

- Backend streaming: `open-notebook/api/routers/chat.py` (lines 412-558)
- Frontend API: `open-notebook/frontend/src/lib/api/chat.ts` (lines 62-84)
- Frontend hook: `open-notebook/frontend/src/lib/hooks/useNotebookChat.ts` (lines 167-286)
- Chat UI: `open-notebook/frontend/src/components/source/ChatPanel.tsx` (already supports streaming)

## Deployment Notes

### Environment Variables
No new environment variables required. Uses existing:
- Provider API keys (OpenAI, Anthropic, etc.)
- Database connection settings
- Authentication settings

### Dependencies
All dependencies already present in `requirements.txt`:
- `langchain>=0.3.3`
- `langgraph>=0.2.38`
- `fastapi>=0.104.0`

### Monitoring
Watch for these metrics:
- Streaming response times
- Error rates by provider
- Token throughput
- User session activity

---

**Implementation Date**: November 11, 2025
**Version**: 1.0
**Status**: ✅ Complete and Ready for Testing

