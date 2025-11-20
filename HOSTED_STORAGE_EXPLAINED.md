# Hosted Storage Architecture - Files & Podcasts

This document explains how file and podcast storage works when the application is hosted on Render or similar platforms.

---

## Overview: Two Storage Strategies

Your application uses **two different storage approaches**:

1. **Local Filesystem** (Persistent Disk) - For uploaded files (PDFs, documents, etc.)
2. **S3 Storage** (Optional) - For podcast audio files (recommended for production)

---

## Part 1: Uploaded Files (Sources)

### Current Implementation

**Storage Location:**
- **Local Dev:** `./data/uploads/`
- **Production (Render):** `/mydata/uploads/` (persistent disk)

**How It Works:**

```python
# config.py automatically detects environment
DATA_FOLDER = get_data_folder()
# Returns:
# - /mydata if it exists (Render persistent disk)
# - ./data if local development

UPLOADS_FOLDER = f"{DATA_FOLDER}/uploads"
# Production: /mydata/uploads/
# Local: ./data/uploads/
```

### On Render (Hosted)

**Persistent Disk Mount:**
```yaml
# render.yaml
disk:
  name: ephitup-data
  mountPath: /mydata
  sizeGB: 10  # Start with 10GB, increase as needed
```

**What Gets Stored:**
```
/mydata/
  ├── uploads/                    # User uploaded files
  │   ├── research-paper.pdf
  │   ├── document.pdf
  │   └── presentation.pptx
  ├── mydatabase.db               # SurrealDB database
  ├── sqlite-db/                  # LangGraph checkpoints
  │   └── checkpoints.sqlite
  ├── podcasts/                   # Podcast audio (if not using S3)
  │   └── episodes/
  └── .secrets/                   # Encryption keys
      └── fernet.key
```

**File Serving:**
```python
# api/routers/sources.py
@router.get("/sources/{source_id}/download")
async def download_source_file(source_id: str):
    # 1. Verify user owns the source
    # 2. Get file path from database
    # 3. Validate path is within UPLOADS_FOLDER (security)
    # 4. Return FileResponse (FastAPI streams file to user)
    return FileResponse(path=resolved_path, filename=filename)
```

**Flow:**
1. User uploads file → Saved to `/mydata/uploads/file.pdf`
2. Database stores: `source.asset.file_path = "/mydata/uploads/file.pdf"`
3. User requests download → Backend validates ownership → Streams file

### Pros & Cons

**✅ Pros:**
- Simple setup (no external service needed)
- Fast access (local filesystem)
- Cost-effective for small-medium usage
- Works out of the box

**⚠️ Cons:**
- Limited by disk size (10GB default, $0.25/GB/month)
- Not scalable across multiple servers
- Files lost if disk fails (backup needed)
- Server restart doesn't affect files (persistent disk)

### Storage Costs (Render)

- **10GB disk:** $2.50/month
- **20GB disk:** $5.00/month
- **50GB disk:** $12.50/month

**Recommendation:** Start with 10GB, monitor usage, increase as needed.

---

## Part 2: Podcast Audio Files

### Two Storage Options

#### Option 1: Local Filesystem (Default)

**Storage Location:**
- **Local Dev:** `./data/podcasts/episodes/{episode_name}/audio/{episode_name}.mp3`
- **Production:** `/mydata/podcasts/episodes/{episode_name}/audio/{episode_name}.mp3`

**How It Works:**
```python
# commands/podcast_commands.py
output_dir = Path(f"{DATA_FOLDER}/podcasts/episodes/{episode_name}")
# Generate audio → Save to output_dir/audio/episode_name.mp3
episode.audio_file = str(final_audio_path.resolve())
# Database stores: episode.audio_file = "/mydata/podcasts/episodes/name/audio/name.mp3"
```

**File Serving:**
```python
# api/routers/podcasts.py
@router.get("/podcasts/episodes/{episode_id}/audio")
async def stream_podcast_episode_audio(episode_id: str):
    # 1. Get episode from database
    # 2. Check if audio_file is local path or S3 URL
    # 3. If local: Stream from filesystem
    # 4. If S3: Download from S3 and stream
    return FileResponse(path=audio_path, media_type="audio/mpeg")
```

**⚠️ Problem:**
- Podcast files are **large** (10-50MB+ per episode)
- Fills up disk quickly
- Not ideal for production

#### Option 2: S3 Storage (Recommended)

**Storage Location:**
- **S3 Bucket:** `s3://bucket/episodes/{user_id}/{episode_id}/{filename}.mp3`

**How It Works:**

**1. Generation:**
```python
# commands/podcast_commands.py
if is_s3_configured():
    # Upload to S3
    key = build_episode_asset_key(user_id, episode_id, filename)
    storage_url = await upload_file(final_audio_path, key, content_type="audio/mpeg")
    episode.audio_file = storage_url  # "s3://bucket/episodes/user123/ep456/file.mp3"
    
    # Delete local copy to save disk space
    final_audio_path.unlink()
else:
    # Fallback to local storage
    episode.audio_file = str(final_audio_path.resolve())
```

**2. S3 Structure:**
```
s3://your-bucket/
  episodes/
    user:abc123/
      episode:xyz789/
        episode_name.mp3
    user:def456/
      episode:uvw012/
        another_episode.mp3
```

**3. File Serving:**
```python
# api/routers/podcasts.py
if episode.audio_file.startswith("s3://"):
    # Download from S3 to temp file
    client.download_file(bucket, key, temp_path)
    # Stream to user
    return FileResponse(temp_path, media_type="audio/mpeg")
else:
    # Serve from local filesystem
    return FileResponse(audio_path, media_type="audio/mpeg")
```

**Configuration:**
```yaml
# render.yaml - Optional S3 env vars
envVars:
  - key: S3_BUCKET_NAME
    sync: false
  - key: AWS_ACCESS_KEY_ID
    sync: false
  - key: AWS_SECRET_ACCESS_KEY
    sync: false
  - key: S3_REGION
    value: "us-east-2"
```

### Pros & Cons

**✅ Pros (S3):**
- Unlimited storage (scales automatically)
- Cost-effective ($0.023/GB/month for storage)
- Reliable (99.999999999% durability)
- Can serve directly via CloudFront CDN (faster)
- Doesn't fill up server disk

**⚠️ Cons (S3):**
- Requires AWS account setup
- Additional cost (but usually cheaper than disk)
- Slightly slower access (network vs local)

**✅ Pros (Local):**
- No setup needed
- Fast access
- Works immediately

**⚠️ Cons (Local):**
- Limited by disk size
- Fills up quickly with podcasts
- Not scalable

---

## Part 3: How It Works When Hosted

### Render Deployment Flow

**1. Persistent Disk Setup:**
```
Render creates persistent disk → Mounts at /mydata → Survives deployments
```

**2. File Upload Flow:**
```
User uploads PDF
  ↓
Backend saves to /mydata/uploads/file.pdf
  ↓
Database stores path: "/mydata/uploads/file.pdf"
  ↓
File persists across deployments (disk survives)
```

**3. Podcast Generation Flow (With S3):**
```
User generates podcast
  ↓
Worker generates audio → Saves temporarily to /mydata/podcasts/...
  ↓
Uploads to S3 → Gets URL: "s3://bucket/episodes/user/ep/file.mp3"
  ↓
Deletes local copy (saves disk space)
  ↓
Database stores S3 URL
  ↓
User requests audio → Backend downloads from S3 → Streams to user
```

**4. Podcast Generation Flow (Without S3):**
```
User generates podcast
  ↓
Worker generates audio → Saves to /mydata/podcasts/episodes/name/audio/name.mp3
  ↓
Database stores path: "/mydata/podcasts/episodes/name/audio/name.mp3"
  ↓
File persists on disk (takes up space)
  ↓
User requests audio → Backend streams from disk
```

---

## Part 4: Storage Architecture Diagram

### Current Setup (Render)

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDER SERVER                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Persistent Disk (/mydata)                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ /mydata/uploads/                              │  │  │
│  │  │   ├── file1.pdf                              │  │  │
│  │  │   └── file2.pdf                              │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ /mydata/podcasts/ (if not using S3)          │  │  │
│  │  │   └── episodes/                              │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │ /mydata/mydatabase.db                        │  │  │
│  │  │   (SurrealDB - stores file paths)            │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Application Code                            │  │
│  │  - FastAPI backend                                  │  │
│  │  - File upload/download endpoints                   │  │
│  │  - Podcast generation                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (Optional)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS S3 BUCKET                            │
│                                                             │
│  s3://your-bucket/                                          │
│    episodes/                                                │
│      user:abc123/                                           │
│        episode:xyz789/                                      │
│          episode_name.mp3                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 5: Storage Recommendations

### For Production (Recommended Setup)

**1. Uploaded Files (Sources):**
- ✅ **Keep on persistent disk** (`/mydata/uploads/`)
- ✅ Start with 10GB disk ($2.50/month)
- ✅ Monitor usage, increase as needed
- ✅ Consider S3 migration if >50GB needed

**2. Podcast Audio:**
- ✅ **Use S3** (highly recommended)
- ✅ Saves disk space
- ✅ Scales infinitely
- ✅ Cost-effective (~$0.023/GB/month)
- ✅ More reliable

**3. Database:**
- ✅ **Keep on persistent disk** (`/mydata/mydatabase.db`)
- ✅ Small size (usually <100MB)
- ✅ Critical data (backup regularly)

### Cost Comparison

**Scenario: 100 podcast episodes, 20MB each = 2GB**

**Option 1: Local Disk**
- Disk cost: 10GB → 12GB = +$0.50/month
- **Total: $0.50/month**

**Option 2: S3**
- Storage: 2GB × $0.023 = $0.046/month
- Requests: ~1000 downloads × $0.0004 = $0.40/month
- **Total: ~$0.45/month**

**Verdict:** S3 is slightly cheaper and scales better.

---

## Part 6: File Access & Security

### Access Control

**Uploaded Files:**
```python
# api/routers/sources.py
@router.get("/sources/{source_id}/download")
async def download_source_file(source_id: str, current_user: User = Depends(...)):
    source = await Source.get(source_id)
    
    # Security check: Verify user owns the source
    if source.owner != current_user.id:
        raise HTTPException(403, "Access denied")
    
    # Path traversal protection
    if not resolved_path.startswith(UPLOADS_FOLDER):
        raise HTTPException(403, "Access denied")
    
    return FileResponse(path=resolved_path)
```

**Podcast Audio:**
```python
# api/routers/podcasts.py
@router.get("/podcasts/episodes/{episode_id}/audio")
async def stream_podcast_episode_audio(episode_id: str, current_user: User = Depends(...)):
    episode = await PodcastEpisode.get(episode_id)
    
    # Security check: Verify user owns the episode
    if episode.owner != current_user.id:
        raise HTTPException(403, "Access denied")
    
    # Stream audio (from disk or S3)
    return FileResponse(...)
```

**✅ Security Features:**
- User ownership verification
- Path traversal protection
- Authentication required
- Files never exposed directly (always through backend)

---

## Part 7: Scalability Considerations

### Current Limitations

**1. Single Server:**
- All files on one persistent disk
- Can't scale horizontally (multiple servers)
- Disk size limits total storage

**2. File Serving:**
- Backend streams all files (adds load)
- No CDN for faster global access
- Bandwidth costs on Render

### Future Improvements

**1. S3 for All Files:**
- Migrate uploaded files to S3
- Use CloudFront CDN for faster access
- Scales infinitely

**2. Direct S3 URLs:**
- Generate presigned URLs
- Files served directly from S3 (no backend load)
- Faster for users

**3. Multi-Server Support:**
- Store all files in S3
- Multiple backend servers can access same files
- True horizontal scaling

---

## Part 8: Backup Strategy

### Current State

**✅ Persistent Disk:**
- Survives deployments
- Survives server restarts
- **But:** Not backed up automatically

**⚠️ Risk:**
- Disk failure → All files lost
- Accidental deletion → Files gone
- No version history

### Recommended Backup

**1. Database Backup:**
```bash
# Regular SurrealDB exports
surreal export --conn ws://localhost:8000 --user root --pass <pass> \
  --ns open_notebook --db production backup.json
```

**2. File Backup:**
- **Option A:** Regular S3 sync (if using S3)
- **Option B:** Periodic disk snapshots (Render feature)
- **Option C:** Manual backup script

**3. S3 Versioning:**
- Enable S3 versioning for podcasts
- Automatic backup of all versions
- Can restore deleted files

---

## Summary

### Current Setup (Render)

**Uploaded Files:**
- ✅ Stored on persistent disk (`/mydata/uploads/`)
- ✅ Survives deployments
- ✅ Served by backend
- ⚠️ Limited by disk size

**Podcast Audio:**
- ✅ Can use S3 (recommended) or local disk
- ✅ S3: Unlimited, scalable, cost-effective
- ✅ Local: Simple but limited

**Database:**
- ✅ Stored on persistent disk
- ✅ Survives deployments
- ⚠️ Should backup regularly

### Recommendations

1. **Start Simple:** Use persistent disk for everything
2. **Add S3 for Podcasts:** When you have many podcasts
3. **Monitor Disk Usage:** Increase disk size as needed
4. **Consider S3 Migration:** If disk costs exceed S3 costs
5. **Backup Regularly:** Database and important files

### Cost Estimate (Monthly)

**Small Usage (10GB disk, no S3):**
- Disk: $2.50/month
- **Total: $2.50/month**

**Medium Usage (20GB disk, S3 for podcasts):**
- Disk: $5.00/month
- S3 (5GB podcasts): ~$0.12/month
- **Total: ~$5.12/month**

**Large Usage (50GB disk, S3 for podcasts):**
- Disk: $12.50/month
- S3 (20GB podcasts): ~$0.46/month
- **Total: ~$12.96/month**

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-12

