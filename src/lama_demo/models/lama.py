from pathlib import Path

import numpy as np
import torch
from PIL import Image

from ..config import MODEL_PATH
from ..utils.image_processing import prepare_img_and_mask


class Lama:
    def __init__(
        self,
        device: torch.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        ),
    ) -> None:
        model_path = Path(MODEL_PATH) / "big-lama.pt"
        self.model = torch.jit.load(f=model_path, map_location=device)
        self.model.eval()
        self.model.to(device)
        self.device = device

    def __call__(self, image: Image.Image | np.ndarray, mask: Image.Image | np.ndarray):
        image, mask = prepare_img_and_mask(image, mask, self.device)

        with torch.inference_mode():
            inpainted = self.model(image, mask)

            cur_res = inpainted[0].permute(1, 2, 0).detach().cpu().numpy()
            cur_res = np.clip(cur_res * 255, 0, 255).astype(np.uint8)

            cur_res = Image.fromarray(cur_res)
            return cur_res
