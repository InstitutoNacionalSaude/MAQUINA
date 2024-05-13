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

// Function to set the active tab
function setActiveTab(tabId) {
    $('.navbar a').removeClass('active'); // Remove 'active' class from all tabs
    $('#' + tabId).addClass('active'); // Add 'active' class to the selected tab by ID
  }

// Function to get the ID of the active tab
function getActiveTabId() {
    return $('.navbar a.active').attr('id');
}

// Function to get the header of paragraph
function diseaseName() {
    // Get the disease name 
    var disease_name = getActiveTabId();

    // Translate disease name
    var translatedName = (disease_name === "malaria") ? "Malária" : "Doenças Diarréicas";
    
    // Change the title of disease
    document.getElementById("disease_title").innerText = translatedName;
}

// Function to update the dataMap with the nth minimal date when the slider value changes
function updateDataMapPrevisto() {

    //Get the disease name 
    const disease_name = getActiveTabId();

    // Select the canvas element
    const canvas = d3.select("#rightMapCanvas");
          width  = +canvas.attr("width"),
          height = +canvas.attr("height");

    // Get the 2D context of the canvas
    const context = canvas.node().getContext("2d");

    // Define the map projection
    const projection = d3.geoMercator()
          .scale(1)
          .translate([0, 0]);

    // Set the background color
    context.fillStyle = "blue";
    context.fillRect(0, 0, width, height);

    // Define a path generator
    const path = d3.geoPath()
        .projection(projection)
        .context(context);

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function(mozambique) {
        d3.csv("data/data.csv").then(function(data) {

            // Fit the GeoJSON data to the canvas size
            projection.fitSize([width, height], mozambique);

            // Convert "date" column to Date objects
            data.forEach(function(d) {
                d.date = new Date(d.date);
            });

            // Filter data by type "Observado"
            const previsto_data = data.filter(function(d) {
                return d.type === "Previsto" & d.disease == disease_name;
            });

            // Group observadoData by the "Region" column
            var groupedData = d3.group(previsto_data, d => d.Region);

            // Create a map to store CSV data values by Region for "Previsto" type and maximum date
            var dataMap = new Map();

            const nweeks = parseInt($('#weekSlider').val());
            
            // For each group, filter to keep only the row with the nth minimal date
            Array.from(groupedData.entries()).forEach(function([region, regionData]) {
                var sortedDates = regionData.map(function(d) { return d.date; }).sort(function(a, b) { return a - b; }); // Sort dates in ascending order
                if (sortedDates.length >= nweeks) {
                    var nthMinDate = sortedDates[nweeks - 1]; // Retrieve the nth minimal date
                    var nthMinDateRow = regionData.find(function(d) { return d.date.getTime() === nthMinDate.getTime(); }); // Find the row with the nth minimal date
                    dataMap.set(region, nthMinDateRow); // Store the row in the dataMap with the respective region key
                } else {
                    dataMap.set(region, null); // If there are less than n dates, store null in the dataMap
                }
            });

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
                //Get mouse positions
                const mouseX = event.offsetX;
                      mouseY = event.offsetY;
                
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
                            showTooltipMap(region, rate, mouseX, mouseY, feature.properties.fill, "right");
                        } else {
                            console.warn("No data found for region:", region);
                        }
                    }
                });
            });

            // Hide tooltip when mouse moves away from the canvas
            canvas.on("mouseout", function() {
                d3.select("#rightTooltipMap").style("display", "none");
            });
     
        }).catch(function(error) {
            console.error("Error loading CSV:", error);
        });        
        
    }).catch(function(error) {
        console.error("Error loading GeoJSON:", error);
    });

}

function updateDataMapObservado() {

    //Get the disease name 
    const disease_name = getActiveTabId();

    // Select the canvas element
    const canvas = d3.select("#leftMapCanvas"),
          width  = +canvas.attr("width"),
          height = +canvas.attr("height");

    // Get the 2D context of the canvas
    const context = canvas.node().getContext("2d");

    // Define the map projection
    const projection = d3.geoMercator()
                            .scale(1)
                            .translate([0, 0]);

    // Set the background color
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    // Define a path generator
    const path = d3.geoPath()
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
            const observed_data = data.filter(function(d) {
                return d.type === "Observado" & d.disease == disease_name;
            });

            // Group observadoData by the "Region" column
            const groupedData = d3.group(observed_data, d => d.Region);

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
                            showTooltipMap(region, rate, mouseX, mouseY, feature.properties.fill, "left");
                        } else {
                            console.warn("No data found for region:", region);
                        }
                    }
                });
            });

            // Hide tooltip when mouse moves away from the canvas
            canvas.on("mouseout", function() {
                d3.select("#leftTooltipMap").style("display", "none");
            });

        }).catch(function(error) {
            console.error("Error loading CSV:", error);
        });

    }).catch(function(error) {
        console.error("Error loading GeoJSON:", error);
    });
}

// Function to show tooltip in region map
function showTooltipMap(region, value, x, y, bgcolor, side) {
    
    // Round the value
    let roundedValue = Math.round(value);
    
    //Get object height
    let height = d3.select("#" + side + "MapCanvas").attr("height")

    // Create or update tooltip element
    let tooltip = d3.select("#" + side + "TooltipMap");
    if (tooltip.empty()) {        
        tooltip = d3.select("#" + side + "MapContainer").append("div")
            .attr("id", side + "TooltipMap")
            .style("width", "50%")
            .style("position", "relative")
            .style("background-color", bgcolor)
            .style("padding", "5px")
            .style("border", "3px solid black")
            .style("color", "white")
            .style("pointer-events", "none");
    }
    
    // Update tooltip content with region in bold and rounded value
    tooltip.html("<strong>" + region + "</strong>:<br>" + roundedValue + "/100,000 habitantes")
        .style("left", x + "px")
        .style("top", (y - 1.1*height) + "px")
        .style("background-color", bgcolor)
        .style("display", "block");
}

function plotRegion(regionName){

    let region_name = regionName.toUpperCase();
    let region_id;
    switch (region_name){
        case "CABO DELGADO":
            region_id = "CABODELGADO";
            break;
        case "MAPUTO CITY":
            region_id = "MAPUTOCIDADE";
            break;
        default:
            region_id = region_name;
    }

    // Select the canvas element
    let svg = d3.select("#" + region_id);
    
    //Clear canvas
    svg.selectAll("*").remove();

    // Get the disease 
    let disease_name = getActiveTabId();
    
    // Define the dimensions and margins for the plot
    let margin = { top: 10, right: 30, bottom: 30, left: 40 };
    
    // Change the width and height considering the margins
    let width  = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    // Append SVG to the body
    let plot = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

    // Read data from CSV file
    d3.csv("data/data.csv").then(function(data) {

      data.forEach(function(d) {
        d.date = new Date(d.date);
        d.rate = +d.incident_cases;
        d.rate_low = +d.incident_cases_low; // Assuming these properties exist in your dataset
        d.rate_up = +d.incident_cases_upp;
      });
      
      // Filter data where type is "Observado"
      let filteredData = data.filter(d => d.disease === disease_name && d.Region === region_name);

      // Define scales for x and y axes
      let xScale = d3.scaleTime()
        .domain(d3.extent(filteredData, d => d.date))
        .range([0, width]);

      let yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.rate_up)])
        .range([height, 0]);

      // Define x and y axes
      let xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat("%b/%y"))
        .tickSizeOuter(0);        

      let yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickSizeOuter(0);

      // Append x axis to the plot
      plot.append("g")
          .attr("transform", `translate(0, ${height})`)
          .call(xAxis);

      // Append y axis to the plot
      plot.append("g")
          .call(yAxis);

      // Define line generator
      let line = d3.line()
          .x(d => xScale(d.date))
          .y(d => yScale(d.rate));

      // Show confidence interval
      plot.append("path")
        .datum(filteredData)
        .attr("fill", "#cce5df")
        .attr("stroke", "none")
        .attr("d", d3.area()
            .x(function(d) { return xScale(d.date); })
            .y0(function(d) { return yScale(d.rate_low); })
            .y1(function(d) { return yScale(d.rate_up); })
        );

      // Append path for the line chart
      plot.append("path")
          .datum(filteredData)
          .attr("fill", "none")
          .attr("stroke", "#404040")
          .attr("stroke-width", 1.5)
          .attr("d", line);

    }).catch(function(error) {
      console.log("Error reading data:", error);
    });
}

function plotRegions(){
    const regionNames = ["CABO DELGADO" ,"GAZA", "INHAMBANE", "MANICA", "MAPUTO", 
                            "MAPUTO CITY", "NAMPULA", "NIASSA", "SOFALA","TETE","ZAMBEZIA"];
    regionNames.forEach(function(element) {
        plotRegion(element);
    });
}

//Range slider to update right map
$( document ).ready(function(){

     // Initially set the active tab to the first one
     setActiveTab("malaria");

     //Create the initial map
     updateDataMapObservado();

     //Get the initial disease name
     diseaseName();

    //Rangeslider
    var mySlider = new rSlider({
        target: '#weekSlider',
        values: {min: 1, max: 16},
        step: 1,
        range: false,
        tooltip: true,
        labels: true,
        set: [1],
        onChange: function (vals) {
            updateDataMapPrevisto();
        }
    });

    //Create the plots for trends
    plotRegions();

    //Clicks on Malaria and Diarrhea
    $('a[href="#malaria"]').click(function(){
        updateDataMapPrevisto(); 
        updateDataMapObservado();
        diseaseName();
        plotRegions();
    }); 

    $('a[href="#diarrhea"]').click(function(){
        updateDataMapPrevisto();
        updateDataMapObservado();
        diseaseName();
        plotRegions();
    }); 
});

