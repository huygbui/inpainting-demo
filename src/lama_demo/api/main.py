from fastapi import FastAPI

from .endpoints.inpainting import router as inpainting_router

app = FastAPI()

# Include the inpainting router
app.include_router(inpainting_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Welcome to the Inpainting API!"}
