// static/js/main.js

let selected_centroids = [];
let num_clusters = parseInt(document.getElementById('num_clusters').value, 10);
let dataset = null;
let centroidTraces = [];

const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#000000'];

window.onload = function() {
    fetchInitialData();
    updateButtonStates();
};

document.getElementById('GeneratenNewDataset').addEventListener('click', function() {
    fetchInitialData();
});

document.getElementById('num_clusters').addEventListener('change', function() {
    num_clusters = parseInt(document.getElementById('num_clusters').value, 10);
    selected_centroids = [];
    updateButtonStates();
    if (dataset !== null) {
        Plotly.newPlot('graph', dataset, defaultLayout());
    }
});

document.getElementById('init_method').addEventListener('change', function() {
    const init_method = document.getElementById('init_method').value;

    if (init_method === 'manual') {
        setupClickListener();
    } else {
        removeClickListener();
    }

    selected_centroids = [];
    updateButtonStates();

    if (dataset === null) {
        fetchInitialData();
    } else {
        Plotly.newPlot('graph', dataset, defaultLayout());
    }
});

function updateButtonStates() {
    const init_method = document.getElementById('init_method').value;
    if (init_method !== 'manual') {
        document.getElementById('runKMeans').disabled = false;
        document.getElementById('runConvergence').disabled = false;
    } else {
        document.getElementById('runKMeans').disabled = selected_centroids.length !== num_clusters;
        document.getElementById('runConvergence').disabled = selected_centroids.length !== num_clusters;
    }
}

document.getElementById('runKMeans').addEventListener('click', function() {
    let init_method = document.getElementById('init_method').value;
    let formData = new FormData();
    formData.append('num_clusters', num_clusters);
    formData.append('init_method', init_method);

    if (init_method === 'manual') {
        formData.append('centroids', JSON.stringify(selected_centroids));
    }

    fetch('/kmeans', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        let centroids = data.centroids;
        let labels = data.labels;
        let points = data.data;

        let i = 0;
        function updateKMeans() {
            if (i < centroids.length) {
                let current_centroids = centroids[i];
                let current_labels = labels[i];

                let scatterDataDict = {};
                for (let idx = 0; idx < points.length; idx++) {
                    let label = current_labels[idx];
                    if (!scatterDataDict[label]) {
                        scatterDataDict[label] = { x: [], y: [] };
                    }
                    scatterDataDict[label].x.push(points[idx][0]);
                    scatterDataDict[label].y.push(points[idx][1]);
                }

                let scatterData = Object.keys(scatterDataDict).map(label => ({
                    x: scatterDataDict[label].x,
                    y: scatterDataDict[label].y,
                    mode: 'markers',
                    marker: { size: 6, color: colors[label % colors.length] },
                    type: 'scatter',
                    name: `Cluster ${parseInt(label) + 1}`
                }));

                let centroidScatter = {
                    x: current_centroids.map(c => c[0]),
                    y: current_centroids.map(c => c[1]),
                    mode: 'markers',
                    marker: { size: 12, color: 'red', symbol: 'cross' },
                    type: 'scatter',
                    name: 'Centroids'
                };

                centroidTraces.push(centroidScatter);
                Plotly.newPlot('graph', scatterData.concat([centroidScatter]), defaultLayout());

                i++;
                setTimeout(updateKMeans, 1000);
            }
        }
        updateKMeans();
    });
});

document.getElementById('runConvergence').addEventListener('click', function() {
    let init_method = document.getElementById('init_method').value;
    let formData = new FormData();
    formData.append('num_clusters', num_clusters);
    formData.append('init_method', init_method);
    formData.append('run_to_convergence', true);

    if (init_method === 'manual') {
        formData.append('centroids', JSON.stringify(selected_centroids));
    }

    fetch('/kmeans', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        let centroids = data.centroids[0];
        let labels = data.labels[0];
        let points = data.data;

        let scatterDataDict = {};
        for (let idx = 0; idx < points.length; idx++) {
            let label = labels[idx];
            if (!scatterDataDict[label]) {
                scatterDataDict[label] = { x: [], y: [] };
            }
            scatterDataDict[label].x.push(points[idx][0]);
            scatterDataDict[label].y.push(points[idx][1]);
        }

        let scatterData = Object.keys(scatterDataDict).map(label => ({
            x: scatterDataDict[label].x,
            y: scatterDataDict[label].y,
            mode: 'markers',
            marker: { size: 6, color: colors[label % colors.length] },
            type: 'scatter',
            name: `Cluster ${parseInt(label) + 1}`
        }));

        let centroidScatter = {
            x: centroids.map(c => c[0]),
            y: centroids.map(c => c[1]),
            mode: 'markers',
            marker: { size: 12, color: 'red', symbol: 'cross' },
            type: 'scatter',
            name: 'Centroids'
        };

        centroidTraces.push(centroidScatter);

        Plotly.newPlot('graph', scatterData.concat([centroidScatter]), defaultLayout());
    });
});

let clickHandler;

function setupClickListener() {
    let graphDiv = document.getElementById('graph');

    removeClickListener();

    clickHandler = function(event) {
        if (selected_centroids.length < num_clusters) {
            let plotArea = graphDiv.querySelector('.plotly .cartesianlayer .plot');
            if (!plotArea) {
                console.error('Could not find plot area element.');
                return;
            }

            let bbox = plotArea.getBoundingClientRect();

            let x = event.clientX - bbox.left;
            let y = event.clientY - bbox.top;

            let xaxis = graphDiv._fullLayout.xaxis;
            let yaxis = graphDiv._fullLayout.yaxis;

            let xInDataCoords = xaxis.p2d(x);
            let yInDataCoords = yaxis.p2d(y);

            if (xInDataCoords >= xaxis.range[0] && xInDataCoords <= xaxis.range[1] &&
                yInDataCoords >= yaxis.range[0] && yInDataCoords <= yaxis.range[1]) {

                console.log('Selected Centroid:', xInDataCoords, yInDataCoords);

                selected_centroids.push([xInDataCoords, yInDataCoords]);

                let centroidTrace = {
                    x: [xInDataCoords],
                    y: [yInDataCoords],
                    mode: 'markers',
                    marker: { size: 12, color: 'red', symbol: 'cross' },
                    type: 'scatter'
                };
                centroidTraces.push(centroidTrace);
                Plotly.addTraces('graph', centroidTrace);

                updateButtonStates();
            }
        }
    };

    graphDiv.addEventListener('click', clickHandler);
}

function removeClickListener() {
    let graphDiv = document.getElementById('graph');
    if (clickHandler) {
        graphDiv.removeEventListener('click', clickHandler);
        clickHandler = null;
    }
}

function fetchInitialData() {
    fetch('/initial_data')
        .then(response => response.json())
        .then(data => {
            let graphData = JSON.parse(data.graph);
            let initialData = graphData.data;

            dataset = initialData;

            Plotly.newPlot('graph', dataset, defaultLayout());

            selected_centroids = [];
            centroidTraces = [];

            const init_method = document.getElementById('init_method').value;
            if (init_method === 'manual') {
                setupClickListener();
            } else {
                removeClickListener();
            }

            updateButtonStates();
        });
}

document.getElementById('reset').addEventListener('click', function() {
    num_clusters = parseInt(document.getElementById('num_clusters').value, 10);
    const init_method = document.getElementById('init_method').value;

    selected_centroids = [];

    let graphDiv = document.getElementById('graph');
    let traceCount = graphDiv.data.length;
    let traceIndicesToRemove = [];

    for (let i = 0; i < traceCount; i++) {
        if (graphDiv.data[i].name === 'Centroids' || (graphDiv.data[i].marker && graphDiv.data[i].marker.symbol === 'cross')) {
            traceIndicesToRemove.push(i);
        }
    }

    traceIndicesToRemove.sort((a, b) => b - a);

    for (let idx of traceIndicesToRemove) {
        Plotly.deleteTraces('graph', idx);
    }

    centroidTraces = [];

    if (dataset !== null) {
        Plotly.newPlot('graph', dataset, defaultLayout());
    }

    if (init_method === 'manual') {
        setupClickListener();
    } else {
        removeClickListener();
    }
    updateButtonStates();
});

function defaultLayout() {
    return {
        title: 'Initial Data',
        plot_bgcolor: "#ffffff",
        paper_bgcolor: "#ffffff",
        xaxis: { title: 'x', range: [-10, 10] },
        yaxis: { title: 'y', range: [-10, 10] }
    };
}
