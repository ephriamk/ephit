import asyncio
import os
import sqlite3
import sys
from typing import Annotated, Optional

# Import encoding fix first to ensure UTF-8 encoding
from open_notebook.utils.encoding_fix import ensure_utf8_encoding
ensure_utf8_encoding()

from ai_prompter import Prompter
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from open_notebook.config import LANGGRAPH_CHECKPOINT_FILE
from open_notebook.domain.notebook import Notebook
from open_notebook.graphs.utils import provision_langchain_model


class ThreadState(TypedDict):
    messages: Annotated[list, add_messages]
    notebook: Optional[Notebook]
    context: Optional[str]
    context_config: Optional[dict]
    model_override: Optional[str]


async def call_model_with_messages_async(state: ThreadState, config: RunnableConfig) -> dict:
    """Async version of call_model_with_messages."""
    system_prompt = Prompter(prompt_template="chat").render(data=state)  # type: ignore[arg-type]
    payload = [SystemMessage(content=system_prompt)] + state.get("messages", [])
    model_id = config.get("configurable", {}).get("model_id") or state.get(
        "model_override"
    )

    # Provision model (async)
    model = await provision_langchain_model(
        str(payload), model_id, "chat", max_tokens=8192
    )

    # Use ainvoke (non-streaming) for simplicity and reliability
    try:
        from langchain_core.messages import AIMessage
        ai_message = await model.ainvoke(payload)
        return {"messages": ai_message}
    except UnicodeEncodeError as e:
        import traceback
        error_msg = f"Unicode encoding error in model.ainvoke: {e}"
        try:
            from loguru import logger
            logger.error(error_msg)
            logger.debug(traceback.format_exc())
        except Exception:
            pass
        raise UnicodeEncodeError(
            e.encoding,
            e.object,
            e.start,
            e.end,
            f"{e.reason}. This may be caused by Unicode characters in the chat content."
        ) from e


def call_model_with_messages(state: ThreadState, config: RunnableConfig) -> dict:
    system_prompt = Prompter(prompt_template="chat").render(data=state)  # type: ignore[arg-type]
    payload = [SystemMessage(content=system_prompt)] + state.get("messages", [])
    model_id = config.get("configurable", {}).get("model_id") or state.get(
        "model_override"
    )

    # Handle async model provisioning from sync context
    def run_in_new_loop():
        """Run the async function in a new event loop"""
        new_loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(new_loop)
            # Ensure UTF-8 encoding in the new event loop's thread
            os.environ['PYTHONIOENCODING'] = 'utf-8'
            return new_loop.run_until_complete(
                provision_langchain_model(
                    str(payload), model_id, "chat", max_tokens=8192
                )
            )
        finally:
            new_loop.close()
            asyncio.set_event_loop(None)

    try:
        # Try to get the current event loop
        asyncio.get_running_loop()
        # If we're in an event loop, run in a thread with a new loop
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_in_new_loop)
            model = future.result()
    except RuntimeError:
        # No event loop running, safe to use asyncio.run()
        # Ensure UTF-8 encoding
        os.environ['PYTHONIOENCODING'] = 'utf-8'
        model = asyncio.run(
            provision_langchain_model(
                str(payload),
                model_id,
                "chat",
                max_tokens=8192,
            )
        )

    # Invoke model with proper error handling for Unicode issues
    try:
        ai_message = model.invoke(payload)
    except UnicodeEncodeError as e:
        # Log the error with safe encoding
        import traceback
        error_msg = f"Unicode encoding error in model.invoke: {e}"
        try:
            from loguru import logger
            logger.error(error_msg)
            logger.debug(traceback.format_exc())
        except Exception:
            pass  # If logging fails, continue
        # Re-raise with more context
        raise UnicodeEncodeError(
            e.encoding,
            e.object,
            e.start,
            e.end,
            f"{e.reason}. This may be caused by Unicode characters in the chat content."
        ) from e
    
    return {"messages": ai_message}


conn = sqlite3.connect(
    LANGGRAPH_CHECKPOINT_FILE,
    check_same_thread=False,
)
memory = SqliteSaver(conn)

agent_state = StateGraph(ThreadState)
agent_state.add_node("agent", call_model_with_messages)
agent_state.add_edge(START, "agent")
agent_state.add_edge("agent", END)
graph = agent_state.compile(checkpointer=memory)

# Async graph for streaming (uses AsyncSqliteSaver)
_async_graph = None
_async_conn = None

async def get_async_graph():
    """Get or create async graph instance for streaming."""
    global _async_graph, _async_conn
    if _async_graph is None:
        import aiosqlite
        _async_conn = await aiosqlite.connect(LANGGRAPH_CHECKPOINT_FILE)
        async_memory = AsyncSqliteSaver(_async_conn)
        
        # Create async graph with async node
        async_agent_state = StateGraph(ThreadState)
        async_agent_state.add_node("agent", call_model_with_messages_async)
        async_agent_state.add_edge(START, "agent")
        async_agent_state.add_edge("agent", END)
        _async_graph = async_agent_state.compile(checkpointer=async_memory)
    return _async_graph
