"""
Data Loading and Preprocessing for Lavinth ML Pipeline
Handles database connections and data preparation for training
"""

import pandas as pd
from typing import Dict, List, Any
import logging
from datetime import datetime
import asyncio
import os
import asyncpg

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConnection:
    """Direct database connection for ML training"""
    
    def __init__(self):
        self.pool = None
        
    async def connect(self):
        """Connect to database using environment variables"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL environment variable not set")
            
            self.pool = await asyncpg.create_pool(database_url)
            logger.info("✅ Database connection established")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    async def execute_query(self, query: str, params=None):
        """Execute a database query"""
        if not self.pool:
            await self.connect()
        
        try:
            async with self.pool.acquire() as conn:
                if params:
                    result = await conn.fetch(query, *params)
                else:
                    result = await conn.fetch(query)
                return [dict(row) for row in result]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return []
    
    async def close(self):
        """Close database connection"""
        if self.pool:
            await self.pool.close()

class DataLoader:
    """
    Data loader for ML training pipeline
    Handles database connections and data preprocessing
    """
    
    def __init__(self, db_connection: DatabaseConnection = None):
        self.db = db_connection or DatabaseConnection()
        
    async def load_training_data(self, 
                               days_back: int = 30,
                               min_samples: int = 1000,
                               balance_ratio: float = 0.3) -> pd.DataFrame:
        """
        Load training data from database
        
        Args:
            days_back: Number of days to look back for data
            min_samples: Minimum number of samples required
            balance_ratio: Ratio of positive to negative samples
            
        Returns:
            DataFrame with transaction data ready for ML training
        """
        logger.info(f"Loading training data for last {days_back} days...")
        
        # Load transaction data
        transactions_df = await self._load_transactions(days_back)
        
        if len(transactions_df) < min_samples:
            logger.warning(f"Only {len(transactions_df)} samples found, minimum is {min_samples}")
        
        # Load attacker and victim data for additional features
        attackers_df = await self._load_attackers()
        victims_df = await self._load_victims()
        
        # Merge additional data
        enriched_df = self._enrich_transaction_data(transactions_df, attackers_df, victims_df)
        
        # Balance the dataset
        balanced_df = self._balance_dataset(enriched_df, balance_ratio)
        
        logger.info(f"Loaded {len(balanced_df)} training samples")
        return balanced_df
    
    async def _load_transactions(self, days_back: int) -> pd.DataFrame:
        """Load transaction data from database"""
        query = """
        SELECT 
            signature,
            timestamp,
            slot,
            success,
            sender,
            recipient,
            amount,
            fee,
            token_type,
            token_address,
            is_potential_dust,
            is_potential_poisoning,
            risk_score,
            memo_content
        FROM dust_transactions 
        WHERE timestamp > NOW() - INTERVAL '%s days'
        ORDER BY timestamp DESC
        """
        
        try:
            result = await self.db.execute_query(query, (days_back,))
            df = pd.DataFrame(result)
            
            # Convert timestamp to datetime
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                
                # Fill missing values
                df['risk_score'] = df['risk_score'].fillna(0.0)
                df['is_potential_dust'] = df['is_potential_dust'].fillna(False)
                df['is_potential_poisoning'] = df['is_potential_poisoning'].fillna(False)
                df['memo_content'] = df['memo_content'].fillna('')
                df['token_type'] = df['token_type'].fillna('SOL')
                
            logger.info(f"Loaded {len(df)} transactions from database")
            return df
            
        except Exception as e:
            logger.error(f"Error loading transactions: {e}")
            return pd.DataFrame()
    
    async def _load_attackers(self) -> pd.DataFrame:
        """Load attacker profiles from database"""
        query = """
        SELECT 
            address,
            small_transfers_count,
            unique_victims_count,
            risk_score,
            wallet_age_days,
            total_transaction_volume,
            temporal_pattern,
            network_pattern,
            behavioral_indicators,
            ml_features,
            ml_prediction,
            last_updated
        FROM dusting_attackers
        WHERE last_updated > NOW() - INTERVAL '30 days'
        """
        
        try:
            result = await self.db.execute_query(query)
            df = pd.DataFrame(result)
            
            if not df.empty:
                # Parse JSON fields
                json_columns = ['temporal_pattern', 'network_pattern', 'behavioral_indicators', 
                               'ml_features', 'ml_prediction']
                for col in json_columns:
                    if col in df.columns:
                        df[col] = df[col].apply(lambda x: x if isinstance(x, dict) else {})
            
            logger.info(f"Loaded {len(df)} attacker profiles")
            return df
            
        except Exception as e:
            logger.error(f"Error loading attackers: {e}")
            return pd.DataFrame()
    
    async def _load_victims(self) -> pd.DataFrame:
        """Load victim profiles from database"""
        query = """
        SELECT 
            address,
            dust_transactions_count,
            unique_attackers_count,
            risk_score,
            wallet_age_days,
            wallet_value_estimate,
            vulnerability_assessment,
            ml_features,
            ml_prediction,
            last_updated
        FROM dusting_victims
        WHERE last_updated > NOW() - INTERVAL '30 days'
        """
        
        try:
            result = await self.db.execute_query(query)
            df = pd.DataFrame(result)
            
            if not df.empty:
                # Parse JSON fields
                json_columns = ['vulnerability_assessment', 'ml_features', 'ml_prediction']
                for col in json_columns:
                    if col in df.columns:
                        df[col] = df[col].apply(lambda x: x if isinstance(x, dict) else {})
            
            logger.info(f"Loaded {len(df)} victim profiles")
            return df
            
        except Exception as e:
            logger.error(f"Error loading victims: {e}")
            return pd.DataFrame()
    
    def _enrich_transaction_data(self, 
                               transactions_df: pd.DataFrame,
                               attackers_df: pd.DataFrame,
                               victims_df: pd.DataFrame) -> pd.DataFrame:
        """Enrich transaction data with attacker and victim profiles"""
        
        if transactions_df.empty:
            return transactions_df
        
        enriched_df = transactions_df.copy()
        
        # Merge attacker data
        if not attackers_df.empty:
            attacker_features = attackers_df.set_index('address')
            
            # Add attacker features to sender
            for col in ['small_transfers_count', 'unique_victims_count', 'wallet_age_days']:
                if col in attacker_features.columns:
                    enriched_df[f'sender_{col}'] = enriched_df['sender'].map(
                        attacker_features[col]
                    ).fillna(0)
            
            # Add attacker risk score
            enriched_df['sender_attacker_risk'] = enriched_df['sender'].map(
                attacker_features['risk_score']
            ).fillna(0)
        
        # Merge victim data
        if not victims_df.empty:
            victim_features = victims_df.set_index('address')
            
            # Add victim features to recipient
            for col in ['dust_transactions_count', 'unique_attackers_count', 'wallet_value_estimate']:
                if col in victim_features.columns:
                    enriched_df[f'recipient_{col}'] = enriched_df['recipient'].map(
                        victim_features[col]
                    ).fillna(0)
            
            # Add victim risk score
            enriched_df['recipient_victim_risk'] = enriched_df['recipient'].map(
                victim_features['risk_score']
            ).fillna(0)
        
        logger.info("Transaction data enriched with attacker and victim profiles")
        return enriched_df
    
    def _balance_dataset(self, df: pd.DataFrame, balance_ratio: float) -> pd.DataFrame:
        """Balance the dataset for training"""
        if df.empty:
            return df
        
        # Create labels from existing detection flags
        positive_mask = (
            df['is_potential_dust'] | 
            df['is_potential_poisoning'] |
            (df['risk_score'] > 0.7)
        )
        
        positive_samples = df[positive_mask]
        negative_samples = df[~positive_mask]
        
        logger.info(f"Original dataset: {len(positive_samples)} positive, {len(negative_samples)} negative")
        
        # Calculate target sizes
        n_positive = len(positive_samples)
        n_negative_target = int(n_positive / balance_ratio) if balance_ratio > 0 else len(negative_samples)
        
        # Sample negative examples if we have too many
        if len(negative_samples) > n_negative_target:
            negative_samples = negative_samples.sample(n=n_negative_target, random_state=42)
        
        # Combine balanced dataset
        balanced_df = pd.concat([positive_samples, negative_samples], ignore_index=True)
        
        # Shuffle the dataset
        balanced_df = balanced_df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        logger.info(f"Balanced dataset: {len(positive_samples)} positive, {len(negative_samples)} negative")
        return balanced_df
    
    async def load_inference_data(self, signatures: List[str]) -> pd.DataFrame:
        """Load specific transactions for inference"""
        if not signatures:
            return pd.DataFrame()
        
        # Create placeholders for the query
        placeholders = ','.join(['$' + str(i+1) for i in range(len(signatures))])
        
        query = f"""
        SELECT 
            signature,
            timestamp,
            slot,
            success,
            sender,
            recipient,
            amount,
            fee,
            token_type,
            token_address,
            memo_content
        FROM dust_transactions 
        WHERE signature IN ({placeholders})
        ORDER BY timestamp DESC
        """
        
        try:
            result = await self.db.execute_query(query, signatures)
            df = pd.DataFrame(result)
            
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df['memo_content'] = df['memo_content'].fillna('')
                df['token_type'] = df['token_type'].fillna('SOL')
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading inference data: {e}")
            return pd.DataFrame()
    
    def save_training_data(self, df: pd.DataFrame, filepath: str):
        """Save training data to file for reproducibility"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            # Save as parquet for efficiency
            df.to_parquet(filepath, index=False)
            logger.info(f"Training data saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving training data: {e}")
    
    def load_training_data_from_file(self, filepath: str) -> pd.DataFrame:
        """Load training data from file"""
        try:
            df = pd.read_parquet(filepath)
            logger.info(f"Training data loaded from {filepath}")
            return df
            
        except Exception as e:
            logger.error(f"Error loading training data from file: {e}")
            return pd.DataFrame()
    
    async def get_data_statistics(self) -> Dict[str, Any]:
        """Get statistics about available training data"""
        stats = {}
        
        try:
            # Transaction statistics
            tx_query = """
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN is_potential_dust = true THEN 1 END) as dust_transactions,
                COUNT(CASE WHEN is_potential_poisoning = true THEN 1 END) as poisoning_transactions,
                MIN(timestamp) as earliest_transaction,
                MAX(timestamp) as latest_transaction,
                AVG(amount) as avg_amount,
                COUNT(DISTINCT sender) as unique_senders,
                COUNT(DISTINCT recipient) as unique_recipients
            FROM dust_transactions
            WHERE timestamp > NOW() - INTERVAL '30 days'
            """
            
            tx_result = await self.db.execute_query(tx_query)
            stats['transactions'] = tx_result[0] if tx_result else {}
            
            # Attacker statistics
            attacker_query = """
            SELECT 
                COUNT(*) as total_attackers,
                AVG(risk_score) as avg_risk_score,
                AVG(small_transfers_count) as avg_transfers,
                AVG(unique_victims_count) as avg_victims
            FROM dusting_attackers
            """
            
            attacker_result = await self.db.execute_query(attacker_query)
            stats['attackers'] = attacker_result[0] if attacker_result else {}
            
            # Victim statistics
            victim_query = """
            SELECT 
                COUNT(*) as total_victims,
                AVG(risk_score) as avg_risk_score,
                AVG(dust_transactions_count) as avg_dust_txs,
                AVG(unique_attackers_count) as avg_attackers
            FROM dusting_victims
            """
            
            victim_result = await self.db.execute_query(victim_query)
            stats['victims'] = victim_result[0] if victim_result else {}
            
            logger.info("Data statistics retrieved successfully")
            
        except Exception as e:
            logger.error(f"Error getting data statistics: {e}")
            stats = {'error': str(e)}
        
        return stats

class DataValidator:
    """Validates data quality for ML training"""
    
    @staticmethod
    def validate_training_data(df: pd.DataFrame) -> Dict[str, Any]:
        """Validate training data quality"""
        validation_results = {
            'is_valid': True,
            'warnings': [],
            'errors': [],
            'statistics': {}
        }
        
        if df.empty:
            validation_results['is_valid'] = False
            validation_results['errors'].append("Dataset is empty")
            return validation_results
        
        # Check required columns
        required_columns = ['signature', 'timestamp', 'sender', 'recipient', 'amount', 'fee']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            validation_results['is_valid'] = False
            validation_results['errors'].append(f"Missing required columns: {missing_columns}")
        
        # Check data types
        if 'timestamp' in df.columns and not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            validation_results['warnings'].append("Timestamp column is not datetime type")
        
        # Check for missing values
        missing_percentages = (df.isnull().sum() / len(df)) * 100
        high_missing = missing_percentages[missing_percentages > 50]
        
        if not high_missing.empty:
            validation_results['warnings'].append(f"High missing values in columns: {high_missing.to_dict()}")
        
        # Check label distribution
        if 'is_potential_dust' in df.columns:
            dust_ratio = df['is_potential_dust'].sum() / len(df)
            validation_results['statistics']['dust_ratio'] = dust_ratio
            
            if dust_ratio < 0.01:
                validation_results['warnings'].append("Very low positive label ratio (< 1%)")
            elif dust_ratio > 0.9:
                validation_results['warnings'].append("Very high positive label ratio (> 90%)")
        
        # Check data freshness
        if 'timestamp' in df.columns:
            latest_timestamp = df['timestamp'].max()
            days_old = (datetime.now() - latest_timestamp).days
            validation_results['statistics']['days_old'] = days_old
            
            if days_old > 7:
                validation_results['warnings'].append(f"Data is {days_old} days old")
        
        # Check for duplicates
        duplicate_count = df.duplicated(subset=['signature']).sum()
        if duplicate_count > 0:
            validation_results['warnings'].append(f"Found {duplicate_count} duplicate transactions")
        
        # Basic statistics
        validation_results['statistics'].update({
            'total_samples': len(df),
            'unique_senders': df['sender'].nunique() if 'sender' in df.columns else 0,
            'unique_recipients': df['recipient'].nunique() if 'recipient' in df.columns else 0,
            'date_range': {
                'start': df['timestamp'].min().isoformat() if 'timestamp' in df.columns else None,
                'end': df['timestamp'].max().isoformat() if 'timestamp' in df.columns else None
            }
        })
        
        return validation_results

async def main():
    """Example usage of data loader"""
    loader = DataLoader()
    
    # Get data statistics
    stats = await loader.get_data_statistics()
    print("Data Statistics:")
    for category, data in stats.items():
        print(f"  {category}: {data}")
    
    # Load training data
    training_data = await loader.load_training_data(days_back=7, min_samples=100)
    print(f"\nLoaded {len(training_data)} training samples")
    
    # Validate data
    validator = DataValidator()
    validation_results = validator.validate_training_data(training_data)
    print(f"\nData validation: {'PASSED' if validation_results['is_valid'] else 'FAILED'}")
    
    if validation_results['warnings']:
        print("Warnings:")
        for warning in validation_results['warnings']:
            print(f"  - {warning}")

if __name__ == "__main__":
    asyncio.run(main())
