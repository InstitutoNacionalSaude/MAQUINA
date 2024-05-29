
/*
Developed by Rodrigo Zepeda-Tello
MIT LICENSE
Copyright 2024 Columbia University in the City of New York
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial
portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Define a custom formatter to concatenate epiweek and epiyear
function rateCiFormatter(cell, formatterParams, onRendered) {
    // Get the row data
    var rowData = cell.getRow().getData();

    // Concatenate epiweek and epiyear with a separator (e.g., "/")
    return rowData.Rate_Low.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " a " +
        rowData.Rate_Up.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// Define a custom formatter to concatenate epiweek and epiyear
function arrowFormatter(cell, formatterParams, onRendered) {
    // Get the row data
    var rowData = cell.getRow().getData();

    // Concatenate epiweek and epiyear with a separator (e.g., "/")
    let trend = Math.round(100.0 * (rowData.Rate_Previsto / rowData.Rate_Observado - 1.0)),
        arrow = Math.abs(trend) < 0.1 ? "≈" : (trend > 0.0 ? "↑" : "↓");

    return arrow;
}

// Define a custom formatter to concatenate epiweek and epiyear
function casesCiFormatter(cell, formatterParams, onRendered) {
    // Get the row data
    var rowData = cell.getRow().getData();

    // Concatenate epiweek and epiyear with a separator (e.g., "/")
    return rowData.Cases_Low.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " a " +
        rowData.Cases_Up.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

//Loader for table
function loadCSVData(url, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            let parsedData = Papa.parse(data, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            }).data;

            // Get the disease 
            let disease_name = getActiveTabId();
            let nweeks = parseInt($('#weekSlider').val());

            // Parse date values as JavaScript Date objects
            parsedData.forEach(row => {
                row.date = luxon.DateTime.fromISO(row.date);
            });

            // Filter data based on disease_name
            let previsto_data = parsedData.filter(row => row.disease === disease_name && row.type === "Previsto");
            let observado_data = parsedData.filter(row => row.disease === disease_name && row.type === "Observado");

            // Find the maximum date
            let maxObservado = observado_data.reduce((max, row) => (row.date > max ? row.date : max), observado_data[0].date);
            let minPrevisto = previsto_data.reduce((min, row) => (row.date < min ? row.date : min), previsto_data[0].date).plus({ days: 7 * (nweeks - 1) });

            // Keep only rows with the maximum date
            observado_data = observado_data.filter(row => row.date.equals(maxObservado));
            previsto_data = previsto_data.filter(row => row.date.equals(minPrevisto));

            // Rename columns of observado_data
            observado_data = observado_data.map(row => ({
                Region_Observado: row.Region,
                Rate_Observado: row.rate,
                Cases_Observado: row.incident_cases,
                Epiweek_Observado: row.epiweek,
                Epiyear_Observado: row.epiyear,
                Date_Observado: row.date,
            }));

            // Rename columns of previsto_data
            previsto_data = previsto_data.map(row => ({
                Region_Previsto: row.Region,
                Rate_Previsto: row.rate,
                Rate_Low: row.rate_low,
                Rate_Up: row.rate_up,
                Cases_Previsto: row.incident_cases,
                Cases_Low: row.incident_cases_low,
                Cases_Up: row.incident_cases_upp,
                Epiweek_Previsto: row.epiweek,
                Epiyear_Previsto: row.epiyear,
                Date_Previsto: row.date,
            }));

            // Create a map of observado_data by Region
            let observadoMap = new Map();
            observado_data.forEach(row => {
                observadoMap.set(row.Region_Observado, row);
            });

            // Merge observado_data and previsto_data based on Region
            let mergedData = previsto_data.map(previstoRow => {
                let observadoRow = observadoMap.get(previstoRow.Region_Previsto);
                return { ...previstoRow, ...observadoRow };
            });

            // Calculate the trend values and add them to the data
            mergedData.forEach(row => {
                // Check if column2 is 0 to prevent division by zero
                if (row.Rate_Observado === 0) {
                    row.trend = "Undefined";
                } else {
                    row.trend = (row.Rate_Previsto / row.Rate_Observado - 1.0);
                }
            });

            callback(mergedData);
        });
}

//Create the table
function getTable() {

    // Load data and create the Tabulator table
    loadCSVData("data/data.csv", function (data) {

        let nweeks = parseInt($('#weekSlider').val());

        updateTableTitle(nweeks);

        updateTableFooter(data[0].Epiweek_Observado, data[0].Epiyear_Observado, data[0].Date_Observado,
            data[0].Epiweek_Previsto, data[0].Epiyear_Previsto, data[0].Date_Previsto);

        let table = new Tabulator("#table", {
            data: data,
            autoColumns: false, // Let us define columns
            columns: [
                { title: "Region", field: "Region_Previsto", sorter: "string", hozAlign: "right", frozen: true },
                {
                    title: "Tendência",
                    field: "trend",
                    sorter: "number",
                    hozAlign: "center",
                    formatter: arrowFormatter
                },
                {
                    title: "Alteração<br>Percentual",
                    field: "trend",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: function (cell) {
                        // Round the cases value and add commas
                        return cell.getValue().toLocaleString(undefined, { style: "percent", maximumFractionDigits: 1 });
                    }
                },
                {
                    title: "Observação<br>semana mais recente",
                    field: "Cases_Observado",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: function (cell) {
                        // Round the cases value and add commas
                        return cell.getValue().toLocaleString(undefined, { maximumFractionDigits: 1 });
                    }
                },
                {
                    title: "Casos previstos",
                    field: "Cases_Previsto",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: function (cell) {
                        return cell.getValue().toLocaleString(undefined, { maximumFractionDigits: 1 });
                    }
                },
                {
                    title: "Casos previstos (intervalo)",
                    field: "Rate_Low",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: casesCiFormatter
                },
                {
                    title: "Taxa observada<br>semana mais recente",
                    field: "Rate_Observado",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: function (cell) {
                        return cell.getValue().toLocaleString(undefined, { maximumFractionDigits: 1 });
                    }
                },
                {
                    title: "Taxa prevista",
                    field: "Rate_Previsto",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: function (cell) {
                        return cell.getValue().toLocaleString(undefined, { maximumFractionDigits: 1 });
                    }
                },
                {
                    title: "Taxa prevista (intervalo)",
                    field: "Rate_Low",
                    sorter: "number",
                    hozAlign: "right",
                    formatter: rateCiFormatter
                },
            ],
            layout: "fitDataFill", // Fit columns to width of table
            pagination: false,
            printAsHtml:true, //enable html table printing
            //printStyled:true, //copy Tabulator styling to HTML table
            paginationSize: 11,
            printRowRange:"active",
            movableColumns: true,      //allow column order to be changed
            columnHeaderVertAlign: "bottom", //align header contents to bottom of cell
            initialSort: [ // Specify the initial sort order
                { column: "Region_Previsto", dir: "asc" }, // Sort by date in ascending order by default
            ]
        });
    });
}

// Define getColor function using Viridis color scale
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

function updatePrevistoTitle(kweek) {
    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#previstoMapText");
    element.textContent = "Previsto dentro de " + kweek + (kweek > 1 ? " semanas" : " semana");
}

function updateTableTitle(kweek) {
    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#tabletitle");
    element.innerHTML = "Casos observados e previstos (dentro de " + kweek + (kweek > 1 ? " semanas" : " semana") + ")";
}

function updateLegendTitle() {
    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#legendasubtitle");

    //Decide whether its casos or taxa
    let taxa = document.getElementById('casosswitch').checked;

    element.innerHTML = taxa ? "Taxa por 100 mil habitantes" : "Casos totales";
}

function updateTableFooter(epiweekobs, epiyearobs, dateobs, epiweekpred, epiyearpred, datepred) {

    const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
    };

    // Select the element with id "dateobs"
    let element = document.querySelector("#dateobs");
    element.innerHTML = "<b>Semana observada:</b> " + epiweekobs + "/" + (epiyearobs - 2000) + " [" +
        dateobs.toLocaleString(options) + "]" + " | <b>Semana prevista:</b> " + epiweekpred + "/" +
        (epiyearpred - 2000) + " [" + datepred.toLocaleString(options) + "]";
}

function updateDataMapPrevisto() {

    //Get the disease name 
    let disease_name = getActiveTabId();

    // Select the element with id "semanaObservadoMapText"
    let element = document.querySelector("#semanaPrevistoMapText");

    //Decide whether its casos or taxa
    let taxa = document.getElementById('casosswitch').checked;

    //Change size
    resizePlot("rightMapCanvas");

    // Select the SVG element
    let svg = d3.select("#rightMapCanvas"),
        width = +svg.attr("width"),
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
    d3.json("map/mozambique.geojson").then(function (mozambique) {
        d3.csv("data/data.csv").then(function (data) {

            // Fit the GeoJSON data to the SVG size
            projection.fitSize([width, height], mozambique);

            // Convert "date" column to Date objects
            data.forEach(function (d) {
                d.date = new Date(d.date);
            });

            const disease_data = data.filter(function (d) {
                return d.disease === disease_name;
            });

            //Get max and minimum value for the colours
            let maxcolor = d3.max(disease_data, d => taxa ? +d.rate : +d.incident_cases),
                mincolor = d3.min(disease_data, d => taxa ? +d.rate : +d.incident_cases);

            // Filter data by type "Previsto"
            let previsto_data = data.filter(function (d) {
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
            Array.from(groupedData.entries()).forEach(function ([region, regionData]) {
                let sortedDates = regionData.map(function (d) { return d.date; }).sort(function (a, b) { return a - b; }); // Sort dates in ascending order
                if (sortedDates.length >= nweeks) {
                    let nthMinDate = sortedDates[nweeks - 1]; // Retrieve the nth minimal date
                    let nthMinDateRow = regionData.find(function (d) { return d.date.getTime() === nthMinDate.getTime(); }); // Find the row with the nth minimal date
                    dataMap.set(region, nthMinDateRow); // Store the row in the dataMap with the respective region key

                    // Replace the text content for subtitle
                    let format = d3.timeFormat("%d-%b-%y");
                    element.textContent = "Semana epidemiológica " + nthMinDateRow.epiweek + "/" + (nthMinDateRow.epiyear - 2000) + " (" + format(nthMinDateRow.date) + ")";

                } else {
                    dataMap.set(region, null); // If there are less than n dates, store null in the dataMap
                }
            });

            // Append a group for the map features
            let mapGroup = svg.append("g");

            // Process GeoJSON features
            mapGroup.selectAll("path")
                .data(mozambique.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", function (feature) {
                    let region = feature.properties.ADM1_PT.toUpperCase();
                    let regionData = dataMap.get(region);
                    if (regionData) {
                        let val = taxa ? +regionData.rate : +regionData.incident_cases;
                        return getColor(val, maxcolor, mincolor);
                    } else {
                        console.warn("No data found for region:", region);
                        return "black";
                    }
                })
                .attr("stroke", "white")
                .on("mousemove", function (event, feature) {
                    let region = feature.properties.ADM1_PT.toUpperCase();
                    let regionData = dataMap.get(region);
                    if (regionData) {
                        let val = taxa ? +regionData.rate : +regionData.incident_cases;
                        showTooltipMap(region, val, event.offsetX, event.offsetY, getColor(val, maxcolor, mincolor), "right", taxa);
                    } else {
                        console.warn("No data found for region:", region);
                    }
                })
                .on("mouseout", function () {
                    d3.select("#rightTooltipMap").style("display", "none");
                });

        }).catch(function (error) {
            console.error("Error loading CSV:", error);
        });

    }).catch(function (error) {
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

    //Decide whether its casos or taxa
    let taxa = document.getElementById('casosswitch').checked;

    // Select the SVG element
    let svg = d3.select("#leftMapCanvas"),
        width = +svg.attr("width"),
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

    // Change size
    resizePlot("gradientMap");

    // Select the SVG element
    let svggrad = d3.select("#gradientMap");

    // Remove any existing content from the SVG
    svggrad.selectAll("*").remove();

    // Define the dimensions and margins for the plot
    let margin = { top: 50, right: 100, bottom: 30, left: 100 };

    // Get the width and height from the SVG element
    let width_grad = +svggrad.attr("width"),
        height_grad = +svggrad.attr("height");

    // Calculate the inner width and height considering the margins
    let legendWidth = width_grad - margin.left - margin.right,
        legendHeight = height_grad - margin.top - margin.bottom;

    // Load GeoJSON data from file
    d3.json("map/mozambique.geojson").then(function (mozambique) {
        d3.csv("data/data.csv").then(function (data) {

            // Convert "date" column to Date objects
            data.forEach(function (d) {
                d.date = new Date(d.date);
            });

            let disease_data = data.filter(function (d) {
                return d.disease === disease_name;
            });

            // Get max and minimum value for the colours
            let maxcolor = d3.max(disease_data, d => taxa ? +d.rate : +d.incident_cases),
                mincolor = d3.min(disease_data, d => taxa ? +d.rate : +d.incident_cases);

            // Create the gradient
            // Append a defs (definitions) element to hold the gradient definition
            let defs = svggrad.append("defs");

            //Update legend title
            updateLegendTitle();

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
                    .attr("stop-color", getColor(mincolor + ((100 - i) / 100) * (maxcolor - mincolor), maxcolor, mincolor));
            }

            // Create a rectangle and apply the gradient
            svggrad.append("rect")
                .attr("x", margin.left)
                .attr("y", margin.top)
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#linear-gradient)");

            // Create a scale for the y axis
            let yScalegrad = d3.scaleLinear()
                .domain([maxcolor, mincolor]) // Reversed domain
                .range([margin.top, height_grad - margin.bottom]); // Ensure this range covers the correct height

            // Add y axis
            let yAxisgrad = d3.axisRight(yScalegrad)
                .ticks(10)
                .tickSizeOuter(0);

            svggrad.append("g")
                .attr("class", "y axis")
                .attr("transform", `translate(${margin.left + legendWidth}, 0)`)
                .call(yAxisgrad);

            // Filter data by type "Observado"
            let observed_data = data.filter(function (d) {
                return d.type === "Observado" && d.disease === disease_name;
            });

            // Group observadoData by the "Region" column
            let groupedData = d3.group(observed_data, d => d.Region);

            // Create a map to store CSV data values by Region for "Observado" type and maximum date
            let dataMap = new Map();

            // For each group, filter to keep only the row with the highest date
            Array.from(groupedData.entries()).forEach(function ([region, regionData]) {
                let maxDateRow = regionData.reduce(function (maxDateRow, currentRow) {
                    if (!maxDateRow || currentRow.date > maxDateRow.date) {
                        return currentRow;
                    } else {
                        return maxDateRow;
                    }
                }, null);

                //Get the data for the map
                dataMap.set(region, maxDateRow);

                // Replace the text content for subtitle
                let format = d3.timeFormat("%d-%b-%y");
                element.textContent = "Semana epidemiológica " + maxDateRow.epiweek + "/" + (maxDateRow.epiyear - 2000) + " (" + format(maxDateRow.date) + ")";
            });

            // Fit the GeoJSON data to the SVG size
            projection.fitSize([width, height], mozambique);

            // Append a group for the map features
            let mapGroup = svg.append("g");

            // Process GeoJSON features
            mapGroup.selectAll("path")
                .data(mozambique.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", function (feature) {
                    let region = feature.properties.ADM1_PT.toUpperCase();
                    let regionData = dataMap.get(region);
                    if (regionData) {
                        let val = taxa ? +regionData.rate : +regionData.incident_cases;
                        return getColor(val, maxcolor, mincolor); // Assume getColor() returns appropriate color based on value
                    } else {
                        console.warn("No data found for region:", region);
                        return "black";
                    }
                })
                .attr("stroke", "white")
                .on("mousemove", function (event, feature) {
                    let region = feature.properties.ADM1_PT.toUpperCase();
                    let regionData = dataMap.get(region);
                    if (regionData) {
                        let val = taxa ? +regionData.rate : +regionData.incident_cases;
                        showTooltipMap(region, val, event.offsetX, event.offsetY, getColor(val, maxcolor, mincolor), "left", taxa);
                    } else {
                        console.warn("No data found for region:", region);
                    }
                })
                .on("mouseout", function () {
                    d3.select("#leftTooltipMap").style("display", "none");
                });

        }).catch(function (error) {
            console.error("Error loading CSV:", error);
        });

    }).catch(function (error) {
        console.error("Error loading GeoJSON:", error);
    });
}

// Function to show tooltip in region map
function showTooltipMap(region, value, x, y, bgcolor, side, taxa) {

    // Round the value
    let roundedValue = value.toLocaleString(undefined, { maximumFractionDigits: 1 });

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
    tooltip.html("<strong>" + region + "</strong>:<br>" + roundedValue + (taxa ? "/100 mil habitantes" : " casos"))
        .style("left", x + "px")
        .style("top", (y - 1.1 * height) + "px")
        .style("background-color", bgcolor)
        .style("display", "block");
}

function plotRegion(regionName) {

    //Decide whether its casos or taxa
    let taxa = document.getElementById('casosswitch').checked;

    let region_name = regionName.toUpperCase();
    let region_id;
    switch (region_name) {
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
    let margin = { top: 20, right: 30, bottom: 50, left: 60 };

    // Change the width and height considering the margins
    let width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    // Append SVG to the body
    let plot = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Read data from CSV file
    d3.csv("data/data.csv").then(function (data) {

        data.forEach(function (d) {
            d.date = new Date(d.date);
            d.val = taxa ? +d.rate : +d.incident_cases;
            d.val_low = taxa ? +d.rate_low : +d.incident_cases_low; // Assuming these properties exist in your dataset
            d.val_up = taxa ? +d.rate_up : +d.incident_cases_upp;
            d.epiweek = +d.epiweek;
        });

        // Filter data where type is "Observado"
        let filteredData = data.filter(d => d.disease === disease_name && d.Region === region_name);

        // Define scales for x and y axes
        let xScale = d3.scaleTime()
            .domain(d3.extent(filteredData, d => d.date))
            .range([0, width]);

        let yScale = d3.scaleLinear()
            .domain([0, 1.1 * d3.max(filteredData, d => d.val_up)])
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
            .attr("y", height + margin.bottom / 2 + margin.top / 2)
            .style("text-anchor", "middle")
            .text("Semana epidemiológica");

        // Append label to the top axis
        plot.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2) // Center the label on the y-axis
            .attr("y", -margin.left / 2 - margin.right / 2) // Position the label outside the plot area
            //.attr("dy", "1em") // Adjust vertical alignment
            .style("text-anchor", "middle")
            .text(taxa ? "Taxa por 100mil" : "Casos");

        // Define line generator
        let line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.val));

        // Show confidence interval
        plot.append("path")
            .datum(filteredData)
            .attr("fill", "#2a788eff")
            .attr("opacity", 0.5)
            .attr("stroke", "none")
            .attr("d", d3.area()
                .x(function (d) { return xScale(d.date); })
                .y0(function (d) { return yScale(d.val_low); })
                .y1(function (d) { return yScale(d.val_up); })
            );

        // Append path for the line chart
        plot.append("path")
            .datum(filteredData)
            .attr("fill", "none")
            .attr("stroke", "#404040")
            .attr("stroke-width", 1.5)
            .attr("d", line);

    }).catch(function (error) {
        console.log("Error reading data:", error);
    });
}

function plotRegions() {
    const regionNames = ["CABO DELGADO", "GAZA", "INHAMBANE", "MANICA", "MAPUTO",
        "MAPUTO CITY", "NAMPULA", "NIASSA", "SOFALA", "TETE", "ZAMBEZIA"];
    regionNames.forEach(function (element) {
        plotRegion(element);
    });
}

function resizePlot(idelement) {
    const parent = document.getElementById(idelement).parentNode;
    const svg = parent.querySelector('svg');
    function scaleSVG() {
        const { width, height } = parent.getBoundingClientRect();
        svg.setAttribute('height', 0.9 * height);
        svg.setAttribute('width', 0.9 * width);
    }
    scaleSVG();
}

//Range slider to update right map
$(document).ready(function () {

    // Initially set the active tab to the first one
    setActiveTab("malaria");

    //Create the table
    getTable();

    //Create the initial map
    updateDataMapObservado();

    //Get the initial disease name
    diseaseName();

    //Rangeslider
    var mySlider = new rSlider({
        target: '#weekSlider',
        values: { min: 1, max: 16 },
        step: 1,
        range: false,
        tooltip: true,
        labels: true,
        scale: false,
        set: [1],
        onChange: function (vals) {
            updateDataMapPrevisto();
            getTable();
        }
    });

    //Create the plots for trends
    plotRegions();

    //Clicks on Malaria and Diarrhea
    $('a[href="#malaria"]').click(function () {
        updateDataMapPrevisto();
        updateDataMapObservado();
        diseaseName();
        getTable();
        plotRegions();
    });

    $('a[href="#diarrhea"]').click(function () {
        updateDataMapPrevisto();
        updateDataMapObservado();
        diseaseName();
        getTable();
        plotRegions();
    });

    //Add listener to resize and replot
    $(window).resize(function () {
        plotRegions();
    });

    //Add listener to switch
    document.getElementById('casosswitch').addEventListener('change', function () {
        updateLegendTitle();
        updateDataMapPrevisto();
        updateDataMapObservado();
        plotRegions();
    });
});

