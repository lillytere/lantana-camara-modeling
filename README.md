# Code for predicting spatio-temporal patterns of *Lantana camara* using satellite and in situ data

Based on the manuscript:  
**Synergistic Use of Satellite, Legacy, and In Situ Data to Predict Spatio-Temporal Patterns of the Invasive *Lantana camara* in a Savannah Ecosystem**

## Notes  
This project includes multiple scripts and components. Only the main script is provided here, but you can access the corresponding Earth Engine repositories and publicly available assets via the links below.  
The code references Earth Engine assets (e.g., image collections, shapefiles, training data). These are not all public by default.

To use the script with your own data, please:
- Replace asset paths (e.g., AOI, training data, imagery)
- Adjust date ranges, study area, and model parameters as needed

## ⚠️ Important Note on Data Protection

Please note that the **road predictor variable** originally included in the SDM model has been **removed from this script** for **data protection reasons**.

As a result:
- The **model architecture and workflow remain unchanged**, and the script can still be run as described.
- However, **final prediction results may differ slightly** from those presented in the original publication due to the exclusion of the road data.

You can freely adapt the script by adding your own road predictor (e.g., based on open data sources or field-mapped road layers), if applicable.

## Earth Engine Repository  
You can run the project directly in Earth Engine using this shared repository:  
🔗 https://code.earthengine.google.com/?accept_repo=users/lillyschell7/LC_SDM_supplementary_material

This repository includes:
- `SDM_Lantana_2023/`: Main species distribution model script for *Lantana camara*
- `Soil_Data/`
- `Topographic_indices/`
- `vegetation_indices/`

## Additional Assets  
These asset collections are also part of the original script:

- **Lantana Presence Points**: `Lantana Points`  
- **Akagera National Park Boundary**: `AOI`  
- **Sentinel-1 (SAR)**: Speckle-filtered SAR data  
  - Test: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_15  
- **Sentinel-2 (spectral composites 2015–2023)**: Preprocessed imagery  
- **Terra climate dataset (preprocessed dataset 2015–2023)**: Preprocessed climate data  

## Contents
- `main.js` – GEE script for habitat suitability modeling  
- `README.md` – Project description and usage instructions




This code was inspired by the [GEE Species Distribution Modeling Tutorial](https://developers.google.com/earth-engine/tutorials/community/species-distribution-modeling)
