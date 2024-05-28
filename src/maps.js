// Define getColor function using Viridis color scale
// open /Applications/Google\ Chrome.app --args --user-data-dir=.--disable-web-security
function getColor(value, maxvalue, minvalue) {
    // Define Viridis color scale
    let viridisScale = d3.scaleSequential()
        .domain([0, 1])  // Domain for the color scale
        .interpolator(d3.interpolateViridis);  // Interpolator function using Viridis colors

    // Normalize the value between 0 and 1 (assuming your value range is known)
    let normalizedValue = (value - minvalue) / (maxvalue - minvalue);

    // Get color from the Viridis scale based on the normalized value
    let color = viridisScale(normalizedValue);
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

function updateGradientMap(){
    
    //Get the disease name 
    let disease_name = getActiveTabId();
    let colors = [ 'rgb(255,0,0)', 'rgb(255,255,0)' ];
    //Change size
    resizePlot("gradientMap");

    // Select the SVG element
    let svg = d3.select("#gradientMap");

    // Remove any existing content from the SVG
    svg.selectAll("*").remove();

    // Define the dimensions and margins for the plot
    let margin = { top: 20, right: 30, bottom: 50, left: 40 };
    
    // Change the width and height considering the margins
    let width  = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    let legendWidth = width - margin.left - margin.right;
    let legendHeight = height - margin.top - margin.bottom;

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function(mozambique) {
        d3.csv("data/data.csv").then(function(data) {

            let disease_data = data.filter(function(d) {
                return d.disease === disease_name;
            });

            //Get max and minimum value for the colours
            let maxcolor = d3.max(disease_data, d => +d.rate);
            let mincolor = d3.min(disease_data, d => +d.rate);

            // Define Viridis color scale
            let viridisScale = d3.scaleSequential()
                .domain([mincolor, maxcolor])
                .interpolator(d3.interpolateViridis);

            // Append a defs (definitions) element to hold the gradient definition
            let defs = svg.append("defs");

            // Append a linear gradient element to the defs
            let linearGradient = defs.append("linearGradient")
                .attr("id", "linear-gradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%"); // Gradient from top to bottom

            // Set the stops for the gradient
            for (let i = 0; i <= 100; i++) {
                linearGradient.append("stop")
                    .attr("offset", `${i}%`)
                    .attr("stop-color", getColor(mincolor + ((100 - i)/100)*(maxcolor - mincolor), maxcolor, mincolor));
            }

            // Create a rectangle and apply the gradient
            svg.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#linear-gradient)");

            // Create a scale for the y axis
            let yScale = d3.scaleLinear()
                .domain([maxcolor,mincolor])
                .range([margin.top, height - margin.bottom]);

            // Add y axis
            let yAxis = d3.axisRight(yScale)
                .ticks(10)
                .tickSizeOuter(0);

            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${margin.left + legendWidth}, 0)`)
                .call(yAxis);
        })
    })
}


function updatePrevistoTitle(kweek){
    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#previstoMapText");
    element.textContent = "Previsto dentro de " + kweek + (kweek > 1 ? " semanas" : " semana");
}

function updateDataMapPrevisto() {

    //Get the disease name 
    let disease_name = getActiveTabId();

    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#semanaPrevistoMapText");

    //Change size
    resizePlot("rightMapCanvas");

    // Select the SVG element
    let svg = d3.select("#rightMapCanvas"),
          width  = +svg.attr("width"),
          height = +svg.attr("height");

    // Remove any existing content from the SVG
    svg.selectAll("*").remove();

    // Define the map projection
    let projection = d3.geoMercator()
                        .scale(1)
                        .translate([0, 0]);

    // Define a path generator
    let path = d3.geoPath()
        .projection(projection);

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function(mozambique) {
        d3.csv("data/data.csv").then(function(data) {

            // Fit the GeoJSON data to the SVG size
            projection.fitSize([width, height], mozambique);

            // Convert "date" column to Date objects
            data.forEach(function(d) {
                d.date = new Date(d.date);
            });

            const disease_data = data.filter(function(d) {
                return d.disease === disease_name;
            });

            //Get max and minimum value for the colours
            let maxcolor = d3.max(disease_data, d => +d.rate);
            let mincolor = d3.min(disease_data, d => +d.rate);

            // Filter data by type "Previsto"
            let previsto_data = data.filter(function(d) {
                return d.type === "Previsto" && d.disease === disease_name;
            });

            // Group previstoData by the "Region" column
            let groupedData = d3.group(previsto_data, d => d.Region);

            // Create a map to store CSV data values by Region for "Previsto" type and maximum date
            let dataMap = new Map();

            let nweeks = parseInt($('#weekSlider').val());

            //Update the title
            updatePrevistoTitle(nweeks);
            
            // For each group, filter to keep only the row with the nth minimal date
            Array.from(groupedData.entries()).forEach(function([region, regionData]) {
                const sortedDates = regionData.map(function(d) { return d.date; }).sort(function(a, b) { return a - b; }); // Sort dates in ascending order
                if (sortedDates.length >= nweeks) {
                    const nthMinDate = sortedDates[nweeks - 1]; // Retrieve the nth minimal date
                    const nthMinDateRow = regionData.find(function(d) { return d.date.getTime() === nthMinDate.getTime(); }); // Find the row with the nth minimal date
                    dataMap.set(region, nthMinDateRow); // Store the row in the dataMap with the respective region key

                    // Replace the text content for subtitle
                    const format = d3.timeFormat("%d-%b-%y");
                    element.textContent = "Semana epidemiológica " + nthMinDateRow.epiweek + "/" + (nthMinDateRow.epiyear - 2000) + " (" + format(nthMinDateRow.date) + ")";

                } else {
                    dataMap.set(region, null); // If there are less than n dates, store null in the dataMap
                }
            });

            // Append a group for the map features
            const mapGroup = svg.append("g");

            // Process GeoJSON features
            mapGroup.selectAll("path")
                .data(mozambique.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", function(feature) {
                    const region = feature.properties.ADM1_PT.toUpperCase();
                    const regionData = dataMap.get(region);
                    if (regionData) {
                        const rate = +regionData.rate; // Corrected line
                        return getColor(rate, maxcolor, mincolor); // Assume getColor() returns appropriate color based on value
                    } else {
                        console.warn("No data found for region:", region);
                        return "black";
                    }
                })
                .attr("stroke", "white")
                .on("mousemove", function(event, feature) {
                    const region = feature.properties.ADM1_PT.toUpperCase();
                    const regionData = dataMap.get(region);
                    if (regionData) {
                        const rate = +regionData.rate; // Assuming "value" is the property to display
                        showTooltipMap(region, rate, event.offsetX, event.offsetY, getColor(rate, maxcolor, mincolor), "right");
                    } else {
                        console.warn("No data found for region:", region);
                    }
                })
                .on("mouseout", function() {
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
    let disease_name = getActiveTabId();

    //Resize the map
    resizePlot("leftMapCanvas");

    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#semanaObservadoMapText");

    // Select the SVG element
    let svg = d3.select("#leftMapCanvas"),
          width  = +svg.attr("width"),
          height = +svg.attr("height");

    // Remove any existing content from the SVG
    svg.selectAll("*").remove();

    // Define the map projection
    let projection = d3.geoMercator()
                        .scale(1)
                        .translate([0, 0]);

    // Define a path generator
    let path = d3.geoPath()
                  .projection(projection);

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function(mozambique) {
        d3.csv("data/data.csv").then(function(data) {

            // Convert "date" column to Date objects
            data.forEach(function(d) {
                d.date = new Date(d.date);
            });

            const disease_data = data.filter(function(d) {
                return d.disease === disease_name;
            });

            //Get max and minimum value for the colours
            let maxcolor = d3.max(disease_data, d => +d.rate);
            let mincolor = d3.min(disease_data, d => +d.rate);

            // Filter data by type "Observado"
            const observed_data = data.filter(function(d) {
                return d.type === "Observado" && d.disease === disease_name;
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

                //Get the data for the map
                dataMap.set(region, maxDateRow);

                // Replace the text content for subtitle
                const format = d3.timeFormat("%d-%b-%y");
                element.textContent = "Semana epidemiológica " + maxDateRow.epiweek + "/" + (maxDateRow.epiyear - 2000) + " (" + format(maxDateRow.date) + ")";
            });

            // Fit the GeoJSON data to the SVG size
            projection.fitSize([width, height], mozambique);

            // Append a group for the map features
            const mapGroup = svg.append("g");

            // Process GeoJSON features
            mapGroup.selectAll("path")
                .data(mozambique.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", function(feature) {
                    var region = feature.properties.ADM1_PT.toUpperCase();
                    var regionData = dataMap.get(region);
                    if (regionData) {
                        var rate = +regionData.rate;
                        return getColor(rate, maxcolor, mincolor); // Assume getColor() returns appropriate color based on value
                    } else {
                        console.warn("No data found for region:", region);
                        return "black";
                    }
                })
                .attr("stroke", "white")
                .on("mousemove", function(event, feature) {
                    var region = feature.properties.ADM1_PT.toUpperCase();
                    var regionData = dataMap.get(region);
                    if (regionData) {
                        var rate = +regionData.rate; // Assuming "value" is the property to display
                        showTooltipMap(region, rate, event.offsetX, event.offsetY, getColor(rate, maxcolor, mincolor), "left");
                    } else {
                        console.warn("No data found for region:", region);
                    }
                })
                .on("mouseout", function() {
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
    tooltip.html("<strong>" + region + "</strong>:<br>" + roundedValue + "/100 mil habitantes")
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

    //Resize the plot
    resizePlot(region_id);

    // Select the canvas element
    let svg = d3.select("#" + region_id);
    
    //Clear canvas
    svg.selectAll("*").remove();

    // Get the disease 
    let disease_name = getActiveTabId();
    
    // Define the dimensions and margins for the plot
    let margin = { top: 20, right: 30, bottom: 50, left: 40 };
    
    // Change the width and height considering the margins
    let width  = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    // Append SVG to the body
    let plot = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

    // Read data from CSV file
    d3.csv("data/data.csv").then(function(data) {

      data.forEach(function(d) {
        d.date     = new Date(d.date);
        d.rate     = +d.incident_cases;
        d.rate_low = +d.incident_cases_low; // Assuming these properties exist in your dataset
        d.rate_up  = +d.incident_cases_upp;
        d.epiweek  = +d.epiweek;
      });
      
      // Filter data where type is "Observado"
      let filteredData = data.filter(d => d.disease === disease_name && d.Region === region_name);

      // Define scales for x and y axes
      let xScale = d3.scaleTime()
        .domain(d3.extent(filteredData, d => d.date))
        .range([0, width]);

      let yScale = d3.scaleLinear()
        .domain([0, 1.1*d3.max(filteredData, d => d.rate_up)])
        .range([height, 0]);

      // Define x and y axes
      // Define x and y axes
      let xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat((date) => {
            // Format ticks as date + epiweek if available
            let dt = new Date(date);
            dt.setDate(dt.getDate() - 7);
            
            const dataPoint = filteredData.find(d => d.date <= date && d.date > dt);
            const epiweek = dataPoint.epiweek;
            const epiyear = dataPoint.epiyear - 2000;

            return epiweek + "/" + epiyear;
        })
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


        // Define a second x axis at the top
        let topXAxis = d3.axisTop(xScale)
            .ticks(5)
            .tickFormat(d3.timeFormat("%b/%y"))
            .tickSizeOuter(0);

            // Append the top x axis
            plot.append("g")
            .call(topXAxis);

        // Append label to the top axis
        plot.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom/2 + margin.top/2) 
            .style("text-anchor", "middle")
            .text("Semana epidemiológica");

      // Define line generator
      let line = d3.line()
          .x(d => xScale(d.date))
          .y(d => yScale(d.rate));

      // Show confidence interval
      plot.append("path")
        .datum(filteredData)
        .attr("fill", "#2a788eff")
        .attr("opacity", 0.5)
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

function resizePlot(idelement){
    const parent = document.getElementById(idelement).parentNode;
    const svg = parent.querySelector('svg');
    function scaleSVG() {
        const { width, height } = parent.getBoundingClientRect();
        svg.setAttribute('height', 0.9*height);
        svg.setAttribute('width', 0.9*width);
    }
    scaleSVG();
}

//Range slider to update right map
$( document ).ready(function(){

     // Initially set the active tab to the first one
     setActiveTab("malaria");

     //Create the initial map
     updateDataMapObservado();

     //Create the initial map
     updateGradientMap();

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
        scale: false,
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
        updateGradientMap();
        diseaseName();
        plotRegions();
    }); 

    $('a[href="#diarrhea"]').click(function(){
        updateDataMapPrevisto();
        updateDataMapObservado();
        updateGradientMap();
        diseaseName();
        plotRegions();
    }); 

    //Add listener to resize and replot
    $(window).resize(function () { 
        plotRegions();
     });
});

