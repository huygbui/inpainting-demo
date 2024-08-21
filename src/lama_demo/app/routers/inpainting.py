import io

from fastapi import APIRouter, File, Response, UploadFile
from PIL import Image

from ...models.lama import Lama

router = APIRouter()
model = Lama()


@router.post("/inpainting")
async def inpainting(image: UploadFile = File(...), mask: UploadFile = File(...)):
    image_content = await image.read()
    mask_content = await mask.read()

    pil_image = Image.open(io.BytesIO(image_content)).convert("RGB")
    pil_mask = Image.open(io.BytesIO(mask_content)).convert("L")
    assert pil_image.mode == "RGB" and pil_mask.mode == "L"
    pil_image.save("debug_image.png")
    pil_mask.save("debug_mask.png")

    result = model(pil_image, pil_mask)

    # Convert result back to bytes
    img_byte_arr = io.BytesIO()
    result.save(img_byte_arr, format="PNG")
    img_byte_arr = img_byte_arr.getvalue()

    return Response(content=img_byte_arr, media_type="image/png")
