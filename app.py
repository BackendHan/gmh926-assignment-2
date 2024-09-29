from flask import Flask, request, jsonify, render_template
import numpy as np
from sklearn.metrics import pairwise_distances_argmin
import pandas as pd
import plotly.express as px
import json

app = Flask(__name__)

shared_data = None

def generate_random_dataset(num_samples=300, num_features=2, scale=20, offset=-10):
    return np.random.rand(num_samples, num_features) * scale + offset

class KMeansClustering:
    def __init__(self, dataset, num_clusters, initialization='random', max_iterations=100):
        self.dataset = dataset
        self.num_clusters = num_clusters
        self.initialization = initialization
        self.max_iterations = max_iterations
        self.centroids = None
        self.history_centroids = []
        self.history_labels = []

    def initialize_centroids(self):
        if isinstance(self.initialization, str):
            method = self.initialization.lower()
            if method == 'random':
                indices = np.random.choice(self.dataset.shape[0], self.num_clusters, replace=False)
                self.centroids = self.dataset[indices]
            elif method == 'k-means++':
                self.centroids = self._kmeans_plus_plus()
            elif method == 'farthest':
                self.centroids = self._farthest_first()
            else:
                raise ValueError(f"Initialization method '{self.initialization}' is not supported.")
        else:
            self.centroids = np.array(self.initialization)

        self.history_centroids.append(self.centroids.copy())

    def _farthest_first(self):
        """
                Farthest-first traversal initialization.

                Returns:
                - An array of initialized centroids.
                """
        # Start with a random centroid
        centroids = [self.dataset[np.random.randint(len(self.dataset))]]
        for _ in range(1, self.num_clusters):
            distances = np.array([min(np.linalg.norm(point - center) for center in centroids) for point in self.dataset])
            centroids.append(self.dataset[np.argmax(distances)])
        return np.array(centroids)

    def _kmeans_plus_plus(self):
        """
               KMeans++ initialization method.

               Returns:
               - An array of initialized centroids.
               """
        # Start with a random centroid
        centroids = [self.dataset[np.random.randint(len(self.dataset))]]
        for _ in range(1, self.num_clusters):
            distances = np.array([min(np.sum((point - center) ** 2) for center in centroids) for point in self.dataset])
            probabilities = distances / distances.sum()
            cumulative_probs = np.cumsum(probabilities)
            r = np.random.rand()
            index = np.searchsorted(cumulative_probs, r)
            centroids.append(self.dataset[index])
        return np.array(centroids)

    def execute(self, converge=False):
        """
                Run the KMeans clustering algorithm.

                Parameters:
                - converge: If True, run only one iteration (useful for visualization).

                Returns:
                - A tuple containing the history of centroids and labels.
                """
        # Initialize centroids
        self.initialize_centroids()

        for _ in range(self.max_iterations):
            labels = pairwise_distances_argmin(self.dataset, self.centroids)
            self.history_labels.append(labels)

            new_centroids = []
            for i in range(self.num_clusters):
                points = self.dataset[labels == i]
                if points.size:
                    new_centroids.append(points.mean(axis=0))
                else:
                    new_centroids.append(self.centroids[i])

            new_centroids = np.array(new_centroids)
            self.history_centroids.append(new_centroids)

            if np.allclose(self.centroids, new_centroids):
                break

            self.centroids = new_centroids

            if converge:
                self.history_centroids = [new_centroids]
                self.history_labels = [labels]
                break

        return self.history_centroids, self.history_labels

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/initial_data', methods=['GET'])
def initial_data():
    global shared_data
    data = generate_random_dataset()
    shared_data = data
    df = pd.DataFrame(data, columns=['x', 'y'])
    fig = px.scatter(df, x='x', y='y', title='Generated Data')
    return jsonify({'graph': fig.to_json()})

@app.route('/kmeans', methods=['POST'])
def kmeans_endpoint():
    global shared_data

    if shared_data is None:
        return jsonify({'error': 'Dataset not found. Please generate data first.'})

    num_clusters = int(request.form.get('num_clusters', 3))
    initialization = request.form.get('init_method', 'random')
    converge = request.form.get('run_to_convergence', 'false').lower() == 'true'

    data = shared_data.copy()

    if initialization.lower() == 'manual':
        centroids_input = np.array(json.loads(request.form['centroids']))
        init_value = centroids_input
    else:
        init_value = initialization

    kmeans = KMeansClustering(
        dataset=data,
        num_clusters=num_clusters,
        initialization=init_value
    )

    centroids_history, labels_history = kmeans.execute(converge=converge)

    centroids_output = [centroid.tolist() for centroid in centroids_history]
    labels_output = [label.tolist() for label in labels_history]
    data_output = data.tolist()

    return jsonify({'centroids': centroids_output, 'labels': labels_output, 'data': data_output})

if __name__ == '__main__':
    app.run(debug=True)
