# User Management System Review

## Executive Summary

This document provides a comprehensive review of how user data, API keys, files, and resources are stored and managed per user in the Open Notebook application.

---

## 1. User Authentication & Storage

### 1.1 User Model

**Location:** `open_notebook/domain/user.py`

**Database Table:** `user` (SurrealDB)

**Schema:**
```python
class User:
    id: str                    # SurrealDB RecordID (e.g., "user:abc123")
    email: EmailStr            # Unique, normalized (lowercase)
    hashed_password: str        # Argon2 hash
    display_name: Optional[str]
    is_active: bool            # Account status
    is_admin: bool             # Admin privileges
    has_completed_onboarding: bool
    created: datetime
    updated: datetime
```

**Database Constraints:**
- `email` is unique (indexed)
- Email is normalized to lowercase on save
- Password requirements: min 8 chars, uppercase, lowercase, number, special char

**Storage Location:**
- SurrealDB embedded database: `/mydata/mydatabase.db` (or `./data/mydatabase.db` locally)
- Table: `user`

### 1.2 Authentication Flow

**JWT Token System:**
- **Location:** `api/security.py`
- **Algorithm:** HS256
- **Expiration:** 24 hours (1440 minutes) - configurable via `JWT_EXPIRES_MINUTES`
- **Secret Key:** `JWT_SECRET` env var (or auto-generated ephemeral key)
- **Token Payload:**
  ```json
  {
    "sub": "user:abc123",  // User ID
    "exp": 1234567890,      // Expiration timestamp
    "sid": "random16chars"  // Server instance ID (invalidates on restart)
  }
  ```

**Security Features:**
- ✅ **Server Instance ID**: Tokens invalidated on server restart
- ✅ **Password Hashing**: Argon2 (industry standard)
- ✅ **Token Validation**: Checks user exists, is active, and token hasn't expired
- ✅ **Session Invalidation**: Old tokens rejected if server restarted

**Token Storage (Frontend):**
- Stored in browser `localStorage` via Zustand store
- Key: `accessToken`
- Automatically included in API requests: `Authorization: Bearer <token>`

---

## 2. API Keys Storage

### 2.1 User Provider Secrets

**Location:** `open_notebook/domain/user_secret.py`

**Database Table:** `user_provider_secret`

**Schema:**
```python
class UserProviderSecret:
    id: str                    # SurrealDB RecordID
    user: str                  # Foreign key to user (RecordID format)
    provider: str              # Provider name (e.g., "openai", "anthropic")
    encrypted_value: str       # Fernet-encrypted API key
    display_name: Optional[str]  # User-friendly name (e.g., "Work Account")
    created: datetime
    updated: datetime
```

**Supported Providers:**
- `openai` → `OPENAI_API_KEY`
- `anthropic` → `ANTHROPIC_API_KEY`
- `gemini` / `google` → `GOOGLE_API_KEY`
- `mistral` → `MISTRAL_API_KEY`
- `deepseek` → `DEEPSEEK_API_KEY`
- `xai` → `XAI_API_KEY`
- `groq` → `GROQ_API_KEY`
- `voyage` → `VOYAGE_API_KEY`
- `elevenlabs` → `ELEVENLABS_API_KEY`
- `cohere` → `COHERE_API_KEY`
- `openrouter` → `OPENROUTER_API_KEY`

### 2.2 Encryption

**Location:** `open_notebook/utils/crypto.py`

**Encryption Method:** Fernet (AES-128 symmetric encryption)

**Key Management:**
1. **Priority 1:** `FERNET_SECRET_KEY` environment variable
2. **Priority 2:** `FERNET_SECRET_FILE` environment variable (path to key file)
3. **Priority 3:** `/mydata/.secrets/fernet.key` (persistent storage)
4. **Priority 4:** `./.secrets/fernet.key` (local development)
5. **Fallback:** Auto-generate key if none found (logged as warning)

**Security:**
- ✅ Keys encrypted at rest in database
- ✅ Decrypted only in-memory when needed
- ✅ Never logged or exposed in API responses
- ✅ Key file permissions: `0o600` (read/write owner only)

**Usage Pattern:**
```python
# Load user's API keys into environment temporarily
async with user_provider_context(user_id):
    # All AI calls use user's keys
    response = await openai.ChatCompletion.create(...)
# Environment restored after context exits
```

### 2.3 Storage Location

- **Database:** SurrealDB `user_provider_secret` table
- **Encryption Key:** `/mydata/.secrets/fernet.key` (or env var)
- **Per-User:** Each user can have multiple provider secrets
- **Isolation:** Secrets filtered by `user` field in queries

---

## 3. File Storage

### 3.1 Uploaded Files (Sources)

**Location:** `api/routers/sources.py`

**Storage Path:** 
- **Production:** `/mydata/uploads/` (persistent storage)
- **Local Dev:** `./data/uploads/`

**File Organization:**
- ❌ **NOT user-specific folders** - All files in flat structure
- Files stored with original filename (or `filename (1).pdf` if duplicate)
- File path stored in database: `source.asset.file_path`

**Example:**
```
/mydata/uploads/
  ├── research-paper.pdf
  ├── document.pdf
  ├── document (1).pdf
  └── presentation.pptx
```

**Database Reference:**
- `source` table has `asset` field: `{file_path: "/mydata/uploads/file.pdf"}`
- `source.owner` links to user (for access control)

**Security:**
- ✅ Path traversal protection: Files must be within `UPLOADS_FOLDER`
- ✅ User isolation: Files accessible only if `source.owner == current_user.id`
- ✅ Download endpoint validates ownership before serving file

### 3.2 Podcast Audio Files

**Location:** `commands/podcast_commands.py`

**Storage Path:**
- **Local:** `/mydata/podcasts/episodes/{episode_name}/audio/{episode_name}.mp3`
- **S3 (if configured):** `s3://bucket/episodes/{user_id}/{episode_id}/{filename}`

**File Organization:**
- **Local:** Episode name-based folders (not user-specific)
- **S3:** User-specific paths: `episodes/{user_id}/{episode_id}/`

**Database Reference:**
- `episode` table has `audio_file` field
- Contains either local path or S3 URL
- `episode.owner` links to user

**S3 Structure (if enabled):**
```
s3://bucket/
  episodes/
    user:abc123/
      episode:xyz789/
        episode_name.mp3
    user:def456/
      episode:uvw012/
        another_episode.mp3
```

### 3.3 Other Files

**LangGraph Checkpoints:**
- Path: `/mydata/sqlite-db/checkpoints.sqlite`
- Shared across all users (not user-specific)

**TikToken Cache:**
- Path: `/mydata/tiktoken-cache/`
- Shared cache (not user-specific)

---

## 4. Database Resources & User Isolation

### 4.1 Resources with Owner Field

All user-created resources have an `owner` field linking to the user:

| Resource | Table | Owner Field | Index |
|----------|-------|-------------|-------|
| Notebooks | `notebook` | `owner: record<user>` | `notebook_owner_index` |
| Notes | `note` | `owner: record<user>` | `note_owner_index` |
| Sources | `source` | `owner: record<user>` | `source_owner_index` |
| Chat Sessions | `chat_session` | `owner: record<user>` | `chat_session_owner_index` |
| Episode Profiles | `episode_profile` | `owner: record<user>` | `episode_profile_owner_index` |
| Podcast Episodes | `episode` | `owner: record<user>` | `episode_owner_index` |

**Migration:** `migrations/10.surrealql` and `migrations/11.surrealql`

### 4.2 Query Filtering

**Pattern Used:**
```python
# All queries filter by owner
query = """
    SELECT * FROM notebook
    WHERE owner = $owner_id
"""
result = await repo_query(query, {"owner_id": ensure_record_id(current_user.id)})
```

**Enforcement:**
- ✅ All GET endpoints filter by `current_user.id`
- ✅ All CREATE endpoints set `owner = current_user.id`
- ✅ All UPDATE/DELETE endpoints verify ownership before allowing changes
- ✅ Additional Python-level filtering as safety check

**Example (Notebooks):**
```python
@router.get("/notebooks")
async def get_notebooks(current_user: User = Depends(get_current_active_user)):
    query = """
        SELECT * FROM notebook
        WHERE owner = $owner_id
    """
    result = await repo_query(query, {"owner_id": ensure_record_id(current_user.id)})
    # Additional Python-level filter for safety
    filtered = [nb for nb in result if str(nb.get("owner")) == str(current_user.id)]
    return filtered
```

### 4.3 Relationships

**Notebook → Sources:**
- Graph relationship: `source -[reference]-> notebook`
- Sources can belong to multiple notebooks
- Access controlled via `source.owner`

**Notebook → Notes:**
- Graph relationship: `note -[artifact]-> notebook`
- Notes can belong to multiple notebooks
- Access controlled via `note.owner`

**User → API Keys:**
- Direct foreign key: `user_provider_secret.user = user.id`
- One-to-many (user can have multiple provider secrets)

---

## 5. Security Analysis

### 5.1 ✅ Strengths

1. **User Isolation:**
   - All resources filtered by `owner` field
   - Database-level indexes for performance
   - Python-level safety checks

2. **API Key Security:**
   - Encrypted at rest (Fernet)
   - Decrypted only when needed
   - Never exposed in logs or responses

3. **Authentication:**
   - JWT tokens with expiration
   - Server instance ID invalidates tokens on restart
   - Password hashing with Argon2

4. **File Access Control:**
   - Path traversal protection
   - Ownership verification before file access
   - Files only accessible via authenticated endpoints

### 5.2 ⚠️ Areas for Improvement

1. **File Storage Organization:**
   - **Current:** Flat structure (`/mydata/uploads/file.pdf`)
   - **Issue:** No user-specific folders
   - **Risk:** If file path is exposed, harder to identify owner
   - **Recommendation:** Organize as `/mydata/uploads/{user_id}/file.pdf`

2. **Podcast Files (Local):**
   - **Current:** Episode name-based folders
   - **Issue:** Not user-specific
   - **Recommendation:** Use user ID in path: `/mydata/podcasts/{user_id}/{episode_id}/`

3. **Shared Resources:**
   - **LangGraph Checkpoints:** Shared SQLite file
   - **TikToken Cache:** Shared cache
   - **Note:** These are typically fine to share, but worth documenting

4. **API Key Query Pattern:**
   - **Current:** Fetches all secrets, filters in Python
   - **Issue:** Inefficient for large user bases
   - **Recommendation:** Use database-level filtering with proper RecordID matching

---

## 6. Data Storage Summary

### 6.1 Per-User Data

| Data Type | Storage Location | User Isolation | Encryption |
|-----------|------------------|----------------|------------|
| **User Account** | SurrealDB `user` table | ✅ Unique email | ✅ Password hashed |
| **API Keys** | SurrealDB `user_provider_secret` | ✅ Filtered by user | ✅ Fernet encrypted |
| **Notebooks** | SurrealDB `notebook` table | ✅ `owner` field | ❌ Plain text |
| **Notes** | SurrealDB `note` table | ✅ `owner` field | ❌ Plain text |
| **Sources** | SurrealDB `source` table | ✅ `owner` field | ❌ Plain text |
| **Chat Sessions** | SurrealDB `chat_session` table | ✅ `owner` field | ❌ Plain text |
| **Podcast Episodes** | SurrealDB `episode` table | ✅ `owner` field | ❌ Plain text |
| **Uploaded Files** | `/mydata/uploads/` | ⚠️ Access via DB ownership | ❌ Plain files |
| **Podcast Audio (Local)** | `/mydata/podcasts/` | ⚠️ Access via DB ownership | ❌ Plain files |
| **Podcast Audio (S3)** | S3 bucket | ✅ User-specific paths | ❌ Plain files |

### 6.2 Shared Data

| Data Type | Storage Location | Shared Across |
|-----------|------------------|---------------|
| **LangGraph Checkpoints** | `/mydata/sqlite-db/checkpoints.sqlite` | All users |
| **TikToken Cache** | `/mydata/tiktoken-cache/` | All users |
| **Database** | `/mydata/mydatabase.db` | All users (isolated by `owner` field) |

---

## 7. Recommendations for Production

### 7.1 High Priority

1. **User-Specific File Folders:**
   ```python
   # Change from:
   UPLOADS_FOLDER = f"{DATA_FOLDER}/uploads"
   
   # To:
   def get_user_uploads_folder(user_id: str) -> str:
       user_folder = f"{DATA_FOLDER}/uploads/{user_id}"
       os.makedirs(user_folder, exist_ok=True)
       return user_folder
   ```

2. **Improve API Key Queries:**
   - Use proper RecordID matching in SurrealQL queries
   - Avoid fetching all secrets and filtering in Python

3. **Add File Cleanup:**
   - When user deletes source, delete associated file
   - When user account is deleted, cleanup all files

### 7.2 Medium Priority

1. **User-Specific Podcast Folders:**
   ```python
   # Change from:
   output_dir = Path(f"{DATA_FOLDER}/podcasts/episodes/{episode_name}")
   
   # To:
   output_dir = Path(f"{DATA_FOLDER}/podcasts/{user_id}/{episode_id}")
   ```

2. **Add Data Export:**
   - Allow users to export all their data (GDPR compliance)
   - Include files, notebooks, notes, sources

3. **Add Data Deletion:**
   - Allow users to delete their account
   - Cascade delete all associated resources and files

### 7.3 Low Priority

1. **Add Audit Logging:**
   - Log file access attempts
   - Log API key usage (without exposing keys)

2. **Add Quota Management:**
   - Track storage per user
   - Enforce limits

3. **Add Backup Strategy:**
   - Regular backups of database
   - Backup user files to S3

---

## 8. Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACCOUNT                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SurrealDB: user table                                 │  │
│  │ - id: "user:abc123"                                   │  │
│  │ - email: "user@example.com"                           │  │
│  │ - hashed_password: "$argon2id$..."                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ owns
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              USER RESOURCES (SurrealDB)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │notebook  │  │  note    │  │  source  │  │ episode  │   │
│  │owner: FK │  │owner: FK │  │owner: FK │  │owner: FK │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ references
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API KEYS (Encrypted)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SurrealDB: user_provider_secret                       │  │
│  │ - user: "user:abc123"                                  │  │
│  │ - provider: "openai"                                  │  │
│  │ - encrypted_value: "gAAAAABh..." (Fernet)             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ references
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FILES (File System)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /mydata/uploads/                                      │  │
│  │   ├── file1.pdf (referenced by source.asset)         │  │
│  │   └── file2.pdf                                       │  │
│  │                                                       │  │
│  │ /mydata/podcasts/episodes/{name}/                    │  │
│  │   └── audio/{name}.mp3 (referenced by episode)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Conclusion

### Current State: ✅ **Good Foundation**

- ✅ User authentication is secure
- ✅ API keys are encrypted
- ✅ Database resources are properly isolated
- ✅ File access is controlled via ownership

### Areas for Improvement: ⚠️ **File Organization**

- ⚠️ Files not organized by user (flat structure)
- ⚠️ Some shared resources (checkpoints, cache)
- ⚠️ API key queries could be more efficient

### Production Readiness: 🟡 **Mostly Ready**

- **Authentication:** ✅ Production-ready
- **API Keys:** ✅ Production-ready
- **Database Isolation:** ✅ Production-ready
- **File Storage:** ⚠️ Should add user-specific folders
- **Data Cleanup:** ⚠️ Should add deletion workflows

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-12  
**Reviewer:** AI Assistant

