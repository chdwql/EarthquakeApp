# Cluster computation and featuring module

import datetime as dt
import pandas as pd
import numpy as np


def get(anorm_rates, anomalies):
    '''
    Computes the anomaly point clusters from data anomaly rates

    Args:
        anorm_rates: (dataframe) anomaly rate from anomdetec/detectanomalies.py
        anomalies: (dataframe) anomaly data points

    Returns:
        clusters: list of clusters. Each cluster is a list of data points (timestamp, value)
    '''

    # extracts the clusters in dates, albeit sloppily
    cluster_pts = []
    for index, row in anorm_rates.iterrows():
        if row['log_z_score_zero_trans'] > 1.96:
            cluster_pts.append(index)

    # gets the cluster time intervals
    clusters_intervals = []
    first_on_cluster, last_time = True, cluster_pts[0]

    for i, time in enumerate(cluster_pts):
        if first_on_cluster:
            ini_time = time
            first_on_cluster = False

        elif time - cluster_pts[i - 1] > dt.timedelta(hours=2):
            clusters_intervals.append((ini_time, cluster_pts[i - 1]))
            first_on_cluster = True

    if not first_on_cluster:
        clusters_intervals.append((ini_time, cluster_pts[-1]))

    # gets the anomaly points
    clusters = []
    for begin, end in clusters_intervals:
        cut = anomalies[begin:end]
        if len(cut):  # TODO: why?
            clusters.append(cut)

    return clusters


def get_mean(df_c):
    # Computes mean from cluster data frame df_c
    df = pd.DataFrame()
    df['unix_time'] = df_c.index.astype(np.int64)
    df_mean = df.unix_time.mean()
    df_dt = pd.to_datetime(df_mean)
    return df_dt

def get_std(df_c):
    # Computes standard deviation from cluster data frame df_c
    df = pd.DataFrame()
    df['unix_time'] = df_c.index.astype(np.int64)
    df_std = df.unix_time.std()
    df_dt = pd.to_timedelta(df_std)
    return df_dt

def comp_features(anomalies_clusters):
    '''
    Computes features for cluster anomalies

    Args:
        anomalies_clusters: list of clusters. output from get

    Returns:
        features: list of features for each cluster.
        interval: list of intervals (cluster_first_point, cluster_last_point)
    '''
    features = []
    interval = []

    for cluster in anomalies_clusters:
        mean = get_mean(cluster)
        features.append([len(cluster),  # size
                         ((cluster.timestamp[-1] - cluster.timestamp[0]) / len(cluster)).total_seconds(),  # time density
                         ((mean - cluster.timestamp[0]) / len(cluster)).total_seconds(),  # time diameter
                         (get_std(cluster)).total_seconds(),  # time standard deviation
                         (max(cluster.anoms) - min(cluster.anoms)) / len(cluster),  # value interval
                         (cluster.anoms.mean() - cluster.anoms[0]) / len(cluster),  # value diameter
                         cluster.anoms.std(),  # value standard deviation
                         max(cluster.anoms)  # max value
                         # TODO: confidence interval radius
                         ])
        interval.append((min(cluster.timestamp), max(cluster.timestamp)))

    return features, interval
