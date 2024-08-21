// Constants
const MAX_CANVAS_WIDTH = 800;
const MAX_CANVAS_HEIGHT = 600;

// Utility functions
const getElement = (id) => document.getElementById(id);
const createContext = (canvas) => canvas.getContext("2d");
const createCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

// Base ImageProcessingApp class
class ImageProcessingApp {
    constructor() {
        this.elements = this.getElements();
        this.ctx = this.getContexts();
        this.state = this.initializeState();
        this.bindEventListeners();
    }

    getElements() {
        return {
            imageCanvas: getElement("image-canvas"),
            imageInput: getElement("image"),
            resultImage: getElement("result-image"),
            loadingSpinner: getElement("loading-spinner"),
            processingForm: getElement("processing-form")
        };
    }

    getContexts() {
        return { imageCtx: createContext(this.elements.imageCanvas) };
    }

    initializeState() {
        return {
            currentImage: null,
            originalDimensions: {},
            scaleFactors: {}
        };
    }

    bindEventListeners() {
        this.elements.imageInput.addEventListener("change", this.handleFileInput.bind(this));
        this.elements.processingForm.addEventListener("submit", this.handleSubmit.bind(this));
    }

    initializeCanvas(image) {
        const { width, height } = image;
        this.state.originalDimensions = { width, height };
        this.resizeCanvas(width, height);
    }

    resizeCanvas(width, height) {
        const ratio = Math.min(MAX_CANVAS_WIDTH / width, MAX_CANVAS_HEIGHT / height);
        this.setCanvasDimensions(this.elements.imageCanvas, width * ratio, height * ratio);
    }

    setCanvasDimensions(canvas, width, height) {
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
    }

    handleFileInput(event) {
        const file = event.target.files[0];
        if (file) this.loadImage(file);
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => this.setupImage(e.target.result);
        reader.readAsDataURL(file);
    }

    setupImage(src) {
        const img = new Image();
        img.onload = () => {
            this.state.currentImage = img;
            this.initializeCanvas(img);
        };
        img.onerror = () => alert("Failed to load the image. Please try another image.");
        img.src = src;
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (!this.state.currentImage) return alert("Please select an image.");

        this.showLoading(true);
        try {
            const resultBlob = await this.processImage();
            this.displayResult(resultBlob);
        } catch (error) {
            alert(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(isLoading) {
        this.elements.loadingSpinner.style.display = isLoading ? "block" : "none";
        this.elements.resultImage.style.display = isLoading ? "none" : "block";
    }

    async processImage() {
        throw new Error("processImage method must be implemented by subclass");
    }

    displayResult(blob) {
        const url = URL.createObjectURL(blob);
        this.elements.resultImage.src = url;
        this.elements.resultImage.style.display = "block";
    }
}

// InpaintingApp class (extends ImageProcessingApp)
class InpaintingApp extends ImageProcessingApp {
    constructor() {
        super();
        this.setupInpainting();
    }

    setupInpainting() {
        this.elements = { ...this.elements, ...this.getInpaintingElements() };
        this.ctx = { ...this.ctx, ...this.getInpaintingContexts() };
        this.state = { ...this.state, ...this.getInpaintingState() };
        this.bindInpaintingEvents();
    }

    getInpaintingElements() {
        return {
            maskCanvas: getElement("mask-canvas"),
            brushSize: getElement("brush-size"),
            undoButton: getElement("undo-button"),
            clearButton: getElement("clear-button")
        };
    }

    getInpaintingContexts() {
        return { maskCtx: createContext(this.elements.maskCanvas) };
    }

    getInpaintingState() {
        return {
            drawing: false,
            stateHistory: { maskHistory: [], imageHistory: [] }
        };
    }

    bindInpaintingEvents() {
        const canvas = this.elements.imageCanvas;
        canvas.addEventListener("mousedown", this.startDrawing.bind(this));
        canvas.addEventListener("mousemove", this.draw.bind(this));
        canvas.addEventListener("mouseup", this.stopDrawing.bind(this));
        canvas.addEventListener("mouseout", this.stopDrawing.bind(this));
        this.elements.undoButton.addEventListener("click", this.handleUndo.bind(this));
        this.elements.clearButton.addEventListener("click", this.handleClear.bind(this));
    }

    initializeCanvas(image) {
        super.initializeCanvas(image);
        this.setCanvasDimensions(this.elements.maskCanvas, this.elements.imageCanvas.width, this.elements.imageCanvas.height);
        this.resetState();
        this.saveState();
    }

    resetState() {
        this.clearCanvas(this.ctx.imageCtx, this.state.currentImage);
        this.clearCanvas(this.ctx.maskCtx, null, "black");
        this.state.stateHistory = { maskHistory: [], imageHistory: [] };
    }

    clearCanvas(ctx, img, fillColor = null) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (img) {
            ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
        } else if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    startDrawing(event) {
        const { left, top, width, height } = this.elements.imageCanvas.getBoundingClientRect();
        this.state.scaleFactors = { x: this.elements.imageCanvas.width / width, y: this.elements.imageCanvas.height / height };
        this.ctx.maskCtx.beginPath();
        this.ctx.imageCtx.beginPath();
        this.state.drawing = true;
        this.updateDrawingPosition(event, left, top);
    }

    updateDrawingPosition(event, offsetX, offsetY) {
        const x = (event.clientX - offsetX) * this.state.scaleFactors.x;
        const y = (event.clientY - offsetY) * this.state.scaleFactors.y;
        this.drawOnCanvas(this.ctx.maskCtx, x, y, "white");
        this.drawOnCanvas(this.ctx.imageCtx, x, y, "#4CAF50", "darken");
    }

    draw(event) {
        if (!this.state.drawing) return;
        const { left, top } = this.state.rect || this.elements.imageCanvas.getBoundingClientRect();
        this.updateDrawingPosition(event, left, top);
    }

    drawOnCanvas(ctx, x, y, color, composite = "source-over") {
        ctx.globalCompositeOperation = composite;
        ctx.strokeStyle = color;
        ctx.lineWidth = this.elements.brushSize.value;
        ctx.lineCap = "round";
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.moveTo(x, y);
    }

    stopDrawing() {
        if (this.state.drawing) {
            this.state.drawing = false;
            this.saveState();
        }
    }

    saveState() {
        this.state.stateHistory.maskHistory.push(this.elements.maskCanvas.toDataURL());
        this.state.stateHistory.imageHistory.push(this.elements.imageCanvas.toDataURL());
    }

    handleUndo() {
        if (this.canUndo()) {
            this.state.stateHistory.maskHistory.pop();
            this.state.stateHistory.imageHistory.pop();
            this.restoreState();
        }
    }

    canUndo() {
        return this.state.stateHistory.maskHistory.length > 1 && this.state.stateHistory.imageHistory.length > 1;
    }

    restoreState() {
        this.restoreCanvasState(this.ctx.maskCtx, this.state.stateHistory.maskHistory);
        this.restoreCanvasState(this.ctx.imageCtx, this.state.stateHistory.imageHistory);
    }

    restoreCanvasState(ctx, history) {
        const lastStateUrl = history[history.length - 1];
        const img = new Image();
        img.src = lastStateUrl;
        img.onload = () => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(img, 0, 0);
        }
    }

    handleClear() {
        if (this.state.currentImage) this.resetState();
    }

    async processImage() {
        const formData = await this.createFormData();
        const response = await fetch("/api/inpainting", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Failed to process the image.");
        return await response.blob();
    }

    async createFormData() {
        const [imageBlob, maskBlob] = await this.createBlobs();
        const formData = new FormData();
        formData.append("image", imageBlob, "image.png");
        formData.append("mask", maskBlob, "mask.png");
        return formData;
    }

    async createBlobs() {
        return Promise.all([
            this.createBlobFromCanvas(this.state.originalDimensions, this.state.currentImage),
            this.createBlobFromCanvas(this.state.originalDimensions, this.elements.maskCanvas)
        ]);
    }

    async createBlobFromCanvas(dimensions, source) {
        const canvas = createCanvas(dimensions.width, dimensions.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0, dimensions.width, dimensions.height);
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => new InpaintingApp());
