// using functions from floats.js
var map = create_map('map');

var rasterLayer = new ol.layer.Image({
    source: new ol.source.ImageStatic({
	url: 'static/world.png',
	imageExtent: [-20037508.34,-20037508.34,20037508.34,20037508.34]
    })
});
map.addLayer(rasterLayer);

// create layer for tracks
var tracksLayer = create_overlay(map, '#ffcc33');

// create layer for selections
var selectionLayer = create_overlay(map, '#ff0000');

// allow the user to draw a polygon feature
var dragPolygon = new ol.interaction.Draw({
    condition: ol.events.condition.shiftKeyOnly,
    type: 'Polygon'
});
map.addInteraction(dragPolygon);
dragPolygon.on('drawstart', function(e) {
    selectionLayer.getFeatures().clear();
});
dragPolygon.on('drawend', function(e) {
    tracksLayer.getFeatures().clear();
    // draw a copy of the feature on the map
    var feature = e.feature;
    selectionLayer.addFeature(feature.clone());
    // now convert it to lat/lon
    feature.getGeometry().transform('EPSG:3857', 'EPSG:4326');
    // now generate a WKT representation of it
    var format = new ol.format.WKT({
	defaultDataProjection: 'ESPG:3857'
    });
    var wkt = format.writeFeature(feature);
    // add geometry parameter to other query params
    var params = getParams();
    params.geometry = wkt;
    var paramString = $.param(params);
    // query for floats
    $.getJSON('/query_geom_floats.json?' + paramString, function(r) {
	$.each(r, function(ix, float_id) { // for each float
	    // draw its track
	    draw_track(float_id, tracksLayer);
	});
    });
    createDownloadLink('/query_geom.csv', paramString);
});
function getLowPressure() {
    return Math.round($('#pressureSlider').rangeSlider("values").min);
}
function getHighPressure() {
    return Math.round($('#pressureSlider').rangeSlider("values").max);
}
function getStartDate() {
    return $('#dateSlider').dateRangeSlider("values").min;
}
function getEndDate() {
    return $('#dateSlider').dateRangeSlider("values").max;
}
function formatDateParam(dp) {
    return dp.toISOString().substring(0,10);
}
function getExperiment() {
    var val = $('#experimentMenu').data('value');
    if(val=='(any)') {
	return null;
    } else {
	return val;
    }
}

function getParams() {
    var params = {
	low_pressure: getLowPressure(),
	high_pressure: getHighPressure(),
	start_date: formatDateParam(getStartDate()),
	end_date: formatDateParam(getEndDate()),
    };
    var	experiment = getExperiment();
    if(experiment!=null) {
	params.experiment = experiment;
    }
    return params;
}
function getParamString() {
    return $.param(getParams());
}

function createDownloadLink(baseUrl, paramString) {
    // generate a CSV URL for this query
    var csv_url = baseUrl + '?' + paramString;
    // and populate the link interface
    $('#download').empty().html('<a href="'+csv_url+'">Download CSV</a>');
}

// non-geospatial search
$('#searchButton').button().on('click', function() {
    // clear layers
    selectionLayer.getFeatures().clear();
    tracksLayer.getFeatures().clear();
    //
    var params = getParams();
    var paramString = $.param(params);
    $.getJSON('/query_floats.json?' + paramString, function(r) {
	$.each(r, function(ix, float_id) {
	    draw_track(float_id, tracksLayer);
	});
    });
    createDownloadLink('/query.csv', paramString);
});

// pressure slider
$('#pressureSlider').rangeSlider({
    bounds: {
	min: 0,
	max: 5000
    }, defaultValues: {
	min: 1000,
	max: 4000
    }
}).bind('valuesChanged', function() {
    var paramString = getParamString();
    createDownloadLink('/query.csv', paramString);
});
$('#dateSlider').dateRangeSlider({
    bounds: {
	min: new Date(1972,8,28),
	max: new Date()
    }, defaultValues: {
	min: new Date(1980,0,1),
	max: new Date(2015,0,1)
    }
}).bind('valuesChanged', function() {
    var paramString = getParamString();
    createDownloadLink('/query.csv', paramString);
});

// experiment selector
$('#experimentMenu').selectmenu({
    style:'dropdown',
    width: 300,
    select: function(event, ui) {
	$('#experimentMenu').data('value',ui.item.value);
	var paramString = getParamString();
	createDownloadLink('/query.csv', paramString);
    }
}).data('value','(any)');
$.getJSON('/all_experiments.json', function(r) {
    $('<option value="(any)">(any)</option>').appendTo('#experimentMenu');
    $.each(r, function(index, value) {
	$('<option value="'+value+'">'+value+'</option>').appendTo('#experimentMenu')
    });
    $('#experimentMenu').selectmenu('refresh');
});
