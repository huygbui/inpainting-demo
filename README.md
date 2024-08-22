# lama-demo

## Downloading and Setting Up the Model

To use this project, you first need to download the required model. Follow these steps:

1. Create a directory for the model and navigate to it:

  ```bash
  cd inpainting-demo
  mkdir models
  cd models
  ```

2. Download the model using curl:

  ```bash
  curl -LJO https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt
  ```

## Installation

To install the required packages, you can create a virtual environment and install the necessary dependencies from requirements.txt
  
  ```bash
  virtualenv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```

## Running the Application
To run the application, use uvicorn to start the server. Run the following command:

  ```bash
  uvicorn scr.lama_demo.app.main:app --reload
  ```
