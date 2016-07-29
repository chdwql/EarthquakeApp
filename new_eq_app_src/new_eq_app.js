/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */

"use strict";

// USGS API

// Test URL
var TestURL = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2016-04-10&endtime=2016-04-20&limit=5' +
    '&minmagnitude=2.5';
// Decade (2006-2016) of Earthquake data URL
var DecadeURL = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2006-01-01&endtime=2016-01-01' +
    '&minmagnitude=6&maxmagnitude=7';

// Khaled's Dynamic URL (automatically updates to last 10 days)
var minMagnitude = 2.5,
    maxMagnitude = 10,
    minDate = -30,
    maxDate = 0,
    limit = 500;

// layer.removeAllRenderables();

function DynamicDT(minMagnitude, maxMagnitude, minDate, maxDate, limit) {
    var currentTimeUTC = +new Date();
    var minDateISO = new Date(currentTimeUTC + minDate * 24 * 60 * 60 * 1000).toISOString().split(/[-]+/);
    console.log(minDateISO);
    var maxDateISO = new Date(currentTimeUTC + maxDate * 24 * 60 * 60 * 1000).toISOString().split(/[-]+/);
    console.log(maxDateISO);
    minDateISO[minDateISO.length - 1] = minDateISO[minDateISO.length - 1].split('.')[0];
    maxDateISO[maxDateISO.length - 1] = maxDateISO[maxDateISO.length - 1].split('.')[0];

    var resourcesUrl = "http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson";
    var query = "starttime=" + minDateISO.join('-') + "&endtime=" + maxDateISO.join('-') + "&minmagnitude=" +
        minMagnitude.toString() + "&maxmagnitude=" + maxMagnitude.toString() + "&limit=" + limit.toString();
    // + "&orderby=magnitude;

    var URL = resourcesUrl + '&' + query;
    return URL

}
console.log(DynamicDT(minMagnitude, maxMagnitude, minDate, maxDate, limit));

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JQuery API Calling
$.get(DynamicDT(minMagnitude, maxMagnitude, minDate, maxDate, limit), function (EQ) {
    console.log(EQ.features[0].properties.mag);
    console.log(EQ.features[0].geometry.coordinates);
    placeMarkCreation(EQ);
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Data Display
// function dataDisplay(EQ_GeoJSON) {
var magnitudePlaceholder = document.getElementById('magnitude');
var locPlaceholder = document.getElementById('location');
var eventdatePlaceholder = document.getElementById('time');
var latitudePlaceholder = document.getElementById('latitude');
var longitudePlaceholder = document.getElementById('longitude');
var depthPlaceholder = document.getElementById('depth');
// }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function placeMarkCreation(GeoJSON) {

    // WorldWind Canvas
    WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

    var wwd = new WorldWind.WorldWindow("canvasOne");
    // Enable sub-surface rendering for the World Window.
    wwd.subsurfaceMode = true;
    // Enable deep picking in order to detect the sub-surface shapes.
    wwd.deepPicking = true;
    // Make the surface semi-transparent in order to see the sub-surface shapes.
    wwd.surfaceOpacity = 0.5;

    // var annotationController = new AnnotationController(wwd);

    var layers = [
        {layer: new WorldWind.BMNGLayer(), enabled: true},
        {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
        {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: false},
        {layer: new WorldWind.CompassLayer(), enabled: false},
        {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
        // {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
    ];

    for (var l = 0; l < layers.length; l++) {
        layers[l].layer.enabled = layers[l].enabled;
        wwd.addLayer(layers[l].layer);
    }
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var placemarkGeneration = function () {
        // Create the custom image for the placemark.
        var newCircle = function () {
            var canvas = document.createElement("canvas"),
                ctx2d = canvas.getContext("2d"),
                size = 64, c = size / 2 - 0.5, innerRadius = 5, outerRadius = 20;

            canvas.width = size;
            canvas.height = size;

            var gradient = ctx2d.createRadialGradient(c, c, innerRadius, c, c, outerRadius);
            gradient.addColorStop(0, 'rgb(255, 0, 0)');
            gradient.addColorStop(0.5, 'rgb(255, 73, 0)');
            gradient.addColorStop(1, 'rgb(255, 153, 0)');

            ctx2d.fillStyle = gradient;
            ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
            ctx2d.fill();

            return canvas;
        };

        // Placemark Globals
        var placemark,
            placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
            highlightAttributes,
            placemarkLayer = new WorldWind.RenderableLayer('Earthquakes');

        placemarkAttributes.imageScale = 1;
        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 0.5);
        placemarkAttributes.imageColor = WorldWind.Color.WHITE;
        // placemarkAttributes.imageSource = new WorldWind.ImageSource(newCircle());
        placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/white-dot.png";

        // Placemark Generation
        for (var i = 0; i < GeoJSON.features.length; i++) {
            var longitude = GeoJSON.features[i].geometry.coordinates[0];
            var latitude = GeoJSON.features[i].geometry.coordinates[1];
            placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude,
                1e2), true, placemarkAttributes);
            // Highlight attributes
            highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
            highlightAttributes.imageScale = 5;
            placemark.highlightAttributes = highlightAttributes;

            placemarkLayer.addRenderable(placemark);
        }
        return placemarkLayer;
    };
    // wwd.addLayer(placemarkGeneration());

    // Polygon Generation
    var polygonGeneration = function () {
        var polygon,
            polyhighlightAttributes,
            polygonLayer = new WorldWind.RenderableLayer("Depth (KM)");

        var polygonAttributes = new WorldWind.ShapeAttributes(null);

        polygonAttributes.drawInterior = true;
        polygonAttributes.drawOutline = false;
        polygonAttributes.outlineColor = WorldWind.Color.WHITE;
        polygonAttributes.interiorColor = WorldWind.Color.WHITE;
        // polygonAttributes.imageColor = WorldWind.Color.WHITE;
        polygonAttributes.applyLighting = true;

        for (var i = 0; i < GeoJSON.features.length; i++) {

            var boundaries = [];
            boundaries[0] = [];
            var altitude = Math.abs(GeoJSON.features[i].geometry['coordinates'][2]) * -1000 * 4; // multiplying by a fixed constant to improve visibility
            GeoJSON.features[i].geometry['coordinates'][2] = Math.abs(GeoJSON.features[i].geometry['coordinates'][2]);

            boundaries[0].push(new WorldWind.Position(GeoJSON.features[i].geometry['coordinates'][1] - 1, GeoJSON.features[i].geometry['coordinates'][0] - 1, altitude));
            boundaries[0].push(new WorldWind.Position(GeoJSON.features[i].geometry['coordinates'][1] - 1, GeoJSON.features[i].geometry['coordinates'][0] + 1, altitude));
            boundaries[0].push(new WorldWind.Position(GeoJSON.features[i].geometry['coordinates'][1] + 1, GeoJSON.features[i].geometry['coordinates'][0] + 1, altitude));
            boundaries[0].push(new WorldWind.Position(GeoJSON.features[i].geometry['coordinates'][1] + 1, GeoJSON.features[i].geometry['coordinates'][0] - 1, altitude));

            polygon = new WorldWind.Polygon(boundaries, null);
            polygon.altitudeMode = WorldWind.ABSOLUTE;
            polygon.extrude = true;
            polygon.textureCoordinates = [
                [new WorldWind.Vec2(0, 0), new WorldWind.Vec2(1, 0), new WorldWind.Vec2(1, 1), new WorldWind.Vec2(0, 1)]
            ];
            // Highlight Attributes
            polyhighlightAttributes = new WorldWind.ShapeAttributes(polygonAttributes);

            // var date = (+new Date(GeoJSON.features[i].properties.time));
            // var utcDate  = (+new Date());
            //
            // if (utcDate - date > (30*24*60*60*1000))
            // {
            //     polygonAttributes.interiorColor = WorldWind.Color.GREEN;
            // }
            // else if (utcDate - date > (8*24*60*60*1000))
            // {
            //     polygonAttributes.interiorColor = WorldWind.Color.YELLOW;
            // }
            // else if (utcDate - date > (24*60*60*1000))
            // {
            //     polygonAttributes.interiorColor = WorldWind.Color.ORANGE;
            // }
            // else
            // {
            //     polygonAttributes.interiorColor = WorldWind.Color.RED;
            // }
            //
            // polygonAttributes.drawInterior = true;
            // polygonAttributes.drawOutline = false;
            // polygonAttributes.applyLighting = true;
            // polygonAttributes.drawVerticals = polygon.extrude;
            // Highlighting
            polyhighlightAttributes.outlineColor = WorldWind.Color.RED;
            polyhighlightAttributes.interiorColor = WorldWind.Color.RED;
            polygonAttributes.highlightAttributes = polyhighlightAttributes;
            polygon.highlightAttributes = polyhighlightAttributes;
            polygon.attributes = polygonAttributes;

            polygon.center = new WorldWind.Position(GeoJSON.features[i].geometry['coordinates'][1], GeoJSON.features[i].geometry['coordinates'][0]);

            polygonLayer.addRenderable(polygon);
        }
        return polygonLayer;
    };
    wwd.addLayer(polygonGeneration());

    // Layer Manager
    var layerManger = new LayerManager(wwd);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Highlight Picking
    var highlightedItems = [];

    // The common pick-handling function.
    var handlePick = function (o) {
        // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
        // the mouse or tap location.
        var x = o.clientX,
            y = o.clientY;

        var redrawRequired = highlightedItems.length > 0; // must redraw if we de-highlight previously picked items

        // De-highlight any previously highlighted placemarks.
        for (var h = 0; h < highlightedItems.length; h++) {
            highlightedItems[h].highlighted = false;
        }
        highlightedItems = [];

        // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
        // relative to the upper left corner of the canvas rather than the upper left corner of the page.
        var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
        if (pickList.objects.length > 0) {
            redrawRequired = true;
        }

        if (pickList.objects.length > 1) {
            redrawRequired = true;
        }

        // Highlight the items picked by simply setting their highlight flag to true.
        if (pickList.objects.length > 0) {
            for (var p = 0; p < pickList.objects.length; p++) {
                pickList.objects[p].userObject.highlighted = true;
                for (var eq = 0; eq < GeoJSON.features.length; eq++) {
                    // if (pickList.objects[p].position &&
                    //     GeoJSON.features[eq].geometry.coordinates[1] == pickList.objects[p].position.latitude &&
                    //     GeoJSON.features[eq].geometry.coordinates[0] == pickList.objects[p].position.longitude) {
                    //     magnitudePlaceholder.textContent = GeoJSON.features[eq].properties.mag;
                    //     locPlaceholder.textContent = GeoJSON.features[eq].properties.place;
                    //     eventdatePlaceholder.textContent = Date(GeoJSON.features[eq].properties.time);
                    //     latitudePlaceholder.textContent = GeoJSON.features[eq].geometry.coordinates[1];
                    //     longitudePlaceholder.textContent = GeoJSON.features[eq].geometry.coordinates[0];
                    // }
                    if (pickList.objects[p].userObject.center &&
                        GeoJSON.features[eq].geometry.coordinates[1] == pickList.objects[p].userObject.center.latitude &&
                        GeoJSON.features[eq].geometry.coordinates[0] == pickList.objects[p].userObject.center.longitude) {
                        magnitudePlaceholder.textContent = GeoJSON.features[eq].properties.mag;
                        locPlaceholder.textContent = GeoJSON.features[eq].properties.place;
                        eventdatePlaceholder.textContent = new Date(GeoJSON.features[eq].properties.time);
                        latitudePlaceholder.textContent = GeoJSON.features[eq].geometry.coordinates[1];
                        longitudePlaceholder.textContent = GeoJSON.features[eq].geometry.coordinates[0];
                        depthPlaceholder.textContent = GeoJSON.features[eq].geometry.coordinates[2];
                    }
                }

                // Keep track of highlighted items in order to de-highlight them later.
                highlightedItems.push(pickList.objects[p].userObject);

                // Detect whether the placemark's label was picked. If so, the "labelPicked" property is true.
                // If instead the user picked the placemark's image, the "labelPicked" property is false.
                // Applications might use this information to determine whether the user wants to edit the label
                // or is merely picking the placemark as a whole.
                if (pickList.objects[p].labelPicked) {
                    console.log("Label picked");
                }
            }
        }

        // Update the window if we changed anything.
        if (redrawRequired) {
            wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
        }
    };

    // Listen for mouse moves and highlight the placemarks that the cursor rolls over.
    wwd.addEventListener("mousemove", handlePick);

    // Listen for taps on mobile devices and highlight the placemarks that the user taps.
    var tapRecognizer = new WorldWind.TapRecognizer(wwd, handlePick);

};