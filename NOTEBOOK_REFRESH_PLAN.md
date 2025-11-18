# Notebook List Refresh Issue - Analysis & Fix Plan

## Problem

When a user creates a new notebook/project, the list doesn't update automatically. User must manually refresh the page to see the new notebook.

---

## Current Flow Analysis

### 1. Creation Flow

**Step 1: User Submits Form**
```typescript
// CreateNotebookDialog.tsx:64-70
const onSubmit = async (data: CreateNotebookFormData) => {
  await createNotebook.mutateAsync(data)  // ← Mutation happens here
  closeDialog()                            // ← Dialog closes immediately
  reset()
  window.dispatchEvent(new CustomEvent(NOTEBOOK_CREATED_EVENT))  // ← Event dispatched
}
```

**Step 2: Mutation Success Handler**
```typescript
// use-notebooks.ts:32-37
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notebooks })  // ← Invalidates cache
  toast({ title: 'Success', description: 'Notebook created successfully' })
}
```

**Step 3: Event Listener**
```typescript
// notebooks/page.tsx:314-335
useEffect(() => {
  const handleNotebookCreated = () => {
    refetch()  // ← Manual refetch called
    // ... scroll logic
  }
  window.addEventListener(NOTEBOOK_CREATED_EVENT, handleNotebookCreated)
  return () => window.removeEventListener(NOTEBOOK_CREATED_EVENT, handleNotebookCreated)
}, [refetch])
```

### 2. Query Key Mismatch Issue

**Problem Identified:**

```typescript
// Query key used in useNotebooks:
QUERY_KEYS.notebooks = ['notebooks']
// But actual query key includes more:
[...QUERY_KEYS.notebooks, { archived, userId }]
// = ['notebooks', { archived: false, userId: 'user:123' }]

// Invalidation only uses:
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notebooks })
// = ['notebooks']  ← Should match, but might have timing issues
```

**React Query Behavior:**
- `invalidateQueries` with partial key should match all queries starting with that key
- However, there might be a race condition or the refetch isn't happening immediately
- The event listener approach (`refetch()`) should work, but might be called before mutation completes

---

## Root Causes

### Issue #1: Race Condition
- Dialog closes (`closeDialog()`) before mutation fully completes
- Event dispatched immediately after `mutateAsync` resolves
- But React Query invalidation/refetch might still be in progress
- Event listener's `refetch()` might execute before invalidation completes

### Issue #2: Query Key Invalidation Scope
- `invalidateQueries({ queryKey: QUERY_KEYS.notebooks })` should match all notebook queries
- But if there are multiple queries with different `archived`/`userId` params, they might not all refetch
- Need to ensure all notebook-related queries are invalidated

### Issue #3: Event Timing
- Event is dispatched synchronously after `mutateAsync` resolves
- But React Query's `onSuccess` callback might execute asynchronously
- The event might fire before the cache is actually invalidated

### Issue #4: Missing Refetch Type
- `invalidateQueries` without `refetchType: 'active'` might not immediately refetch
- Should explicitly request immediate refetch of active queries

---

## Solution Plan

### Option 1: Fix React Query Invalidation (Recommended)

**Changes Needed:**

1. **Update `useCreateNotebook` to properly invalidate and refetch:**
   ```typescript
   // use-notebooks.ts
   onSuccess: () => {
     // Invalidate all notebook queries (matches partial key)
     queryClient.invalidateQueries({ 
       queryKey: QUERY_KEYS.notebooks,
       refetchType: 'active'  // ← Explicitly refetch active queries
     })
     toast({ title: 'Success', description: 'Notebook created successfully' })
   }
   ```

2. **Remove event listener approach** (no longer needed):
   ```typescript
   // notebooks/page.tsx - Remove the useEffect with NOTEBOOK_CREATED_EVENT
   // The React Query invalidation should handle it automatically
   ```

3. **Ensure query key matching:**
   - Verify that `invalidateQueries` with `['notebooks']` matches `['notebooks', { archived, userId }]`
   - React Query should handle this, but we can test

**Pros:**
- Uses React Query's built-in cache invalidation (more reliable)
- Removes custom event system (simpler code)
- Follows React Query best practices
- Works consistently across all notebook list queries

**Cons:**
- Need to verify query key matching works correctly
- Might need to adjust if there are edge cases

---

### Option 2: Optimistic Updates (Better UX)

**Changes Needed:**

1. **Add optimistic update to mutation:**
   ```typescript
   // use-notebooks.ts
   return useMutation({
     mutationFn: (data: CreateNotebookRequest) => notebooksApi.create(data),
     onMutate: async (newNotebook) => {
       // Cancel outgoing refetches
       await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notebooks })
       
       // Snapshot previous value
       const previousNotebooks = queryClient.getQueriesData({ 
         queryKey: QUERY_KEYS.notebooks 
       })
       
       // Optimistically update cache
       queryClient.setQueriesData(
         { queryKey: QUERY_KEYS.notebooks },
         (old: NotebookResponse[] = []) => [
           {
             id: 'temp-id',  // Temporary ID
             name: newNotebook.name,
             description: newNotebook.description || '',
             archived: false,
             created: new Date().toISOString(),
             updated: new Date().toISOString(),
             source_count: 0,
             note_count: 0,
           },
           ...old
         ]
       )
       
       return { previousNotebooks }
     },
     onError: (err, newNotebook, context) => {
       // Rollback on error
       if (context?.previousNotebooks) {
         context.previousNotebooks.forEach(([queryKey, data]) => {
           queryClient.setQueryData(queryKey, data)
         })
       }
     },
     onSuccess: (data, variables, context) => {
       // Replace optimistic update with real data
       queryClient.setQueriesData(
         { queryKey: QUERY_KEYS.notebooks },
         (old: NotebookResponse[] = []) => {
           const withoutTemp = old.filter(nb => nb.id !== 'temp-id')
           return [data, ...withoutTemp]
         }
       )
       // Then invalidate to ensure consistency
       queryClient.invalidateQueries({ 
         queryKey: QUERY_KEYS.notebooks,
         refetchType: 'active'
       })
     },
     onSettled: () => {
       // Always refetch to ensure we have latest data
       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notebooks })
     }
   })
   ```

**Pros:**
- Instant UI update (no waiting for server response)
- Better user experience
- Shows notebook immediately

**Cons:**
- More complex code
- Need to handle rollback on error
- Need to match server response format exactly

---

### Option 3: Hybrid Approach (Simplest Fix)

**Changes Needed:**

1. **Fix invalidation in `useCreateNotebook`:**
   ```typescript
   onSuccess: () => {
     queryClient.invalidateQueries({ 
       queryKey: QUERY_KEYS.notebooks,
       refetchType: 'active'  // ← Add this
     })
     toast({ title: 'Success', description: 'Notebook created successfully' })
   }
   ```

2. **Keep event listener but add delay:**
   ```typescript
   // notebooks/page.tsx
   const handleNotebookCreated = () => {
     // Small delay to ensure mutation completes
     setTimeout(() => {
       refetch()
     }, 100)
   }
   ```

3. **Or better: Wait for mutation to complete:**
   ```typescript
   // CreateNotebookDialog.tsx
   const onSubmit = async (data: CreateNotebookFormData) => {
     try {
       await createNotebook.mutateAsync(data)
       // Wait a bit for React Query to process invalidation
       await new Promise(resolve => setTimeout(resolve, 50))
       closeDialog()
       reset()
       // Event is backup, but shouldn't be needed
       window.dispatchEvent(new CustomEvent(NOTEBOOK_CREATED_EVENT))
     } catch (error) {
       // Error handling
     }
   }
   ```

**Pros:**
- Minimal changes
- Keeps existing event system as backup
- Should work reliably

**Cons:**
- Still uses custom event system (not ideal)
- Has artificial delay (not great UX)

---

## Recommended Solution: Option 1 + Option 2 Hybrid

### Implementation Steps:

1. **Fix `useCreateNotebook` invalidation:**
   ```typescript
   // use-notebooks.ts
   export function useCreateNotebook() {
     const queryClient = useQueryClient()
     const { toast } = useToast()

     return useMutation({
       mutationFn: (data: CreateNotebookRequest) => notebooksApi.create(data),
       onSuccess: (newNotebook) => {
         // Invalidate all notebook queries with explicit refetch
         queryClient.invalidateQueries({ 
           queryKey: QUERY_KEYS.notebooks,
           refetchType: 'active'  // ← Key change: explicitly refetch active queries
         })
         toast({
           title: 'Success',
           description: 'Notebook created successfully',
         })
       },
       onError: () => {
         toast({
           title: 'Error',
           description: 'Failed to create notebook',
           variant: 'destructive',
         })
       },
     })
   }
   ```

2. **Update `CreateNotebookDialog` to wait for mutation:**
   ```typescript
   // CreateNotebookDialog.tsx
   const onSubmit = async (data: CreateNotebookFormData) => {
     try {
       await createNotebook.mutateAsync(data)
       // Mutation's onSuccess will handle cache invalidation
       // Small delay to ensure React Query processes invalidation
       await new Promise(resolve => setTimeout(resolve, 100))
       closeDialog()
       reset()
       // Keep event as backup (can remove later if not needed)
       window.dispatchEvent(new CustomEvent(NOTEBOOK_CREATED_EVENT))
     } catch (error) {
       // Error already handled in mutation's onError
     }
   }
   ```

3. **Keep event listener temporarily (as backup):**
   ```typescript
   // notebooks/page.tsx - Keep existing event listener
   // Can remove later once we verify React Query invalidation works
   ```

4. **Test and verify:**
   - Create a notebook
   - Verify it appears immediately without refresh
   - If it works, remove event listener code
   - If it doesn't, investigate query key matching

---

## Testing Plan

1. **Test Case 1: Basic Creation**
   - Create notebook → Should appear immediately
   - Check browser network tab → Should see refetch request

2. **Test Case 2: Multiple Notebooks**
   - Create multiple notebooks quickly
   - All should appear in list

3. **Test Case 3: Different Query States**
   - Create notebook while viewing archived notebooks
   - Create notebook while viewing active notebooks
   - Both should update correctly

4. **Test Case 4: Error Handling**
   - Simulate network error during creation
   - Verify error toast appears
   - Verify list doesn't show phantom notebook

---

## Files to Modify

1. **`frontend/src/lib/hooks/use-notebooks.ts`**
   - Add `refetchType: 'active'` to `invalidateQueries`

2. **`frontend/src/components/notebooks/CreateNotebookDialog.tsx`**
   - Add small delay after mutation (or remove event dispatch if not needed)

3. **`frontend/src/app/(dashboard)/notebooks/page.tsx`** (Optional)
   - Remove event listener if React Query invalidation works reliably

---

## Expected Outcome

After implementing the fix:
- ✅ New notebook appears immediately after creation
- ✅ No manual refresh needed
- ✅ Works consistently across all scenarios
- ✅ Cleaner code (no custom event system needed)

---

## Alternative: Debug Current Issue

If we want to understand why it's not working currently:

1. **Add logging:**
   ```typescript
   // In useCreateNotebook
   onSuccess: () => {
     console.log('Mutation success, invalidating queries')
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notebooks })
     console.log('Queries invalidated')
   }
   
   // In event listener
   const handleNotebookCreated = () => {
     console.log('Event received, calling refetch')
     refetch()
     console.log('Refetch called')
   }
   ```

2. **Check React Query DevTools:**
   - Install React Query DevTools
   - Monitor query state changes
   - See if invalidation is happening
   - See if refetch is triggered

3. **Check Network Tab:**
   - See if refetch request is sent
   - Check timing relative to mutation

---

## Summary

**Root Cause:** React Query invalidation might not be triggering immediate refetch, or there's a race condition between mutation completion and cache invalidation.

**Fix:** Add `refetchType: 'active'` to `invalidateQueries` call and ensure mutation completes before closing dialog.

**Priority:** High - This is a core UX issue that affects user experience significantly.

---

**Document Version:** 1.0  
**Created:** 2025-01-12

