# Solana Integration Quick Reference

## Quick Start Code Examples

### 1. Basic Account Info Fetch

```python
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solders.pubkey import Pubkey

async def get_account_info(address: str):
    """Fetch basic account information."""
    client = AsyncClient("https://api.mainnet-beta.solana.com")
    
    try:
        pubkey = Pubkey.from_string(address)
        response = await client.get_account_info(
            pubkey,
            commitment=Confirmed
        )
        
        if response.value is None:
            return {"error": "Account not found"}
        
        account = response.value
        return {
            "address": str(pubkey),
            "lamports": account.lamports,
            "owner": str(account.owner),
            "executable": account.executable,
            "data_length": len(account.data),
            "rent_epoch": account.rent_epoch
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        await client.close()
```

### 2. Program Accounts Fetch

```python
async def get_program_accounts(program_address: str, limit: int = 100):
    """Fetch all accounts owned by a program."""
    client = AsyncClient("https://api.mainnet-beta.solana.com")
    
    try:
        program_pubkey = Pubkey.from_string(program_address)
        response = await client.get_program_accounts(
            program_pubkey,
            commitment=Confirmed
        )
        
        accounts = []
        for account_info in response.value[:limit]:
            accounts.append({
                "pubkey": str(account_info.pubkey),
                "lamports": account_info.account.lamports,
                "owner": str(account_info.account.owner),
                "data_length": len(account_info.account.data)
            })
        
        return {
            "program": program_address,
            "total_accounts": len(response.value),
            "accounts": accounts
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        await client.close()
```

### 3. Transaction History

```python
async def get_transaction_history(address: str, limit: int = 10):
    """Get recent transaction signatures for an account."""
    client = AsyncClient("https://api.mainnet-beta.solana.com")
    
    try:
        pubkey = Pubkey.from_string(address)
        response = await client.get_signatures_for_address(
            pubkey,
            limit=limit
        )
        
        transactions = []
        for sig_info in response.value:
            transactions.append({
                "signature": str(sig_info.signature),
                "slot": sig_info.slot,
                "block_time": sig_info.block_time,
                "err": str(sig_info.err) if sig_info.err else None
            })
        
        return {"address": address, "transactions": transactions}
    except Exception as e:
        return {"error": str(e)}
    finally:
        await client.close()
```

### 4. Address Validation

```python
from solders.pubkey import Pubkey

def validate_solana_address(address: str) -> bool:
    """Validate Solana address format."""
    try:
        Pubkey.from_string(address)
        return True
    except Exception:
        return False
```

### 5. Basic Contract Analysis Command Structure

```python
# In commands/solana_commands.py
from surreal_commands import CommandInput, CommandOutput
from loguru import logger
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey

async def analyze_solana_contract(input_data: CommandInput) -> CommandOutput:
    """
    Analyze a Solana contract address and create a note with findings.
    
    Expected input:
    {
        "contract_address": "string",
        "notebook_id": "string",
        "user_id": "string"
    }
    """
    try:
        contract_address = input_data.data.get("contract_address")
        notebook_id = input_data.data.get("notebook_id")
        user_id = input_data.data.get("user_id")
        
        if not contract_address:
            raise ValueError("contract_address is required")
        
        # Fetch account info
        client = AsyncClient("https://api.mainnet-beta.solana.com")
        pubkey = Pubkey.from_string(contract_address)
        account_response = await client.get_account_info(pubkey)
        
        if account_response.value is None:
            raise ValueError(f"Account not found: {contract_address}")
        
        account = account_response.value
        
        # Build analysis content
        analysis_content = f"""# Solana Contract Analysis

## Contract Address
`{contract_address}`

## Basic Information
- **Balance**: {account.lamports / 1e9:.9f} SOL
- **Owner Program**: `{account.owner}`
- **Executable**: {'Yes' if account.executable else 'No'}
- **Data Size**: {len(account.data)} bytes
- **Rent Epoch**: {account.rent_epoch}

## Analysis
{'This is an executable program.' if account.executable else 'This is a data account.'}
"""
        
        # Create note (pseudo-code - use actual Note model)
        # note = Note(
        #     title=f"Solana Contract: {contract_address[:8]}...",
        #     content=analysis_content,
        #     note_type="ai"
        # )
        # await note.save()
        # if notebook_id:
        #     await note.add_to_notebook(notebook_id)
        
        await client.close()
        
        return CommandOutput(
            success=True,
            result={
                "contract_address": contract_address,
                "analysis_complete": True,
                "note_id": "note:..."  # Return created note ID
            }
        )
        
    except Exception as e:
        logger.error(f"Error analyzing Solana contract: {e}")
        return CommandOutput(
            success=False,
            error_message=str(e)
        )
```

### 6. API Endpoint Example

```python
# In api/routers/sources.py
from pydantic import BaseModel, Field
from surreal_commands import submit_command

class SolanaSourceCreate(BaseModel):
    contract_address: str = Field(..., description="Solana contract address")
    notebook_id: Optional[str] = Field(None, description="Notebook to add source to")
    analysis_type: Literal["basic", "detailed", "full"] = Field(
        "basic", description="Level of analysis"
    )

@router.post("/sources/solana")
async def create_solana_source(
    request: SolanaSourceCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a source from a Solana contract address."""
    
    # Validate address
    from solders.pubkey import Pubkey
    try:
        Pubkey.from_string(request.contract_address)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid Solana address format"
        )
    
    # Create source record
    source = Source(
        title=f"Solana Contract: {request.contract_address[:8]}...",
        asset=None,  # No file asset
        # Could add custom field: solana_address=request.contract_address
    )
    await source.save()
    
    # Link to notebook if provided
    if request.notebook_id:
        await source.add_to_notebook(request.notebook_id)
    
    # Submit analysis command
    command_args = {
        "contract_address": request.contract_address,
        "notebook_id": request.notebook_id,
        "user_id": current_user.id,
        "source_id": source.id,
        "analysis_type": request.analysis_type
    }
    
    job_id = submit_command(
        "open_notebook",
        "analyze_solana_contract",
        command_args
    )
    
    if job_id:
        source.command = ensure_record_id(str(job_id))
        await source.save()
    
    return SourceResponse(
        id=source.id,
        title=source.title,
        # ... other fields
    )
```

### 7. Frontend Component Example

```typescript
// components/sources/SolanaContractInput.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export function SolanaContractInput({ notebookId }: { notebookId?: string }) {
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const validateAddress = (addr: string): boolean => {
    // Basic validation - 32-44 character base58 string
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
  }

  const handleSubmit = async () => {
    if (!validateAddress(address)) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Solana address',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/sources/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: address,
          notebook_id: notebookId,
          analysis_type: 'basic'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create source')
      }

      toast({
        title: 'Success',
        description: 'Solana contract analysis started'
      })
      setAddress('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to analyze contract',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Enter Solana contract address..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={isLoading}
      />
      <Button onClick={handleSubmit} disabled={isLoading || !address}>
        {isLoading ? 'Analyzing...' : 'Analyze Contract'}
      </Button>
    </div>
  )
}
```

---

## Common Solana Addresses (for testing)

### Mainnet Programs
- **System Program**: `11111111111111111111111111111111`
- **Token Program**: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- **Associated Token Program**: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`
- **Metaplex Token Metadata**: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`

### Devnet (for testing)
- Use same program IDs, but connect to devnet RPC

---

## Error Handling Patterns

```python
from solana.rpc.api import RPCException
from solders.rpc.errors import InvalidParamsMessage

async def safe_solana_call(func, *args, **kwargs):
    """Wrapper for Solana RPC calls with error handling."""
    try:
        return await func(*args, **kwargs)
    except RPCException as e:
        logger.error(f"RPC Error: {e}")
        return {"error": f"RPC Error: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"error": f"Unexpected error: {str(e)}"}
```

---

## Rate Limiting Considerations

```python
import asyncio
from collections import deque
from time import time

class RateLimiter:
    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period
        self.calls = deque()

    async def acquire(self):
        now = time()
        # Remove old calls outside the period
        while self.calls and self.calls[0] < now - self.period:
            self.calls.popleft()
        
        if len(self.calls) >= self.max_calls:
            sleep_time = self.period - (now - self.calls[0])
            await asyncio.sleep(sleep_time)
            return await self.acquire()
        
        self.calls.append(now)

# Usage
rate_limiter = RateLimiter(max_calls=10, period=1.0)  # 10 calls per second
await rate_limiter.acquire()
# Make RPC call
```

---

*Quick Reference - See SOLANA_INTEGRATION_RESEARCH.md for detailed documentation*



