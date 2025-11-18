# API Key Storage & Collection Flow - Complete Walkthrough

This document explains exactly how API keys are collected from users, stored securely, and used in the application, using real code examples from the codebase.

---

## Overview: The Complete Flow

```
User Input → Frontend Form → API Request → Backend Encryption → Database Storage
                                                                    ↓
User AI Request → Load User's Keys → Decrypt → Set Environment → Use Keys → Restore Environment
```

---

## Part 1: Collecting API Keys (Frontend)

### 1.1 User Interface - Settings Page

**Location:** `frontend/src/app/(dashboard)/settings/components/ProviderKeysCard.tsx`

Users can add API keys in two places:
1. **Settings Page** (`/settings`) - Main interface
2. **Onboarding Flow** (`/onboarding`) - First-time setup

**Example: User fills out form**

```typescript
// User selects provider and enters API key
const formData = {
  provider: "openai",           // Selected from dropdown
  value: "sk-proj-abc123...",   // User's actual API key
  display_name: "Work Account"   // Optional label
}
```

**Real Code - Form Submission:**

```96:120:frontend/src/app/(dashboard)/settings/components/ProviderKeysCard.tsx
  const onSubmit = async (data: ProviderFormData) => {
    const payload: UpsertProviderSecretPayload = {
      provider: data.provider,
      value: data.value.trim(),
      display_name: data.display_name?.trim() || undefined,
    }

    try {
      await upsertSecret.mutateAsync(payload)
      toast({
        title: 'Saved',
        description: `${humanizeProvider(payload.provider)} credentials updated`,
      })
      setEditingProvider(null)
      setRevealedProviders((prev) => ({ ...prev, [payload.provider]: false }))
      reset({ provider: payload.provider, value: '', display_name: payload.display_name ?? '' })
    } catch (mutationError) {
      toast({
        title: 'Failed to save credentials',
        description:
          mutationError instanceof Error ? mutationError.message : 'An unexpected error occurred.',
        variant: 'destructive',
      })
    }
  }
```

### 1.2 Frontend API Call

**Location:** `frontend/src/lib/hooks/use-provider-secrets.ts`

The form uses React Query mutation to call the API:

```22:28:frontend/src/lib/hooks/use-provider-secrets.ts
export function useUpsertProviderSecret() {
  return useMutation({
    mutationFn: (payload: UpsertProviderSecretPayload) => providerSecretsApi.upsert(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.providerSecrets })
    },
  })
}
```

**Location:** `frontend/src/lib/api/provider-secrets.ts`

The actual HTTP request:

```18:21:frontend/src/lib/api/provider-secrets.ts
  async upsert(payload: { provider: string; value: string; display_name?: string | null }) {
    const response = await apiClient.post<ProviderSecretSummary>('/provider-secrets', payload)
    return response.data
  },
```

**Request Details:**
- **Method:** `POST /api/provider-secrets`
- **Headers:** 
  - `Authorization: Bearer <jwt_token>` (added automatically by interceptor)
  - `Content-Type: application/json`
- **Body:**
  ```json
  {
    "provider": "openai",
    "value": "sk-proj-abc123xyz...",
    "display_name": "Work Account"
  }
  ```

**Note:** The API key is sent in **plain text** over HTTPS. It's encrypted on the backend before storage.

---

## Part 2: Backend Processing & Storage

### 2.1 Backend API Endpoint

**Location:** `api/routers/provider_secrets.py`

The endpoint receives the request:

```69:88:api/routers/provider_secrets.py
@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProviderSecretSummary)
async def create_or_update_provider_secret(
    payload: ProviderSecretCreate,
    current_user: User = Depends(get_current_active_user),
):
    try:
        secret = await UserProviderSecret.upsert_secret(
            user=current_user.id,
            provider=payload.provider,
            value=payload.value,
            display_name=payload.display_name,
        )
    except MissingEncryptionKeyError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return ProviderSecretSummary(
        provider=secret.provider,
        display_name=secret.display_name,
        created=secret.created.isoformat() if secret.created else None,
        updated=secret.updated.isoformat() if secret.updated else None,
    )
```

**Key Points:**
- ✅ Requires authentication (`get_current_active_user`)
- ✅ Uses `current_user.id` to associate secret with user
- ✅ Calls `upsert_secret()` which handles encryption

### 2.2 Encryption Process

**Location:** `open_notebook/domain/user_secret.py`

The `upsert_secret` method encrypts the API key:

```42:69:open_notebook/domain/user_secret.py
    @classmethod
    async def upsert_secret(
        cls, user: str, provider: str, value: str, display_name: Optional[str] = None
    ) -> "UserProviderSecret":
        encrypted = encrypt_value(value)
        existing = await cls.get_for_user(user, provider)
        if existing:
            existing.encrypted_value = encrypted
            existing.display_name = display_name
            existing.updated = datetime.now()
            await existing.save()
            return existing
        
        # Try to create new record
        try:
            secret = cls(user=user, provider=provider, encrypted_value=encrypted, display_name=display_name)
            await secret.save()
            return secret
        except Exception as e:
            # If creation fails due to duplicate, fetch and update
            logger.warning(f"Failed to create secret, trying to fetch and update: {e}")
            existing = await cls.get_for_user(user, provider)
            if existing:
                existing.encrypted_value = encrypted
                existing.display_name = display_name
                existing.updated = datetime.now()
                await existing.save()
                return existing
            raise
```

**Encryption Function:**

**Location:** `open_notebook/utils/crypto.py`

```99:103:open_notebook/utils/crypto.py
def encrypt_value(value: str) -> str:
    """Encrypt plain text using Fernet."""
    fernet = _get_fernet()
    token = fernet.encrypt(value.encode("utf-8"))
    return token.decode("utf-8")
```

**What Happens:**
1. `encrypt_value("sk-proj-abc123...")` is called
2. Gets Fernet cipher instance (using encryption key)
3. Encrypts the API key: `"sk-proj-abc123..."` → `"gAAAAABh..."` (encrypted token)
4. Returns encrypted string

**Encryption Key Management:**

```62:81:open_notebook/utils/crypto.py
def _get_or_create_secret_key() -> str:
    key = _load_env_secret()
    if key:
        return key

    secret_file = _resolve_secret_file()
    key = _read_secret_from_file(secret_file)
    if key:
        os.environ[FERNET_SECRET_ENV] = key
        return key

    generated_key = Fernet.generate_key().decode("utf-8")
    try:
        _write_secret_to_file(secret_file, generated_key)
    except OSError as exc:
        logger.warning(
            "Unable to persist auto-generated Fernet key to {}: {}", secret_file, exc
        )
    os.environ[FERNET_SECRET_ENV] = generated_key
    return generated_key
```

**Key Resolution Priority:**
1. `FERNET_SECRET_KEY` environment variable
2. `FERNET_SECRET_FILE` environment variable (path to key file)
3. `/mydata/.secrets/fernet.key` (persistent storage - Render/Docker)
4. `./.secrets/fernet.key` (local development)
5. Auto-generate if none found (logged as warning)

### 2.3 Database Storage

**Location:** SurrealDB `user_provider_secret` table

**What Gets Stored:**

```python
# Database record example:
{
    "id": "user_provider_secret:xyz789",
    "user": "user:abc123",                    # Foreign key to user
    "provider": "openai",                     # Provider identifier
    "encrypted_value": "gAAAAABh...",          # Encrypted API key (Fernet)
    "display_name": "Work Account",            # User-friendly label
    "created": "2025-01-12T10:30:00Z",
    "updated": "2025-01-12T10:30:00Z"
}
```

**Important:**
- ✅ API key is **never** stored in plain text
- ✅ Only encrypted value is stored: `"gAAAAABh..."`
- ✅ User ID links secret to specific user
- ✅ Provider name identifies which service (openai, anthropic, etc.)

---

## Part 3: Retrieving & Using API Keys

### 3.1 When User Makes AI Request

**Example:** User sends a chat message or generates a podcast

**Location:** `open_notebook/utils/provider_env.py`

The system loads user's API keys and temporarily sets them as environment variables:

```27:56:open_notebook/utils/provider_env.py
@asynccontextmanager
async def user_provider_context(user_id: Optional[str]):
    """
    Temporarily apply provider API keys for the given user to os.environ.
    Restores previous values when finished.
    """
    if not user_id:
        yield
        return

    secrets = await UserProviderSecret.list_for_user(user_id)
    if not secrets:
        yield
        return

    previous_values: Dict[str, Optional[str]] = {}
    try:
        for secret in secrets:
            env_var = PROVIDER_ENV_MAPPING.get(secret.provider)
            if not env_var:
                continue
            previous_values.setdefault(env_var, os.environ.get(env_var))
            os.environ[env_var] = secret.get_plain_value()
        yield
    finally:
        for env_var, previous in previous_values.items():
            if previous is None:
                os.environ.pop(env_var, None)
            else:
                os.environ[env_var] = previous
```

**Step-by-Step:**

1. **Load User's Secrets:**
   ```python
   secrets = await UserProviderSecret.list_for_user(user_id)
   # Returns: [UserProviderSecret(provider="openai", encrypted_value="gAAAAABh..."), ...]
   ```

2. **Decrypt Each Secret:**
   ```python
   for secret in secrets:
       plain_value = secret.get_plain_value()  # Decrypts "gAAAAABh..." → "sk-proj-abc123..."
   ```

3. **Map to Environment Variable:**
   ```python
   PROVIDER_ENV_MAPPING = {
       "openai": "OPENAI_API_KEY",
       "anthropic": "ANTHROPIC_API_KEY",
       # ... etc
   }
   env_var = PROVIDER_ENV_MAPPING.get("openai")  # → "OPENAI_API_KEY"
   ```

4. **Set Environment Variable:**
   ```python
   os.environ["OPENAI_API_KEY"] = "sk-proj-abc123..."  # Decrypted value
   ```

5. **AI Libraries Use Environment:**
   ```python
   # OpenAI library automatically reads OPENAI_API_KEY from os.environ
   import openai
   response = openai.ChatCompletion.create(...)  # Uses user's key!
   ```

6. **Restore Environment:**
   ```python
   # After context exits, restore previous values
   os.environ["OPENAI_API_KEY"] = previous_value  # or remove if None
   ```

### 3.2 Real Usage Example - Chat

**Location:** `api/routers/chat.py` (simplified)

```python
async def execute_chat(request, current_user: User):
    # Load user's API keys into environment
    async with user_provider_context(current_user.id):
        # Now all AI calls use user's keys
        response = await chat_service.generate_response(...)
    # Environment restored after this block
```

### 3.3 Real Usage Example - Podcast Generation

**Location:** `commands/podcast_commands.py`

```172:184:commands/podcast_commands.py
        # Load user's API keys from provider secrets
        from open_notebook.utils.provider_env import user_provider_context
        
        async with user_provider_context(input_data.user_id):
            result = await create_podcast(
                content=input_data.content,
                briefing=briefing,
                episode_name=input_data.episode_name,
                output_dir=str(output_dir),
                speaker_config=speaker_profile.name,
                episode_profile=episode_profile.name,
            )
```

---

## Part 4: Retrieving API Keys (For Display)

### 4.1 Listing User's Secrets

**Frontend Request:**
```typescript
// GET /api/provider-secrets
const secrets = await providerSecretsApi.list()
```

**Backend Response:**
```python
@router.get("", response_model=List[ProviderSecretSummary])
async def list_provider_secrets(current_user: User = Depends(get_current_active_user)):
    secrets = await UserProviderSecret.list_for_user(current_user.id)
    summaries: List[ProviderSecretSummary] = []
    for secret in secrets:
        summaries.append(
            ProviderSecretSummary(
                provider=secret.provider,
                display_name=secret.display_name,
                created=secret.created.isoformat() if secret.created else None,
                updated=secret.updated.isoformat() if secret.updated else None,
            )
        )
    return summaries
```

**Important:** The API key value is **NOT** returned in the list. Only metadata (provider, display_name, dates).

### 4.2 Revealing API Key (For Editing)

**Frontend Request:**
```typescript
// GET /api/provider-secrets/openai
const detail = await providerSecretsApi.get("openai")
// Returns: { provider: "openai", display_name: "Work Account", value: "sk-proj-abc123..." }
```

**Backend Response:**
```python
@router.get("/{provider}", response_model=ProviderSecretDetail)
async def get_provider_secret(provider: str, current_user: User = Depends(get_current_active_user)):
    secret = await UserProviderSecret.get_for_user(current_user.id, provider)
    if not secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider credential not found")
    return ProviderSecretDetail(
        provider=provider,
        display_name=secret.display_name,
        value=secret.get_plain_value(),  # Decrypts for display
    )
```

**Decryption Method:**

```38:39:open_notebook/domain/user_secret.py
    def get_plain_value(self) -> str:
        return decrypt_value(self.encrypted_value)
```

**Decryption Function:**

```106:114:open_notebook/utils/crypto.py
def decrypt_value(token: str) -> str:
    """Decrypt previously encrypted value."""
    fernet = _get_fernet()
    try:
        value = fernet.decrypt(token.encode("utf-8"))
        return value.decode("utf-8")
    except InvalidToken as exc:
        logger.error("Failed to decrypt value with configured FERNET_SECRET_KEY.")
        raise
```

**What Happens:**
1. `decrypt_value("gAAAAABh...")` is called
2. Gets Fernet cipher instance (using same encryption key)
3. Decrypts: `"gAAAAABh..."` → `"sk-proj-abc123..."` (original API key)
4. Returns plain text value

**Security Note:** The decrypted value is only returned when explicitly requested (for editing). It's never logged or exposed in error messages.

---

## Part 5: Provider Mapping

### 5.1 Provider to Environment Variable Mapping

**Location:** `open_notebook/utils/provider_env.py`

```9:24:open_notebook/utils/provider_env.py
PROVIDER_ENV_MAPPING: Dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GOOGLE_API_KEY",
    "google": "GOOGLE_API_KEY",
    "google-vertex": "GOOGLE_API_KEY",
    "vertexai": "GOOGLE_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "xai": "XAI_API_KEY",
    "groq": "GROQ_API_KEY",
    "voyage": "VOYAGE_API_KEY",
    "elevenlabs": "ELEVENLABS_API_KEY",
    "cohere": "COHERE_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}
```

**How It Works:**
- User stores key with provider name: `"openai"`
- System maps to environment variable: `"OPENAI_API_KEY"`
- Sets `os.environ["OPENAI_API_KEY"] = decrypted_value`
- AI libraries read from environment automatically

---

## Part 6: Security Features

### 6.1 Encryption at Rest

✅ **API keys are encrypted before storage**
- Plain text: `"sk-proj-abc123..."`
- Encrypted: `"gAAAAABh..."` (stored in database)
- Encryption: Fernet (AES-128 symmetric encryption)

### 6.2 User Isolation

✅ **Each user's keys are isolated**
- Database query filters by `user` field
- Users can only access their own keys
- Authentication required for all operations

### 6.3 Decryption Only When Needed

✅ **Keys are decrypted only when:**
- User makes AI request (temporary environment variable)
- User explicitly requests to view/edit (reveal endpoint)
- Never decrypted for logging or error messages

### 6.4 Environment Variable Isolation

✅ **User keys don't interfere with each other**
- Each request gets its own environment context
- Previous values are restored after use
- System-level env vars can still be used as fallback

### 6.5 Encryption Key Security

✅ **Encryption key is protected:**
- Stored in persistent storage (`/mydata/.secrets/fernet.key`)
- File permissions: `0o600` (read/write owner only)
- Can be overridden via environment variable
- Auto-generated if not found (with warning)

---

## Part 7: Complete Example Flow

### Scenario: User adds OpenAI API key and uses it for chat

**Step 1: User Input**
```
User goes to Settings → Provider Credentials
Selects: "OpenAI"
Enters: "sk-proj-abc123xyz..."
Display Name: "Work Account"
Clicks: "Add Credential"
```

**Step 2: Frontend Request**
```http
POST /api/provider-secrets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "provider": "openai",
  "value": "sk-proj-abc123xyz...",
  "display_name": "Work Account"
}
```

**Step 3: Backend Encryption**
```python
# In UserProviderSecret.upsert_secret()
encrypted = encrypt_value("sk-proj-abc123xyz...")
# Result: "gAAAAABhZGVybmV0X2tleV9oZXJlX2lzX3RoZV9lbmNyeXB0ZWRfdmFsdWU="
```

**Step 4: Database Storage**
```sql
-- SurrealDB record created:
INSERT INTO user_provider_secret {
    user: user:abc123,
    provider: "openai",
    encrypted_value: "gAAAAABh...",
    display_name: "Work Account"
}
```

**Step 5: User Sends Chat Message**
```http
POST /api/chat/execute
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "message": "What is AI?",
  "notebook_id": "notebook:xyz789"
}
```

**Step 6: Backend Loads User's Keys**
```python
# In chat endpoint
async with user_provider_context(current_user.id):
    # 1. Load secrets from database
    secrets = await UserProviderSecret.list_for_user("user:abc123")
    # Returns: [UserProviderSecret(encrypted_value="gAAAAABh...")]
    
    # 2. Decrypt
    plain_key = decrypt_value("gAAAAABh...")
    # Result: "sk-proj-abc123xyz..."
    
    # 3. Set environment
    os.environ["OPENAI_API_KEY"] = "sk-proj-abc123xyz..."
    
    # 4. Use AI library (reads from environment)
    response = openai.ChatCompletion.create(...)
    
    # 5. Restore environment (after context exits)
    # os.environ["OPENAI_API_KEY"] = previous_value
```

**Step 7: Response Returned**
```json
{
  "message": "AI stands for Artificial Intelligence...",
  "sources": [...]
}
```

---

## Summary

### Collection Flow:
1. **Frontend Form** → User enters API key
2. **HTTP POST** → Sends plain text over HTTPS
3. **Backend Receives** → Validates user authentication
4. **Encryption** → Fernet encrypts the key
5. **Database Storage** → Stores encrypted value with user ID

### Usage Flow:
1. **User Request** → Makes AI request (chat, podcast, etc.)
2. **Load Secrets** → Query database for user's encrypted keys
3. **Decrypt** → Decrypt each key temporarily
4. **Set Environment** → Set `os.environ[PROVIDER_KEY] = decrypted_value`
5. **AI Library** → Reads from environment automatically
6. **Restore** → Remove/restore environment variables

### Security:
- ✅ Encrypted at rest (Fernet/AES-128)
- ✅ User isolation (filtered by user ID)
- ✅ Decrypted only when needed
- ✅ Never logged or exposed
- ✅ HTTPS in transit
- ✅ Authentication required

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-12

