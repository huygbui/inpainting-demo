# lama-demo

## Downloading and Setting Up the Model

To use this project, you first need to download the required model. Follow these steps:

1. Create a directory for the model and navigate to it:

  ```bash
  cd inpaiting-demo
  mkdir models
  cd models
  ```

2. Download the model using curl:

  ```bash
  curl https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt
  ```

3. Unzip the downloaded model:

  ```bash
  unzip big-lama.zip
  ```

## Installation

To install the required packages, you can use `pip`. First, ensure that you have `pip` and `python` installed.
Navigate to the root directory of your project where `pyproject.toml` is located and run:
  
  ```bash
  unzip big-lama.zip
  ```

## Running the Application
To run the application, use uvicorn to start the server. Run the following command:

  ```bash
  uvicorn scr.lama_demo.app.main:app --reload
  ```
