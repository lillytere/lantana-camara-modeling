# Code for predicting spatio-temporal patterns of *Lantana camara*

Based on the manuscript:  
**Synergistic Use of Satellite, Legacy, and In Situ Data to Predict Spatio-Temporal Patterns of the Invasive *Lantana camara* in a Savannah Ecosystem**

## Introduction  
This project includes multiple scripts and components. Only the main script is provided here, but you can access the corresponding Earth Engine repositories and publicly available assets via the links below.  
The code references Earth Engine assets (e.g., image collections, shapefiles, training data). These are not all public by default.

To use the script with your own data, please:
- Replace asset paths (e.g., AOI, training data, imagery)
- Adjust date ranges, study area, and model parameters as needed

##⚠️ Note on Data Protection
Please note that the road network predictor originally included in the species distribution model (SDM) has been intentionally excluded from this repository due to data protection requirements associated with sensitive spatial information. As a result, the prediction outputs generated from this script may show minor differences compared to those presented in the original publication.

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
- **Sentinel-1 (SAR) ((preprocessed dataset 2015–2023)**: Speckle-filtered SAR data  
  - 2015: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_15
  - 2016: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_16
  - 2017: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_17
  - 2018: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_18
  - 2019: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_19
  - 2020: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_20
  - 2021: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_21
  - 2022: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_22
  - 2023: https://code.earthengine.google.com/?asset=users/lillyschell7/Sen1_speckle_filtered/S1_23
 
- **Sentinel-2 (spectral composites 2015–2023)**: Preprocessed imagery
  - 2015: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2015
  - 2016: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2016
  - 2017: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2017
  - 2018: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2018
  - 2019: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2019 
  - 2020: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2020
  - 2021: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2021
  - 2022: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2022
  - 2023: https://code.earthengine.google.com/?asset=users/lillyschell7/Spectral/sen2023
 
- **Terra climate dataset (preprocessed dataset 2015–2023)**: Preprocessed climate data
  - 2015: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra15_resampled_scaled
  - 2016: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra16_resampled_scaled
  - 2017: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra17_resampled_scaled
  - 2018: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra18_resampled_scaled
  - 2019: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra19_resampled_scaled
  - 2020: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra20_resampled_scaled
  - 2021: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra21_resampled_scaled
  - 2022: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra22_resampled_scaled
  - 2023: https://code.earthengine.google.com/?asset=users/lillyschell7/TERRA_usable/Terra23_resampled_scaled
 

## Contents
- `main.js` – GEE script for habitat suitability modeling  
- `README.md` – Project description and usage instructions




This code was inspired by the [GEE Species Distribution Modeling Tutorial](https://developers.google.com/earth-engine/tutorials/community/species-distribution-modeling)
