-- D1 Schema for Analyst Ledger
-- Drop existing tables and views to ensure a clean slate
DROP VIEW IF EXISTS monthly_rollups;
DROP VIEW IF EXISTS daily_running_balance;
DROP TABLE IF EXISTS insights;
DROP TABLE IF EXISTS holdings;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS statements;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;
-- users: Stores user credentials and information.
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- accounts: Stores information about each financial account.
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    institution TEXT,
    type TEXT NOT NULL, -- e.g., 'checking', 'savings', 'credit_card', 'investment'
    mask TEXT, -- Last 4 digits
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- statements: Represents a single financial statement document.
CREATE TABLE statements (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    statement_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    opening_balance REAL,
    closing_balance REAL,
    source_file_key TEXT NOT NULL, -- R2 object key
    file_hash TEXT NOT NULL UNIQUE, -- To prevent duplicate processing
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- transactions: Stores individual transactions from statements.
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    statement_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL, -- Positive for credits, negative for debits
    currency TEXT DEFAULT 'USD',
    category TEXT, -- AI-assigned category
    is_recurring BOOLEAN DEFAULT 0,
    hash_v1 TEXT NOT NULL UNIQUE, -- For deduplication
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (statement_id) REFERENCES statements(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- holdings: For investment accounts, stores asset holdings at a point in time.
CREATE TABLE holdings (
    id TEXT PRIMARY KEY,
    statement_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g., 'Apple Inc.'
    ticker TEXT, -- e.g., 'AAPL'
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    value REAL NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (statement_id) REFERENCES statements(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- insights: Stores AI-generated insights, anomalies, and suggestions.
CREATE TABLE insights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'anomaly', 'observation', 'suggestion'
    content TEXT NOT NULL,
    related_transaction_id TEXT,
    date DATE NOT NULL,
    is_dismissed BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (related_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- SQL Views for efficient querying
-- daily_running_balance: Calculates the running balance for a specific account per day.
CREATE VIEW daily_running_balance AS
SELECT
    date,
    account_id,
    user_id,
    SUM(amount) OVER (PARTITION BY account_id ORDER BY date) as running_balance
FROM transactions
GROUP BY date, account_id, user_id, amount
ORDER BY date;
-- monthly_rollups: Aggregates income, expenses, and net savings per account per month.
CREATE VIEW monthly_rollups AS
SELECT
    strftime('%Y-%m', date) as month,
    account_id,
    user_id,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as total_expenses,
    SUM(amount) as net_savings
FROM transactions
GROUP BY month, account_id, user_id
ORDER BY month, account_id;
-- Indexes for performance
CREATE INDEX idx_transactions_user_account_date ON transactions(user_id, account_id, date);
CREATE INDEX idx_statements_user_account_date ON statements(user_id, account_id, statement_date);
CREATE INDEX idx_users_email ON users(email);