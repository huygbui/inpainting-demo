from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .routers.inpainting import router as inpainting_router

app = FastAPI()

# Mount static files directory
app.mount("/static", StaticFiles(directory="src/lama_demo/static"), name="static")

# Initialize templates directory
templates = Jinja2Templates(directory="src/lama_demo/templates")

# Include inpainting router
app.include_router(inpainting_router, prefix="/api")


# Route for the main UI page
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("inpainting.html", {"request": request})
