"""
Image Generation Service - CUDA version

Supports multiple models via HuggingFace diffusers:
- FLUX.2 klein 4B (default): Fast, ~13GB VRAM, best quality/speed ratio
- SDXL-Turbo: Fast fallback, 6GB, ungated
- FLUX.1-schnell: 12B params, 23GB, gated

Optimized for NVIDIA RTX 3090 (24GB VRAM).
"""

import asyncio
import logging
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Configuration
MODEL_ID = os.getenv("IMAGE_MODEL_ID", "black-forest-labs/FLUX.2-klein-4B")
DEFAULT_STEPS = int(os.getenv("DEFAULT_STEPS", "4"))
DEFAULT_WIDTH = int(os.getenv("DEFAULT_WIDTH", "1024"))
DEFAULT_HEIGHT = int(os.getenv("DEFAULT_HEIGHT", "1024"))
GENERATION_TIMEOUT = int(os.getenv("GENERATION_TIMEOUT", "300"))
GUIDANCE_SCALE = float(os.getenv("GUIDANCE_SCALE", "0.0"))

# Output directory for generated images
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "C:/mana/services/mana-image-gen/output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Known model configs
MODEL_CONFIGS = {
    "black-forest-labs/FLUX.2-klein-4B": {
        "pipeline_class": "Flux2KleinPipeline",
        "model_name": "FLUX.2-klein-4B",
        "parameters": "4 billion",
        "license": "FLUX.2 Community License",
        "torch_dtype": "bfloat16",
        "guidance_scale": 4.0,
        "default_steps": 4,
    },
    "black-forest-labs/FLUX.2-klein-9B": {
        "pipeline_class": "Flux2KleinPipeline",
        "model_name": "FLUX.2-klein-9B",
        "parameters": "9 billion",
        "license": "FLUX.2 Community License",
        "torch_dtype": "bfloat16",
        "guidance_scale": 4.0,
        "default_steps": 4,
    },
    "stabilityai/sdxl-turbo": {
        "pipeline_class": "AutoPipelineForText2Image",
        "model_name": "SDXL-Turbo",
        "parameters": "3.5 billion",
        "license": "Stability AI Community License",
        "torch_dtype": "float16",
        "guidance_scale": 0.0,
        "default_steps": 4,
    },
    "black-forest-labs/FLUX.1-schnell": {
        "pipeline_class": "FluxPipeline",
        "model_name": "FLUX.1-schnell",
        "parameters": "12 billion",
        "license": "Apache 2.0",
        "torch_dtype": "float16",
        "guidance_scale": 0.0,
        "default_steps": 4,
    },
}

# Global pipeline instance (lazy loaded)
_pipeline = None

# VRAM management — unload FLUX after 5 min idle (frees ~13GB)
from app.vram_manager import VramManager
_vram = VramManager(
    idle_timeout=int(os.getenv("VRAM_IDLE_TIMEOUT", "300")),
    service_name="mana-image-gen",
)


def unload_pipeline():
    """Unload FLUX pipeline from GPU to free VRAM."""
    global _pipeline
    if _pipeline is not None:
        import torch
        del _pipeline
        _pipeline = None
        torch.cuda.empty_cache()
        _vram.mark_unloaded()
        logger.info("FLUX pipeline unloaded, VRAM freed")


@dataclass
class GenerationResult:
    """Result of image generation."""
    image_path: str
    prompt: str
    width: int
    height: int
    steps: int
    seed: int
    generation_time: float


def _load_pipeline():
    """Load the image generation pipeline (called once, lazy)."""
    global _pipeline

    if _pipeline is not None:
        return _pipeline

    logger.info(f"Loading model: {MODEL_ID}")
    load_start = time.time()

    import torch

    config = MODEL_CONFIGS.get(MODEL_ID, {})
    pipeline_class = config.get("pipeline_class", "AutoPipelineForText2Image")
    dtype_str = config.get("torch_dtype", "float16")
    dtype = torch.bfloat16 if dtype_str == "bfloat16" else torch.float16

    if pipeline_class == "Flux2KleinPipeline":
        from diffusers import Flux2KleinPipeline
        _pipeline = Flux2KleinPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
        )
        # CPU-Offload statt resident (.to("cuda")): nur die aktive Komponente
        # liegt je Generierung kurz auf der GPU (~8 GB Peak statt ~15 GB
        # resident) -> koexistiert mit Ollama/TTS/STT auf der geteilten 3090,
        # kein VRAM-Paging. Misst ~10 s warm statt >220 s (Paging) vorher.
        _pipeline.enable_model_cpu_offload()
    elif pipeline_class == "FluxPipeline":
        from diffusers import FluxPipeline
        _pipeline = FluxPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
        )
        _pipeline.enable_model_cpu_offload()
    else:
        from diffusers import AutoPipelineForText2Image
        _pipeline = AutoPipelineForText2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            variant="fp16",
        )
        _pipeline.to("cuda")

    load_time = time.time() - load_start
    logger.info(f"Model loaded in {load_time:.1f}s")
    _vram.mark_loaded()

    return _pipeline


def is_flux_available() -> bool:
    """Check if image generation is available."""
    try:
        import torch
        import diffusers
        return torch.cuda.is_available()
    except ImportError:
        return False


def get_flux_info() -> dict:
    """Get information about the model."""
    import torch
    loaded = _pipeline is not None
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A"
    vram_used = torch.cuda.memory_allocated(0) / (1024**3) if torch.cuda.is_available() else 0

    config = MODEL_CONFIGS.get(MODEL_ID, {})

    return {
        "model_id": MODEL_ID,
        "model_name": config.get("model_name", MODEL_ID.split("/")[-1]),
        "parameters": config.get("parameters", "unknown"),
        "license": config.get("license", "unknown"),
        "backend": "diffusers (CUDA)",
        "gpu": gpu_name,
        "gpu_vram_used_gb": round(vram_used, 2),
        "loaded": loaded,
        "default_steps": DEFAULT_STEPS,
        "default_resolution": f"{DEFAULT_WIDTH}x{DEFAULT_HEIGHT}",
        "vram": _vram.status(),
    }


def get_vram_status() -> dict:
    """Get VRAM manager status."""
    import torch
    vram_allocated = torch.cuda.memory_allocated(0) / (1024**3) if torch.cuda.is_available() else 0
    vram_reserved = torch.cuda.memory_reserved(0) / (1024**3) if torch.cuda.is_available() else 0
    vram_total = torch.cuda.get_device_properties(0).total_mem / (1024**3) if torch.cuda.is_available() else 0

    return {
        "gpu_vram_allocated_gb": round(vram_allocated, 2),
        "gpu_vram_reserved_gb": round(vram_reserved, 2),
        "gpu_vram_total_gb": round(vram_total, 2),
        "model": _vram.status(),
    }


async def generate_image(
    prompt: str,
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
    steps: int = DEFAULT_STEPS,
    seed: Optional[int] = None,
    output_format: str = "png",
) -> GenerationResult:
    """Generate an image from a text prompt."""
    import torch

    # Check idle unload first
    _vram.check_and_unload(unload_pipeline)

    # Load pipeline (lazy — reloads if previously unloaded)
    loop = asyncio.get_event_loop()
    pipe = await loop.run_in_executor(None, _load_pipeline)

    # Generate unique output filename
    image_id = str(uuid.uuid4())[:8]
    output_path = OUTPUT_DIR / f"{image_id}.{output_format}"

    # Set seed
    if seed is not None and seed >= 0:
        generator = torch.Generator("cuda").manual_seed(seed)
        actual_seed = seed
    else:
        actual_seed = torch.randint(0, 2**32, (1,)).item()
        generator = torch.Generator("cuda").manual_seed(actual_seed)

    # Get guidance scale from config
    config = MODEL_CONFIGS.get(MODEL_ID, {})
    guidance = GUIDANCE_SCALE if GUIDANCE_SCALE > 0 else config.get("guidance_scale", 0.0)

    logger.info(f"Generating: {width}x{height}, {steps} steps, seed={actual_seed}")

    start_time = time.time()

    def _generate():
        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                generator=generator,
                guidance_scale=guidance,
            )
            return result.images[0]

    try:
        image = await asyncio.wait_for(
            loop.run_in_executor(None, _generate),
            timeout=GENERATION_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(f"Generation timed out after {GENERATION_TIMEOUT}s")

    generation_time = time.time() - start_time

    # Save image
    if output_format == "jpg":
        image.save(output_path, "JPEG", quality=95)
    else:
        image.save(output_path, "PNG")

    _vram.touch()
    logger.info(f"Generated: {output_path} ({width}x{height}, {steps} steps, {generation_time:.2f}s)")

    return GenerationResult(
        image_path=str(output_path),
        prompt=prompt,
        width=width,
        height=height,
        steps=steps,
        seed=actual_seed,
        generation_time=generation_time,
    )


def cleanup_image(image_path: str) -> bool:
    """Delete a generated image file."""
    try:
        path = Path(image_path)
        if path.exists() and path.parent == OUTPUT_DIR:
            path.unlink()
            return True
    except Exception as e:
        logger.warning(f"Failed to cleanup image {image_path}: {e}")
    return False


def cleanup_old_images(max_age_hours: int = 24) -> int:
    """Clean up images older than max_age_hours."""
    cleaned = 0
    cutoff = time.time() - (max_age_hours * 3600)

    try:
        for file in OUTPUT_DIR.iterdir():
            if file.is_file() and file.stat().st_mtime < cutoff:
                file.unlink()
                cleaned += 1
    except Exception as e:
        logger.warning(f"Cleanup error: {e}")

    if cleaned > 0:
        logger.info(f"Cleaned up {cleaned} old images")

    return cleaned
