"""Run TRIBE v2 inference on the local test clip."""

import subprocess

import torch
from tribev2 import TribeModel


# TRIBE v2 currently invokes WhisperX with float16 even after selecting CPU.
# float16 is not supported by the CPU backend on this Mac, so replace only
# that subprocess argument with WhisperX's CPU-safe int8 mode.
if not torch.cuda.is_available():
    _subprocess_run = subprocess.run

    def _run_whisperx_on_cpu(command, *args, **kwargs):
        if isinstance(command, list) and command[:2] == ["uvx", "whisperx"]:
            command = command.copy()
            option = command.index("--compute_type")
            command[option + 1] = "int8"
        return _subprocess_run(command, *args, **kwargs)

    subprocess.run = _run_whisperx_on_cpu

model = TribeModel.from_pretrained("facebook/tribev2", cache_folder="./cache")

df = model.get_events_dataframe(video_path="../downloads/cc2.mp4")
preds, segments = model.predict(events=df)
print(preds.shape)  # (n_timesteps, n_vertices)
