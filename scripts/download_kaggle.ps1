param([string]$Dataset = "kartik2112/fraud-detection")
$ErrorActionPreference = "Stop"
$raw = Join-Path $PSScriptRoot "../ml/data/raw"
New-Item -ItemType Directory -Force -Path $raw | Out-Null
if (-not (Get-Command kaggle -ErrorAction SilentlyContinue)) { throw "Kaggle CLI not installed. Install and configure your own credentials first." }
if (-not (Test-Path (Join-Path $HOME ".kaggle/kaggle.json"))) { throw "Kaggle credentials missing. Configure your own Kaggle CLI credentials; this script never requests or stores credentials." }
Write-Host "Downloading $Dataset to ignored local storage. Confirm you've reviewed and accepted the dataset terms."
kaggle datasets download -d $Dataset -p $raw --unzip
