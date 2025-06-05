// Note: To use this script with your own data, change the following:
// - AOI (area of interest)
// - Date range 
// - Asset paths for input imagery and training data
//!!The road predictor asset has been taken out of this script for data protection reasons!!
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 1 - Species data
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Load presence data
var Data = ee.FeatureCollection('users/lillyschell7/Daten_aktuell/Lat_Long_lantana');
var Data = Data.filterBounds(AOI);
print('Original data size:', Data.size());

// Define spatial resolution to work with (m)
var GrainSize = 30;
function RemoveDuplicates(data){
  print('Data type:', ee.String(ee.FeatureCollection(data).getInfo().type));
  var randomraster = ee.Image.random().reproject('EPSG:4326', null, GrainSize);
  var randpointvals = randomraster.sampleRegions({
    collection: ee.FeatureCollection(data),
    scale: 10,
    geometries: true
  });
  return randpointvals.distinct('random');
}

var Data = RemoveDuplicates(Data);
print('Final data size:', Data.size());


// Add two maps to the screen.
var left = ui.Map();
var right = ui.Map();
ui.root.clear();
ui.root.add(left);
ui.root.add(right);

// Link maps
ui.Map.Linker([left, right], 'change-bounds');

// Visualize presence points on the map
right.addLayer(Data, {color:'red'}, 'Presence', 1);
left.addLayer(Data, {color:'red'}, 'Presence', 1);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 2 - Define Area of Interest (Extent)
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Add border of study area to the map
var outline = ee.Image().byte().paint({
  featureCollection: AOI, color: 1, width: 3});
right.addLayer(outline, {palette: 'FF0000'}, "Study Area");
left.addLayer(outline, {palette: 'FF0000'}, "Study Area");

// Center map to the area of interest
right.centerObject(AOI, 9); //Number indicates the zoom level
left.centerObject(AOI, 9); //Number indicates the zoom level

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 3 - Selectiong Predictor Variables
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Climate Variables//
var terra= ee.Image('users/lillyschell7/TERRA_usable/Terra23_resampled_scaled')
.select(["aet", "pet", "pr", "soil", "tmmn", "tmmx"]);

print(terra);
////////roads/////////////

//var roads_buffer= ee.Image('users/******');
//var roads_buffer = roads_buffer.select(['b1']).rename(['roads_buffer']);

//print(roads_buffer);
///////////soil////////// 

var soil= ee.Image('users/lillyschell7/soil_data/Combined_Soil_Data');
print(soil);

//////LCC////////////////
var LCC= ee.Image('users/lillyschell7/LCC/LCC_2020_median_new');
var LCC = LCC.select(['b1']).rename(['LCC']);

// create binary mask of every Landcover class to add to predictor bands 

var class1Mask = LCC.eq(1); 
var class2Mask = LCC.eq(2); 
var class3Mask = LCC.eq(3);
var class4Mask = LCC.eq(4);
var class5Mask = LCC.eq(5);
var class6Mask = LCC.eq(6);
var class7Mask = LCC.eq(7);

///////Spectral Data ////////////////////
var sen23= ee.Image('users/lillyschell7/Spectral/sen2023');

var sen23 = sen23
  .select("B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12")
  .aside(print)
  .rename(["blue", "green", "red", "re1", "re2", "re3", "nir", "re4", "swir1", "swir2"])
  .clip(AOI);
 
  
 // Load elevation data from the data catalog and calculate slope, aspect, and a  hillshade from the terrain Digital Elevation Model.
var Terrain = ee.Algorithms.Terrain(ee.Image("USGS/SRTMGL1_003")); 

  //ImportIndices ////////////////
var veg_indices = require('users/lillyschell7/MA:indices_spectral_s2');
var topo = require('users/lillyschell7/MA:indices_topo');

var veg_indices= veg_indices.addIndicesToImage(sen23);
var terrain_indices= topo.addIndicesToImage(Terrain);

/////Radar Data////

var s1 = ee.Image('users/lillyschell7/Sen1_speckle_filtered/S1_23');

print (s1);

/////////////Combine bands into a single multi-band image/////////////
var predictors = terra.addBands(terrain_indices).addBands(veg_indices).addBands(soil).addBands(LCC).addBands(s1);

// Add the binary masks for each class to the predictors image
predictors = predictors
  .addBands(class1Mask.rename('Water'))
  .addBands(class2Mask.rename('Wetland'))
  .addBands(class3Mask.rename('Bare Ground'))
  .addBands(class4Mask.rename('Woodland'))
  .addBands(class5Mask.rename('Forest'))
  .addBands(class6Mask.rename('Bushland'))
  .addBands(class7Mask.rename('Grassland'));

print(predictors);

// Mask water pixels from the predictor variable image collection
//var wm = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select('max_extent').eq(0);
var wm= ee.Image('users/lillyschell7/watermasks/NDWI_wm_oct23');
var wm= wm.select('NDWI').eq(0);
print(wm);

var predictors = predictors.updateMask(wm).clip(AOI);

// Select subset of bands to keep for habitat suitability modeling
var bands = ["aet", "pet", "pr", "soil",  "tmmn", "tmmx",
'elevation',"slope","aspect", "TPI", "TWI" ,"blue",  "green", "red", "re1", "re2", "re3", "nir", 
            "re4", "swir1", "swir2","RVI", "NDVI", "GNDVI","TVI", "SAVI_L1","SAVI_05","CCCI",
            "NDRE","Sand_TS","Clay_TS","Phosphorus_TS","Nitrogen_TS","Carbon_TS","ECEC_TS","pH_TS",
            "Sand_SS","Clay_SS","Phosphorus_SS", "Nitrogen_SS","Carbon_SS","ECEC_SS","pH_SS","VV", 
            "VH", 'Grassland','Forest','Woodland','Bushland','Bare Ground','Wetland' ],
            

  
predictors = predictors.select(bands);
print(predictors);

right.addLayer(predictors, {}, 'predictors',1 );


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 4 - Defining area for pseudo-absences and spatial blocks for model fitting and cross validation
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Make an image out of the presence locations. The pixels where we have presence locations will be removed from the area to generate pseudo-absences.

var mask = Data
  .reduceToImage({
    properties: ['random'],
    reducer: ee.Reducer.first()
}).reproject('EPSG:4326', null, ee.Number(GrainSize)).mask().neq(1).selfMask();

// Environmental pseudo-absences selection (environmental profiling)
// Extract environmental values for the a random subset of presence data
var PixelVals = predictors.sampleRegions({collection: Data.randomColumn().sort('random').limit(200), properties: [], tileScale: 16, scale: GrainSize});
// Perform k-means clusteringthe clusterer and train it using based on Eeuclidean distance.
var clusterer = ee.Clusterer.wekaKMeans({nClusters:2, distanceFunction:"Euclidean"}).train(PixelVals);
// Assign pixels to clusters using the trained clusterer
var Clresult = predictors.cluster(clusterer);
// Display cluster results and identify the cluster IDs for pixels similar and dissimilar to the presence data
right.addLayer(Clresult.randomVisualizer(), {}, 'Clusters', 0);
// Mask out pixels that are dissimilar to presence data.
// Obtain the ID of the cluster similar to the presence data and use the opposite cluster to define the allowable area to for creatinge pseudo-absences
var clustID = Clresult.sampleRegions({collection: Data.randomColumn().sort('random').limit(200), properties: [], tileScale: 16, scale: GrainSize});
clustID = ee.FeatureCollection(clustID).reduceColumns(ee.Reducer.mode(),['cluster']);
clustID = ee.Number(clustID.get('mode')).subtract(1).abs();
var mask2 = Clresult.select(['cluster']).eq(clustID);
var AreaForPA = mask.updateMask(mask2).clip(AOI);

// Display area for creation of pseudo-absence
right.addLayer(AreaForPA, {},'Area to create pseudo-absences', 0);

// Define a function to create a grid over AOI
function makeGrid(geometry, scale) {
  // pixelLonLat returns an image with each pixel labeled with longitude and
  // latitude values.
  var lonLat = ee.Image.pixelLonLat();
  // Select the longitude and latitude bands, multiply by a large number then
  // truncate them to integers.
  var lonGrid = lonLat
    .select('longitude')
    .multiply(100000)
    .toInt();
  var latGrid = lonLat
    .select('latitude')
    .multiply(100000)
    .toInt();
  return lonGrid
    .multiply(latGrid)
    .reduceToVectors({
      geometry: geometry, 
      scale: scale,
      geometryType: 'polygon',
    });
}
// Create grid and remove cells outside AOI
var Scale = 2000; // Set range in m to create spatial blocks
var grid = makeGrid(AOI, Scale);
var Grid = wm.reduceRegions({collection: grid, reducer: ee.Reducer.mean()}).filter(ee.Filter.neq('mean',0));
right.addLayer(Grid, {},'Grid for spatial block cross validation', 0);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 5 - Fitting SDM models
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define function to generate a vector of random numbers between 1 and 1000

function SDM(x) {
    var Seed = ee.Number(x);
    
    // Randomly split blocks for training and validation
    var GRID = ee.FeatureCollection(Grid).randomColumn({seed:Seed}).sort('random');
    var TrainingGrid = GRID.filter(ee.Filter.lt('random', split)); 
    var TestingGrid = GRID.filter(ee.Filter.gte('random', split));  

    // Presence
    var PresencePoints = ee.FeatureCollection(Data);
    PresencePoints = PresencePoints.map(function(feature){return feature.set('PresAbs', 1)});
    var TrPresencePoints = PresencePoints.filter(ee.Filter.bounds(TrainingGrid));
    var TePresencePoints = PresencePoints.filter(ee.Filter.bounds(TestingGrid));

    // Pseudo-absences
    var TrPseudoAbsPoints = AreaForPA.sample({region: TrainingGrid, scale: GrainSize, numPixels: TrPresencePoints.size().add(300), seed:Seed, geometries: true, tileScale: 16});
    TrPseudoAbsPoints = TrPseudoAbsPoints.randomColumn().sort('random').limit(ee.Number(TrPresencePoints.size()));
    TrPseudoAbsPoints = TrPseudoAbsPoints.map(function(feature){ return feature.set('PresAbs', 0); });
    
    var TePseudoAbsPoints = AreaForPA.sample({region: TestingGrid, scale: GrainSize, numPixels: TePresencePoints.size().add(100), seed:Seed, geometries: true, tileScale: 16});
    TePseudoAbsPoints = TePseudoAbsPoints.randomColumn().sort('random').limit(ee.Number(TePresencePoints.size()));
    TePseudoAbsPoints = TePseudoAbsPoints.map(function(feature){ return feature.set('PresAbs', 0); });

    // Merge presence and pseudo-absence points
    var trainingPartition = TrPresencePoints.merge(TrPseudoAbsPoints);
    var testingPartition = TePresencePoints.merge(TePseudoAbsPoints);

    // Extract local covariate values from multiband predictor image at training points
    var trainPixelVals = predictors.sampleRegions({collection: trainingPartition, properties: ['PresAbs'], scale: GrainSize, tileScale: 16});

    // Classify using random forest
    var Classifier = ee.Classifier.smileRandomForest({
       numberOfTrees: 500, 
       variablesPerSplit: null, 
       minLeafPopulation: 10,
       bagFraction: 0.5,
       maxNodes: null,
       seed: Seed
      });
    
    // Presence probability 
    var ClassifierPr = Classifier.setOutputMode('PROBABILITY').train(trainPixelVals, 'PresAbs', bands); 
    var ClassifiedImgPr = predictors.select(bands).classify(ClassifierPr);
    
    // Binary presence/absence map
    var ClassifierBin = Classifier.setOutputMode('CLASSIFICATION').train(trainPixelVals, 'PresAbs', bands); 
    var ClassifiedImgBin = predictors.select(bands).classify(ClassifierBin);
    
    // Variable importance
    var variable_importance = ee.Feature(null, ee.Dictionary(ClassifierPr.explain()).get('importance'));
     
    return ee.List([ClassifiedImgPr,ClassifiedImgBin, trainingPartition, testingPartition, variable_importance]);
}

 
// Define partition for training and testing data
var split = 0.70;  // The proportion of the blocks used to select training data

// Define number of repetitions
var numiter = 10;

// Fit SDM 
var results = ee.List([35,68,43,54,17,46,76,88,24,12]).map(SDM);

// Extract results from list
var results = results.flatten();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 6 - Extracting and displaying model prediction results
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Habitat suitability

// Set visualization parameters
var visParams = {
  min: 0,
  max: 1,
  palette: ["#440154FF","#482677FF","#404788FF","#33638DFF","#287D8EFF",
  "#1F968BFF","#29AF7FFF","#55C667FF","#95D840FF","#DCE319FF"],
};

// Extract all model predictions
var images = ee.List.sequence(0,ee.Number(numiter).multiply(5).subtract(1),5).map(function(x){
  return results.get(x)});
// You can add all the individual model predictions to the map. The number of layers to add will depend on how many iterations you selected.

// left.addLayer(ee.Image(images.get(0)), visParams, 'Run1');
// left.addLayer(ee.Image(image.get(1)), visParams, 'Run2');

// Calculate mean of all individual model runs
var ModelAverage = ee.ImageCollection.fromImages(images).mean();
var ModelSD = ee.ImageCollection.fromImages(images).reduce(ee.Reducer.stdDev());

// Add final habitat suitability layer and presence locations to the map
left.addLayer(ModelAverage, visParams, 'Habitat Suitability');
left.addLayer(Data, {color:'red'}, 'Presence', 1);

// Create legend for habitat suitability map.
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});

legend.add(ui.Label({
  value: "Habitat suitability",
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0px'}
}));

legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {
    bbox: [0,0,1,0.1],
    dimensions: '200x20',
    format: 'png',
    min: 0,
    max: 1,
    palette: ["#440154FF","#482677FF","#404788FF","#33638DFF","#287D8EFF",
  "#1F968BFF","#29AF7FFF","#55C667FF","#95D840FF","#DCE319FF"]
  },
  style: {stretch: 'horizontal', margin: '8px 8px', maxHeight: '40px'},
}));

legend.add(ui.Panel({
  widgets: [
    ui.Label('Low', {margin: '0px 0px', textAlign: 'left', stretch: 'horizontal'}),
    ui.Label('Medium', {margin: '0px 0px', textAlign: 'center', stretch: 'horizontal'}),
    ui.Label('High', {margin: '0px 0px', textAlign: 'right', stretch: 'horizontal'}),
    ],layout: ui.Panel.Layout.Flow('horizontal')
}));

legend.add(ui.Panel(
  [ui.Label({value: "Presence locations",style: {fontWeight: 'bold', fontSize: '16px', margin: '4px 0 4px 0'}}),
   ui.Label({style:{color:"red",margin: '4px 0 0 4px'}, value:'◉'})],
  ui.Panel.Layout.Flow('horizontal')));

left.add(legend);


// Distribution map

// Extract all model predictions

var images2 = ee.List.sequence(1,ee.Number(numiter).multiply(5).subtract(1),5).map(function(x){
return results.get(x)});

// Calculate mean of all indivudual model runs
var DistributionMap = ee.ImageCollection.fromImages(images2).mode();

// Add final distribution map and presence locations to the map
right.addLayer(DistributionMap, 
  {palette: ["white", "green"], min: 0, max: 1}, 
  'Potential distribution');
right.addLayer(Data, {color:'red'}, 'Presence', 1);

// Create legend for distribution map
var legend2 = ui.Panel({style: {position: 'bottom-left',padding: '8px 15px'}});
legend2.add(ui.Label({
  value: "Potential distribution map",
  style: {fontWeight: 'bold',fontSize: '18px',margin: '0 0 4px 0',padding: '0px'}
}));

var colors2 = ["green","white"];
var names2 = ['Presence', 'Absence'];
var entry2;
for (var x = 0; x<2; x++){
  entry2 = [
    ui.Label({style:{color:colors2[x],margin: '4px 0 4px 0'}, value:'██'}),
    ui.Label({value: names2[x],style: {margin: '4px 0 4px 4px'}})
  ];
  legend2.add(ui.Panel(entry2, ui.Panel.Layout.Flow('horizontal')));
}

legend2.add(ui.Panel(
  [ui.Label({value: "Presence locations",style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0'}}),
   ui.Label({style:{color:"red",margin: '0 0 4px 4px'}, value:'◉'})],
  ui.Panel.Layout.Flow('horizontal')));

right.add(legend2);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 7 - Accuracy assessment
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Extract testing/validation datasets
var TestingDatasets = ee.List.sequence(3,ee.Number(numiter).multiply(5).subtract(1),5).map(function(x){
                      return results.get(x)});

// Double check that you have a satisfactory number of points for model validation
print('Number of presence and pseudo-absence points for model validation', ee.List.sequence(0,ee.Number(numiter).subtract(1),1)
.map(function(x){
  return ee.List([ee.FeatureCollection(TestingDatasets.get(x)).filter(ee.Filter.eq('PresAbs',1)).size(),
         ee.FeatureCollection(TestingDatasets.get(x)).filter(ee.Filter.eq('PresAbs',0)).size()]);
})
);

// Define functions to estimate sensitivity, specificity and precision.
function getAcc(img,TP){
  var Pr_Prob_Vals = img.sampleRegions({collection: TP, properties: ['PresAbs'], scale: GrainSize, tileScale: 16});
  var seq = ee.List.sequence({start: 0, end: 1, count: 25});
  return ee.FeatureCollection(seq.map(function(cutoff) {
  var Pres = Pr_Prob_Vals.filterMetadata('PresAbs','equals',1);
  // true-positive and true-positive rate, sensitivity  
  var TP =  ee.Number(Pres.filterMetadata('classification','greater_than',cutoff).size());
  var TPR = TP.divide(Pres.size());
  var Abs = Pr_Prob_Vals.filterMetadata('PresAbs','equals',0);
  // false-negative
  var FN = ee.Number(Pres.filterMetadata('classification','less_than',cutoff).size());
  // true-negative and true-negative rate, specificity  
  var TN = ee.Number(Abs.filterMetadata('classification','less_than',cutoff).size());
  var TNR = TN.divide(Abs.size());
  // false-positive and false-positive rate
  var FP = ee.Number(Abs.filterMetadata('classification','greater_than',cutoff).size());
  var FPR = FP.divide(Abs.size());
  // precision
  var Precision = TP.divide(TP.add(FP));
  // sum of sensitivity and specificity
  var SUMSS = TPR.add(TNR);
  return ee.Feature(null,{cutoff: cutoff, TP:TP, TN:TN, FP:FP, FN:FN, TPR:TPR, TNR:TNR, FPR:FPR, Precision:Precision, SUMSS:SUMSS});
  }));
}

// Calculate AUC of the Receiver Operator Characteristic

function getAUCROC(x){
  var X = ee.Array(x.aggregate_array('FPR'));
  var Y = ee.Array(x.aggregate_array('TPR')); 
  var X1 = X.slice(0,1).subtract(X.slice(0,0,-1));
  var Y1 = Y.slice(0,1).add(Y.slice(0,0,-1));
  return X1.multiply(Y1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
}

function AUCROCaccuracy(x){
  var HSM = ee.Image(images.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var Acc = getAcc(HSM, TData);
  return getAUCROC(Acc);
}


var AUCROCs = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(AUCROCaccuracy);
//print('AUC-ROC:', AUCROCs);
//print('Mean AUC-ROC', AUCROCs.reduce(ee.Reducer.mean()));

// Calculate AUC of Precision Recall Curve-Precision (PPV) 

function getAUCPR(roc){
  var X = ee.Array(roc.aggregate_array('TPR'));
  var Y = ee.Array(roc.aggregate_array('Precision')); 
  var X1 = X.slice(0,1).subtract(X.slice(0,0,-1));
  var Y1 = Y.slice(0,1).add(Y.slice(0,0,-1));
  return X1.multiply(Y1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
}

function AUCPRaccuracy(x){
  var HSM = ee.Image(images.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var Acc = getAcc(HSM, TData);
  return getAUCPR(Acc);
}

var AUCPRs = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(AUCPRaccuracy);
//print('AUC-PR:', AUCPRs);
//print('Mean AUC-PR', AUCPRs.reduce(ee.Reducer.mean()));

// Function to extract other metrics
function getMetrics(x){
  var HSM = ee.Image(images.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var Acc = getAcc(HSM, TData);
  return Acc.sort({property:'SUMSS',ascending:false}).first();
}

// Extract sensitivity, specificity and mean threshold values///ensitivity (true positive rate) and specificity (false positive rate)
var Metrics = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(getMetrics);
//print('Sensitivity:', ee.FeatureCollection(Metrics).aggregate_array("TPR"));
//print('Specificity:', ee.FeatureCollection(Metrics).aggregate_array("TNR"));

var MeanThresh = ee.Number(ee.FeatureCollection(Metrics).aggregate_array("cutoff").reduce(ee.Reducer.mean()));
//print('Mean threshold:', MeanThresh);



// Var importance
var VarImportance = ee.List.sequence(4,ee.Number(numiter).multiply(5).subtract(1),5).map(function(x){
                      return results.get(x)});
var Var_Imp = ee.FeatureCollection(VarImportance);

var Variable_Imp = ee.List(Var_Imp.reduceColumns({
  reducer: ee.Reducer.mean().repeat(ee.List(bands).length()),
  selectors: bands
}).get('mean'));

var Variable_ImpSD = ee.List(Var_Imp.reduceColumns({
  reducer: ee.Reducer.stdDev().repeat(ee.List(bands).length()),
  selectors: bands
}).get('stdDev'));

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 8 - Create a custom binary distribution map based on best threshold
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Transform probability model output into a binary map using the defined threshold and set NA into -9999
var DistributionMap2 = ModelAverage.gte(MeanThresh);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 9 - Export outputs
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Export final model predictions to drive

// Averaged habitat suitability
Export.image.toDrive({
  image: ModelAverage, 
  description: 'HSI_23', 
  scale: GrainSize, 
  maxPixels: 1e10,
  region: AOI 
});

// Export final binary model based on a mayority vote
Export.image.toDrive({
  image: DistributionMap, 
  description: 'PotentialDistribution_23', 
  scale: GrainSize, 
  maxPixels: 1e10,
  region: AOI 
});

// Export final binary model based on the threshold that maximises the sum of specificity and sensitivity
Export.image.toDrive({
  image: DistributionMap2.unmask(-9999),
  description: 'PotentialDistributionThreshold_23',
  scale: GrainSize,
  maxPixels: 1e10,
  region: AOI
});


// Export Accuracy Assessment Metrics

Export.table.toDrive({
  collection: ee.FeatureCollection(AUCROCs
                        .map(function(element){
                        return ee.Feature(null,{AUCROC:element})})),
  description: 'AUCROC_23',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(AUCPRs
                        .map(function(element){
                        return ee.Feature(null,{AUCPR:element})})),
  description: 'AUCPR_23',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(Metrics),
  description: 'Metrics_23',
  fileFormat: 'CSV',
});

// Export training and validation data sets

// Extract training datasets
var TrainingDatasets = ee.List.sequence(1,ee.Number(numiter).multiply(4).subtract(1),4).map(function(x){
  return results.get(x)});


Export.table.toDrive({
  collection: TrainingDatasets.get(0),
  description: 'TrainingDataRun1_23',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: TestingDatasets.get(0),
  description: 'TestingDataRun1_23',
  fileFormat: 'CSV',
});

Export.image.toDrive({
  image: ModelSD, 
  description: 'HSI_SD_23', 
  scale: GrainSize, 
  maxPixels: 1e10,
  region: AOI
});


Export.table.toDrive({
  collection: ee.FeatureCollection(ee.List.sequence(0,ee.List(bands).length().subtract(1))
                        .map(function(element){
                        return ee.Feature(null,{Band: ee.List(bands).get(element), Variable_Imp: Variable_Imp.get(element)})})),
  description: 'Variable_Imp_23',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(ee.List.sequence(0,ee.List(bands).length().subtract(1))
                        .map(function(element){
                        return ee.Feature(null,{Band: ee.List(bands).get(element), Variable_ImpSD: Variable_ImpSD.get(element)})})),
  description: 'Variable_ImpSD_23',
  fileFormat: 'CSV',
});

// Export mean threshold
Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, { Mean_Threshold: MeanThresh })]),
  description: 'Mean_Threshold_23',
  fileFormat: 'CSV',
});

/*
*/
