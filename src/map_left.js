// Define getColor function using Viridis color scale
// open /Applications/Google\ Chrome.app --args --user-data-dir=.--disable-web-security
function getColor(value) {
    // Define Viridis color scale
    var viridisScale = d3.scaleSequential()
        .domain([0, 1])  // Domain for the color scale
        .interpolator(d3.interpolateViridis);  // Interpolator function using Viridis colors

    // Normalize the value between 0 and 1 (assuming your value range is known)
    var normalizedValue = (value - 0.0) / (1000.0 - 0.0);

    // Get color from the Viridis scale based on the normalized value
    var color = viridisScale(normalizedValue);
    return color;
}

// Function to show tooltip in region map
function showTooltipMap(region, value, x, y, bgcolor) {
    // Round the value
    var roundedValue = Math.round(value);
    
    // Create or update tooltip element
    var tooltip = d3.select("#tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("background-color", bgcolor)
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("color", "white")
            .style("pointer-events", "none");
    }
    
    // Update tooltip content with region in bold and rounded value
    tooltip.html("<strong>" + region + "</strong>: " + roundedValue)
        .style("left", (x + 50) + "px")
        .style("top", (y + 200) + "px")
        .style("background-color", bgcolor)
        .style("display", "block");
}


$(document).ready(function(){
    // Select the canvas element
    var canvas = d3.select("#leftMapCanvas");
    var width  = +canvas.attr("width");
    var height = +canvas.attr("height");

    // Get the 2D context of the canvas
    var context = canvas.node().getContext("2d");

    // Define the map projection
    var projection = d3.geoMercator()
        .scale(1)
        .translate([0, 0]);

    // Set the background color
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    // Define a path generator
    var path = d3.geoPath()
        .projection(projection)
        .context(context);

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function(mozambique) {
        d3.csv("data/data.csv").then(function(data) {

            // Convert "date" column to Date objects
            data.forEach(function(d) {
                d.date = new Date(d.date);
            });

            // Filter data by type "Observado"
            var observed_data = data.filter(function(d) {
                return d.type === "Observado";
            });

            // Group observadoData by the "Region" column
            var groupedData = d3.group(observed_data, d => d.Region);

            // Create a map to store CSV data values by Region for "Observado" type and maximum date
            var dataMap = new Map();

            // For each group, filter to keep only the row with the highest date
            Array.from(groupedData.entries()).forEach(function([region, regionData]) {
                var maxDateRow = regionData.reduce(function(maxDateRow, currentRow) {
                    if (!maxDateRow || currentRow.date > maxDateRow.date) {
                        return currentRow;
                    } else {
                        return maxDateRow;
                    }
                }, null);
                dataMap.set(region, maxDateRow);
            });

            // Fit the GeoJSON data to the canvas size
            projection.fitSize([width, height], mozambique);

            // Process GeoJSON features
            mozambique.features.forEach(function(feature) {
                var region = feature.properties.ADM1_PT.toUpperCase();
                var regionData = dataMap.get(region);
                if (regionData) {
                    var rate = +regionData.rate; // Corrected line
                    feature.properties.fill = getColor(rate); // Assume getColor() returns appropriate color based on value
                } else {
                    console.warn("No data found for region:", region);
                    feature.properties.fill = "black";
                    // Handle the case where no data is found for the region
                }

                context.beginPath();
                context.fillStyle = feature.properties.fill;
                path(feature);
                context.fill();
                context.strokeStyle = "white"; // Stroke color for country borders
                context.stroke();
            });

            // Add event listener for mousemove event
            canvas.on("mousemove", function(event) {
                var mouseX = event.offsetX;
                var mouseY = event.offsetY;
                
                // Check if the mouse is over a region
                mozambique.features.forEach(function(feature) {
                    context.beginPath(); // Begin a new path for each feature
                    path(feature);
                    context.closePath(); // Close the path
                    
                    if (context.isPointInPath(mouseX, mouseY)) {
                        // Display tooltip with region name and value
                        var region = feature.properties.ADM1_PT.toUpperCase();
                        var regionData = dataMap.get(region);                    
                        if (regionData) {
                            var rate = +regionData.rate; // Assuming "value" is the property to display
                            showTooltipMap(region, rate, mouseX, mouseY, feature.properties.fill);
                        } else {
                            console.warn("No data found for region:", region);
                        }
                    }
                });
            });

            // Hide tooltip when mouse moves away from the canvas
            canvas.on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
            });

            }).catch(function(error) {
                console.error("Error loading CSV:", error);
            });
            
        }).catch(function(error) {
            console.error("Error loading GeoJSON:", error);
        });
    });

$( document ).ready(function(){
    // Select the canvas element
    var canvas = d3.select("#rightMapCanvas");
        width = +canvas.attr("width"),
        height = +canvas.attr("height");

    // Get the 2D context of the canvas
    var context = canvas.node().getContext("2d");

    // Define the map projection
    var projection = d3.geoMercator()
        .scale(1)
       .translate([0, 0]);

    // Set the background color
    context.fillStyle = "blue";
    context.fillRect(0, 0, width, height);

    // Define a path generator
    var path = d3.geoPath()
        .projection(projection)
        .context(context);

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function(moçambique) {

        // Fit the GeoJSON data to the canvas size
        projection.fitSize([width, height], moçambique);

        // Draw the map
        context.beginPath();
        path(moçambique);
        context.fillStyle = "#00688b"; // Fill color for countries
        context.fill();
        context.strokeStyle = "white"; // Stroke color for country borders
        context.stroke();
        
    }).catch(function(error) {
        console.error("Error loading GeoJSON:", error);
    });

});