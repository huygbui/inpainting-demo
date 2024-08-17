document.addEventListener("DOMContentLoaded", () => {
    const imageCanvas = document.getElementById("image-canvas");
    const imageCtx = imageCanvas.getContext("2d");
    const maskCanvas = document.getElementById("mask-canvas");
    const maskCtx = maskCanvas.getContext("2d");
    const imageInput = document.getElementById("image");
    const brushSize = document.getElementById("brush-size");
    const undoButton = document.getElementById("undo-button");
    const clearButton = document.getElementById("clear-button");
    const resultImage = document.getElementById("result-image");
    const loadingSpinner = document.getElementById("loading-spinner");

    let drawing = false;
    let currentImage = null;
    let originalWidth, originalHeight;
    const undoStack = [];

    function resizeCanvas(width, height) {
        const maxWidth = 800;
        const maxHeight = 600;
        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            newWidth = Math.floor(width * ratio);
            newHeight = Math.floor(height * ratio);
        }

        imageCanvas.width = newWidth;
        imageCanvas.height = newHeight;
        maskCanvas.width = newWidth;
        maskCanvas.height = newHeight;
    }

    function drawImage(img) {
        originalWidth = img.width;
        originalHeight = img.height;
        resizeCanvas(img.width, img.height);
        imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        imageCtx.drawImage(img, 0, 0, imageCanvas.width, imageCanvas.height);
        resetMask();
    }

    function resetMask() {
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        undoStack.length = 0;
        saveState();
    }

    function saveState() {
        undoStack.push(maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    }

    imageInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentImage = new Image();
                currentImage.onload = function() {
                    drawImage(currentImage);
                };
                currentImage.onerror = function() {
                    console.error("Failed to load the image.");
                    alert("Failed to load the image. Please try another image.");
                };
                currentImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    imageCanvas.addEventListener("mousedown", startDrawing);
    imageCanvas.addEventListener("mousemove", draw);
    imageCanvas.addEventListener("mouseup", stopDrawing);
    imageCanvas.addEventListener("mouseout", stopDrawing);

    function startDrawing(event) {
        drawing = true;
        draw(event);
    }

    function draw(event) {
        if (!drawing) return;
        const rect = imageCanvas.getBoundingClientRect();
        const scaleX = imageCanvas.width / rect.width;
        const scaleY = imageCanvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        maskCtx.strokeStyle = "white";
        maskCtx.lineWidth = brushSize.value;
        maskCtx.lineCap = "round";
        maskCtx.lineTo(x, y);
        maskCtx.stroke();
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);

        // Draw on the image canvas to show the mask
        imageCtx.globalCompositeOperation = 'source-over';
        // imageCtx.globalCompositeOperation = 'multiply';
        imageCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        imageCtx.beginPath();
        imageCtx.arc(x, y, brushSize.value / 2, 0, Math.PI * 2);
        imageCtx.fill();
        imageCtx.globalCompositeOperation = 'source-over';
    }

    function stopDrawing() {
        if (drawing) {
            drawing = false;
            maskCtx.beginPath();
            saveState();
        }
    }

    undoButton.addEventListener("click", () => {
        if (undoStack.length > 1) {
            undoStack.pop(); // Remove current state
            maskCtx.putImageData(undoStack[undoStack.length - 1], 0, 0);
            // Redraw the image and the current mask state
            imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            imageCtx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);
            imageCtx.globalCompositeOperation = 'multiply';
            imageCtx.drawImage(maskCanvas, 0, 0);
            imageCtx.globalCompositeOperation = 'source-over';
        }
    });

    clearButton.addEventListener("click", () => {
        if (currentImage) {
            resetMask();
            // Redraw the original image
            imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            imageCtx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);
        }
    });

    document.getElementById("inpainting-form").addEventListener("submit", async function(event) {
        event.preventDefault();
        if (!currentImage) {
            alert("Please select an image.");
            return;
        }

        loadingSpinner.style.display = "block";
        resultImage.style.display = "none";

        const formData = new FormData();

        // Create a canvas with the original image dimensions
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = originalWidth;
        originalCanvas.height = originalHeight;
        const originalCtx = originalCanvas.getContext('2d');

        // Draw the original image
        originalCtx.drawImage(currentImage, 0, 0, originalWidth, originalHeight);
        originalCanvas.toBlob((imageBlob) => {
            formData.append("image", imageBlob, "image.png");

            // Scale up the mask to match the original image size
            const originalMaskCanvas = document.createElement('canvas');
            originalMaskCanvas.width = originalWidth;
            originalMaskCanvas.height = originalHeight;
            const originalMaskCtx = originalMaskCanvas.getContext('2d');
            originalMaskCtx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);

            originalMaskCanvas.toBlob((maskBlob) => {
                formData.append("mask", maskBlob, "mask.png");

                fetch("/api/inpainting", {
                    method: "POST",
                    body: formData
                })
                .then(response => response.ok ? response.blob() : Promise.reject(response))
                .then(resultBlob => {
                    const resultUrl = URL.createObjectURL(resultBlob);
                    resultImage.src = resultUrl;
                    resultImage.style.display = "block";
                    loadingSpinner.style.display = "none";
                })
                .catch(error => {
                    alert("Failed to process the image. Please try again.");
                    console.error(error);
                    loadingSpinner.style.display = "none";
                });
            }, 'image/png');
        }, 'image/png');
    });
});