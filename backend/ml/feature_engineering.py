"""
Feature Engineering Pipeline for Lavinth Dust Attack Detection
Extracts comprehensive features from transaction data for ML models
"""

import pandas as pd
import numpy as np
from typing import Dict, List
import networkx as nx
from scipy import stats
import logging
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FeatureConfig:
    """Configuration for feature engineering pipeline"""
    # Time windows for temporal features
    time_windows: List[str] = None
    
    # Network analysis parameters
    max_graph_size: int = 10000
    min_connections: int = 2
    
    # Sequence analysis parameters
    sequence_length: int = 10
    min_sequence_length: int = 3
    
    # Statistical parameters
    outlier_threshold: float = 3.0
    min_samples: int = 5
    
    def __post_init__(self):
        if self.time_windows is None:
            self.time_windows = ['1h', '6h', '24h', '7d', '30d']

class FeatureEngineer:
    """
    Comprehensive feature engineering for dust attack detection
    """
    
    def __init__(self, config: FeatureConfig = None):
        self.config = config or FeatureConfig()
        self.feature_cache = {}
        
    def extract_all_features(self, 
                           transactions_df: pd.DataFrame,
                           addresses_df: pd.DataFrame = None) -> pd.DataFrame:
        """
        Extract all features for ML model training/inference
        
        Args:
            transactions_df: DataFrame with transaction data
            addresses_df: Optional DataFrame with address metadata
            
        Returns:
            DataFrame with engineered features
        """
        logger.info("Starting comprehensive feature extraction...")
        
        # Ensure required columns exist
        self._validate_input_data(transactions_df)
        
        # Initialize feature DataFrame
        features_df = transactions_df.copy()
        
        # 1. Basic transaction features
        logger.info("Extracting basic transaction features...")
        basic_features = self._extract_basic_features(transactions_df)
        features_df = pd.concat([features_df, basic_features], axis=1)
        
        # 2. Temporal features
        logger.info("Extracting temporal features...")
        temporal_features = self._extract_temporal_features(transactions_df)
        features_df = pd.concat([features_df, temporal_features], axis=1)
        
        # 3. Address behavior features
        logger.info("Extracting address behavior features...")
        address_features = self._extract_address_features(transactions_df)
        features_df = pd.concat([features_df, address_features], axis=1)
        
        # 4. Network graph features
        logger.info("Extracting network graph features...")
        network_features = self._extract_network_features(transactions_df)
        features_df = pd.concat([features_df, network_features], axis=1)
        
        # 5. Sequential pattern features
        logger.info("Extracting sequential pattern features...")
        sequence_features = self._extract_sequence_features(transactions_df)
        features_df = pd.concat([features_df, sequence_features], axis=1)
        
        # 6. Statistical aggregation features
        logger.info("Extracting statistical aggregation features...")
        stats_features = self._extract_statistical_features(transactions_df)
        features_df = pd.concat([features_df, stats_features], axis=1)
        
        # 7. Risk and anomaly features
        logger.info("Extracting risk and anomaly features...")
        risk_features = self._extract_risk_features(transactions_df)
        features_df = pd.concat([features_df, risk_features], axis=1)
        
        logger.info(f"Feature extraction complete. Shape: {features_df.shape}")
        return features_df
    
    def _validate_input_data(self, df: pd.DataFrame):
        """Validate input data has required columns"""
        required_columns = [
            'signature', 'timestamp', 'sender', 'recipient', 
            'amount', 'fee', 'success'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
            
        # Convert timestamp to datetime if needed
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    def _extract_basic_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract basic transaction-level features"""
        features = pd.DataFrame(index=df.index)
        
        # Amount-based features
        features['amount_log'] = np.log1p(df['amount'])
        features['amount_normalized'] = df['amount'] / df['amount'].median()
        features['is_dust_amount'] = (df['amount'] < 0.001).astype(int)
        features['is_micro_amount'] = (df['amount'] < 0.0001).astype(int)
        
        # Fee-based features
        features['fee_log'] = np.log1p(df['fee'])
        features['fee_ratio'] = df['fee'] / (df['amount'] + 1e-10)
        features['fee_normalized'] = df['fee'] / df['fee'].median()
        
        # Success rate
        features['is_successful'] = df['success'].astype(int)
        
        # Memo features (if available)
        if 'memo_content' in df.columns:
            features['has_memo'] = df['memo_content'].notna().astype(int)
            features['memo_length'] = df['memo_content'].fillna('').str.len()
        else:
            features['has_memo'] = 0
            features['memo_length'] = 0
        
        # Token type features (if available)
        if 'token_type' in df.columns:
            features['is_sol_transfer'] = (df['token_type'] == 'SOL').astype(int)
            features['is_token_transfer'] = (df['token_type'] != 'SOL').astype(int)
        else:
            features['is_sol_transfer'] = 1
            features['is_token_transfer'] = 0
            
        return features
    
    def _extract_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract time-based features"""
        features = pd.DataFrame(index=df.index)
        
        # Basic time features
        features['hour'] = df['timestamp'].dt.hour
        features['day_of_week'] = df['timestamp'].dt.dayofweek
        features['is_weekend'] = (df['timestamp'].dt.dayofweek >= 5).astype(int)
        features['is_night'] = ((df['timestamp'].dt.hour >= 22) | 
                               (df['timestamp'].dt.hour <= 6)).astype(int)
        
        # Cyclical encoding for time features
        features['hour_sin'] = np.sin(2 * np.pi * features['hour'] / 24)
        features['hour_cos'] = np.cos(2 * np.pi * features['hour'] / 24)
        features['day_sin'] = np.sin(2 * np.pi * features['day_of_week'] / 7)
        features['day_cos'] = np.cos(2 * np.pi * features['day_of_week'] / 7)
        
        # Time since epoch (for trend analysis)
        features['timestamp_unix'] = df['timestamp'].astype(np.int64) // 10**9
        
        # Time gaps between transactions (per address)
        for address_col in ['sender', 'recipient']:
            if address_col in df.columns:
                df_sorted = df.sort_values(['timestamp'])
                time_gaps = df_sorted.groupby(address_col)['timestamp'].diff()
                time_gaps_seconds = time_gaps.dt.total_seconds().fillna(0)
                features[f'{address_col}_time_gap'] = time_gaps_seconds
                features[f'{address_col}_time_gap_log'] = np.log1p(time_gaps_seconds)
        
        return features
    
    def _extract_address_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract address behavior features"""
        features = pd.DataFrame(index=df.index)
        
        # For each time window, calculate address statistics
        for window in self.config.time_windows:
            window_features = self._calculate_window_features(df, window)
            features = pd.concat([features, window_features], axis=1)
        
        return features
    
    def _calculate_window_features(self, df: pd.DataFrame, window: str) -> pd.DataFrame:
        """Calculate features for a specific time window"""
        features = pd.DataFrame(index=df.index)
        
        # Simplified approach: calculate basic statistics per address
        for address_col in ['sender', 'recipient']:
            if address_col not in df.columns:
                continue
                
            prefix = f"{address_col}_{window}"
            
            # Calculate basic address statistics
            address_stats = df.groupby(address_col).agg({
                'amount': ['count', 'mean', 'std', 'min', 'max'],
                'success': 'mean',
                'fee': 'mean'
            }).fillna(0)
            
            # Flatten column names
            address_stats.columns = ['_'.join(col).strip() for col in address_stats.columns]
            
            # Map back to original dataframe
            features[f'{prefix}_tx_count'] = df[address_col].map(
                address_stats['amount_count']
            ).fillna(0)
            
            features[f'{prefix}_amount_mean'] = df[address_col].map(
                address_stats['amount_mean']
            ).fillna(0)
            
            features[f'{prefix}_amount_std'] = df[address_col].map(
                address_stats['amount_std']
            ).fillna(0)
            
            features[f'{prefix}_success_rate'] = df[address_col].map(
                address_stats['success_mean']
            ).fillna(0)
            
            # Unique counterparts
            if address_col == 'sender':
                counterpart_col = 'recipient'
            else:
                counterpart_col = 'sender'
                
            if counterpart_col in df.columns:
                unique_counterparts = df.groupby(address_col)[counterpart_col].nunique()
                features[f'{prefix}_unique_counterparts'] = df[address_col].map(
                    unique_counterparts
                ).fillna(0)
        
        return features.fillna(0)
    
    def _extract_network_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract network graph features"""
        features = pd.DataFrame(index=df.index)
        
        try:
            # Build transaction graph
            G = self._build_transaction_graph(df)
            
            # Calculate centrality measures
            centrality_features = self._calculate_centrality_features(G, df)
            features = pd.concat([features, centrality_features], axis=1)
            
            # Calculate community features
            community_features = self._calculate_community_features(G, df)
            features = pd.concat([features, community_features], axis=1)
            
        except Exception as e:
            logger.warning(f"Network feature extraction failed: {e}")
            # Fill with zeros if network analysis fails
            network_cols = [
                'sender_degree_centrality', 'recipient_degree_centrality',
                'sender_betweenness_centrality', 'recipient_betweenness_centrality',
                'sender_pagerank', 'recipient_pagerank',
                'sender_community_id', 'recipient_community_id'
            ]
            for col in network_cols:
                features[col] = 0
        
        return features
    
    def _build_transaction_graph(self, df: pd.DataFrame) -> nx.DiGraph:
        """Build directed graph from transaction data"""
        G = nx.DiGraph()
        
        # Limit graph size for performance
        if len(df) > self.config.max_graph_size:
            df_sample = df.sample(n=self.config.max_graph_size)
        else:
            df_sample = df
        
        # Add edges with transaction data
        for _, row in df_sample.iterrows():
            if pd.notna(row['sender']) and pd.notna(row['recipient']):
                if G.has_edge(row['sender'], row['recipient']):
                    G[row['sender']][row['recipient']]['weight'] += row['amount']
                    G[row['sender']][row['recipient']]['count'] += 1
                else:
                    G.add_edge(row['sender'], row['recipient'], 
                             weight=row['amount'], count=1)
        
        return G
    
    def _calculate_centrality_features(self, G: nx.DiGraph, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate centrality measures for addresses"""
        features = pd.DataFrame(index=df.index)
        
        # Calculate centrality measures
        degree_centrality = nx.degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G, k=min(100, len(G)))
        pagerank = nx.pagerank(G, max_iter=50)
        
        # Map centrality scores to transactions
        for address_col in ['sender', 'recipient']:
            if address_col in df.columns:
                features[f'{address_col}_degree_centrality'] = df[address_col].map(
                    degree_centrality
                ).fillna(0)
                features[f'{address_col}_betweenness_centrality'] = df[address_col].map(
                    betweenness_centrality
                ).fillna(0)
                features[f'{address_col}_pagerank'] = df[address_col].map(
                    pagerank
                ).fillna(0)
        
        return features
    
    def _calculate_community_features(self, G: nx.DiGraph, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate community detection features"""
        features = pd.DataFrame(index=df.index)
        
        try:
            # Convert to undirected for community detection
            G_undirected = G.to_undirected()
            
            # Simple community detection (for large graphs, use more sophisticated methods)
            if len(G_undirected) > 1000:
                # Use simple connected components for large graphs
                communities = {node: i for i, component in 
                             enumerate(nx.connected_components(G_undirected))
                             for node in component}
            else:
                # Use more sophisticated community detection for smaller graphs
                import networkx.algorithms.community as nx_comm
                communities_list = list(nx_comm.greedy_modularity_communities(G_undirected))
                communities = {node: i for i, community in enumerate(communities_list)
                             for node in community}
            
            # Map community IDs to transactions
            for address_col in ['sender', 'recipient']:
                if address_col in df.columns:
                    features[f'{address_col}_community_id'] = df[address_col].map(
                        communities
                    ).fillna(-1)
        
        except Exception as e:
            logger.warning(f"Community detection failed: {e}")
            features['sender_community_id'] = -1
            features['recipient_community_id'] = -1
        
        return features
    
    def _extract_sequence_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract sequential pattern features"""
        features = pd.DataFrame(index=df.index)
        
        # Sort by timestamp for sequence analysis
        df_sorted = df.sort_values('timestamp')
        
        for address_col in ['sender', 'recipient']:
            if address_col not in df.columns:
                continue
                
            # Calculate sequence-based features
            sequence_features = self._calculate_sequence_features(df_sorted, address_col)
            features = pd.concat([features, sequence_features], axis=1)
        
        return features
    
    def _calculate_sequence_features(self, df: pd.DataFrame, address_col: str) -> pd.DataFrame:
        """Calculate sequence-based features for an address column"""
        features = pd.DataFrame(index=df.index)
        prefix = f"{address_col}_seq"
        
        # Group by address and calculate sequence features
        grouped = df.groupby(address_col)
        
        # Transaction regularity (coefficient of variation of time gaps)
        regularity_scores = grouped.apply(
            lambda x: self._calculate_regularity_score(x['timestamp'])
        )
        features[f'{prefix}_regularity'] = df[address_col].map(regularity_scores).fillna(0)
        
        # Burst detection (transactions in quick succession)
        burst_scores = grouped.apply(
            lambda x: self._calculate_burst_score(x['timestamp'])
        )
        features[f'{prefix}_burst_score'] = df[address_col].map(burst_scores).fillna(0)
        
        # Amount pattern consistency
        amount_consistency = grouped.apply(
            lambda x: self._calculate_amount_consistency(x['amount'])
        )
        features[f'{prefix}_amount_consistency'] = df[address_col].map(
            amount_consistency
        ).fillna(0)
        
        return features
    
    def _calculate_regularity_score(self, timestamps: pd.Series) -> float:
        """Calculate regularity score from timestamps"""
        if len(timestamps) < 3:
            return 0
        
        time_gaps = timestamps.diff().dt.total_seconds().dropna()
        if len(time_gaps) == 0 or time_gaps.std() == 0:
            return 1.0  # Perfectly regular
        
        cv = time_gaps.std() / time_gaps.mean()
        return max(0, 1 - cv)  # Higher score = more regular
    
    def _calculate_burst_score(self, timestamps: pd.Series) -> float:
        """Calculate burst score from timestamps"""
        if len(timestamps) < 2:
            return 0
        
        time_gaps = timestamps.diff().dt.total_seconds().dropna()
        burst_threshold = 300  # 5 minutes
        burst_count = (time_gaps < burst_threshold).sum()
        
        return burst_count / len(time_gaps) if len(time_gaps) > 0 else 0
    
    def _calculate_amount_consistency(self, amounts: pd.Series) -> float:
        """Calculate amount consistency score"""
        if len(amounts) < 2:
            return 0
        
        cv = amounts.std() / amounts.mean() if amounts.mean() > 0 else 0
        return max(0, 1 - cv)  # Higher score = more consistent
    
    def _extract_statistical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract statistical aggregation features"""
        features = pd.DataFrame(index=df.index)
        
        # Global statistics (percentile ranks)
        features['amount_percentile'] = df['amount'].rank(pct=True)
        features['fee_percentile'] = df['fee'].rank(pct=True)
        
        # Z-scores for anomaly detection
        features['amount_zscore'] = stats.zscore(df['amount'])
        features['fee_zscore'] = stats.zscore(df['fee'])
        
        # Rolling statistics
        for window in [10, 50, 100]:
            if len(df) >= window:
                rolling_mean = df['amount'].rolling(window=window).mean()
                rolling_std = df['amount'].rolling(window=window).std()
                
                features[f'amount_rolling_mean_{window}'] = rolling_mean
                features[f'amount_rolling_std_{window}'] = rolling_std
                features[f'amount_rolling_zscore_{window}'] = (
                    (df['amount'] - rolling_mean) / (rolling_std + 1e-10)
                )
        
        return features.fillna(0)
    
    def _extract_risk_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract risk and anomaly features"""
        features = pd.DataFrame(index=df.index)
        
        # Existing risk scores (if available)
        if 'risk_score' in df.columns:
            features['existing_risk_score'] = df['risk_score'].fillna(0)
        
        # Dust/poisoning flags (if available) - only add if not already in features
        if 'is_potential_dust' in df.columns and 'is_potential_dust' not in features.columns:
            features['is_potential_dust_flag'] = df['is_potential_dust'].astype(int)
        
        if 'is_potential_poisoning' in df.columns and 'is_potential_poisoning' not in features.columns:
            features['is_potential_poisoning_flag'] = df['is_potential_poisoning'].astype(int)
        
        # Anomaly scores based on amount distribution
        features['amount_anomaly_score'] = self._calculate_anomaly_scores(df['amount'])
        features['fee_anomaly_score'] = self._calculate_anomaly_scores(df['fee'])
        
        return features
    
    def _calculate_anomaly_scores(self, values: pd.Series) -> pd.Series:
        """Calculate anomaly scores using isolation forest approach"""
        from sklearn.ensemble import IsolationForest
        
        if len(values) < 10:
            return pd.Series(0, index=values.index)
        
        # Remove NaN values and zeros for better anomaly detection
        clean_values = values.dropna()
        clean_values = clean_values[clean_values > 0]
        
        if len(clean_values) < 10:
            return pd.Series(0, index=values.index)
        
        # Reshape for sklearn
        X = clean_values.values.reshape(-1, 1)
        
        # Fit isolation forest
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        iso_forest.fit(X)
        
        # Get anomaly scores for all values
        X_all = values.fillna(0).values.reshape(-1, 1)
        anomaly_scores = iso_forest.decision_function(X_all)
        
        # Normalize to 0-1 range
        anomaly_scores = (anomaly_scores - anomaly_scores.min()) / (
            anomaly_scores.max() - anomaly_scores.min() + 1e-10
        )
        
        return pd.Series(anomaly_scores, index=values.index)
    
    def get_feature_importance_groups(self) -> Dict[str, List[str]]:
        """Return feature groups for interpretability"""
        return {
            'basic_transaction': [
                'amount_log', 'amount_normalized', 'is_dust_amount', 
                'fee_log', 'fee_ratio', 'has_memo'
            ],
            'temporal': [
                'hour', 'day_of_week', 'is_weekend', 'is_night',
                'hour_sin', 'hour_cos', 'day_sin', 'day_cos'
            ],
            'address_behavior': [
                col for col in ['sender_1h_tx_count', 'recipient_1h_tx_count',
                               'sender_24h_unique_counterparts', 'recipient_24h_unique_counterparts']
            ],
            'network': [
                'sender_degree_centrality', 'recipient_degree_centrality',
                'sender_pagerank', 'recipient_pagerank'
            ],
            'sequential': [
                'sender_seq_regularity', 'recipient_seq_regularity',
                'sender_seq_burst_score', 'recipient_seq_burst_score'
            ],
            'risk_anomaly': [
                'amount_anomaly_score', 'fee_anomaly_score',
                'existing_risk_score', 'is_potential_dust'
            ]
        }

def main():
    """Example usage of the feature engineering pipeline"""
    # This would typically be called from the main training pipeline
    config = FeatureConfig()
    _ = FeatureEngineer(config)  # Initialize to validate configuration
    
    # Example: Load data and extract features
    # df = load_transaction_data()  # Your data loading function
    # features = engineer.extract_all_features(df)
    # print(f"Extracted {features.shape[1]} features from {features.shape[0]} transactions")
    
    print("Feature engineering pipeline ready!")

if __name__ == "__main__":
    main()
