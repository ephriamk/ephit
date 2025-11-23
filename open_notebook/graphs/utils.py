from esperanto import LanguageModel
from langchain_core.language_models.chat_models import BaseChatModel
from loguru import logger

from open_notebook.domain.models import model_manager
from open_notebook.utils import token_count


async def provision_langchain_model(
    content, model_id, default_type, **kwargs
) -> BaseChatModel:
    """
    Returns the best model to use based on the context size and on whether there is a specific model being requested in Config.
    If context > 105_000, returns the large_context_model
    If model_id is specified in Config, returns that model
    Otherwise, returns the default model for the given type
    """
    tokens = token_count(content)

    if tokens > 105_000:
        logger.debug(
            f"Using large context model because the content has {tokens} tokens"
        )
        model = await model_manager.get_default_model("large_context", **kwargs)
        if model is None:
            raise ValueError(
                "No large context model configured. Please set a default large context model in Settings > Models."
            )
    elif model_id:
        model = await model_manager.get_model(model_id, **kwargs)
        if model is None:
            raise ValueError(
                f"Model '{model_id}' not found or not configured. Please check your model configuration."
            )
    else:
        model = await model_manager.get_default_model(default_type, **kwargs)
        if model is None:
            model_type_label = {
                "chat": "chat",
                "tools": "tools",
                "transformation": "transformation",
                "embedding": "embedding",
                "large_context": "large context",
            }.get(default_type, default_type)
            raise ValueError(
                f"No default {model_type_label} model configured. Please set a default {model_type_label} model in Settings > Models."
            )

    if model is None:
        raise ValueError(
            f"Failed to provision model: model_id={model_id}, default_type={default_type}"
        )

    logger.debug(f"Using model: {model}")
    if not isinstance(model, LanguageModel):
        raise TypeError(
            f"Model is not a LanguageModel: {model} (type: {type(model)}). "
            f"Expected a LanguageModel instance but got {type(model).__name__}."
        )
    return model.to_langchain()
