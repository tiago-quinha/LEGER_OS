import json
import inspect
import graphify.cache
from pathlib import Path

print("check_semantic_cache signature:", inspect.signature(graphify.cache.check_semantic_cache))
print("save_semantic_cache signature:", inspect.signature(graphify.cache.save_semantic_cache))
