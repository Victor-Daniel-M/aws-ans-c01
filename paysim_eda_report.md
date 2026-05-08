# Exploratory Data Analysis of Fraud Patterns in the PaySim Dataset

## Introduction

This report presents a short exploratory data analysis (EDA) of fraud patterns in the PaySim mobile money transaction dataset. The dataset contains 6,362,620 transactions and a binary fraud label (`isFraud`) that distinguishes legitimate from fraudulent activity. The goal of the analysis is not to build a predictive model, but to identify broad transaction patterns that help explain how fraudulent behaviour differs from ordinary activity.

Fraud analysis in this dataset is challenging because fraudulent events are extremely rare relative to legitimate transactions. This means that simple transaction counts can be misleading unless they are interpreted alongside fraud rates and behavioural structure. For that reason, the analysis emphasizes class imbalance, transaction type, transaction amount, and transaction-type sequences.

## Data and Preparation

The analysis uses the PaySim transaction data as loaded in the notebook `paysim_eda_notebook.ipynb`. Initial inspection showed that the dataset contains 11 variables and 6,362,620 rows. The target variable is highly imbalanced: 6,354,407 transactions are legitimate and only 8,213 are fraudulent, meaning fraud accounts for about 0.1291% of all records.

Basic data preparation focused on ensuring the dataset was suitable for interpretation. Duplicate checking showed that there were no duplicate rows, and missing-value inspection returned zero null values across the dataset. The notebook also includes a balance-validation diagnostic that compares expected sender and receiver balances with observed post-transaction balances. This step was used as a data-quality check rather than as a standalone finding.

The notebook was also used to produce an updated exploration-ready version of the dataset so that the data could be worked with more easily in Tableau. This was necessary because the raw CSV supports basic analysis, but it does not contain several derived variables needed for convenient visual exploration in Tableau, especially for sequence-based analysis such as identifying the `next_type` of transaction for each account. For that reason, notebook-derived fields such as `next_type`, `prev_type`, `transaction_index`, `time_gap`, balance-error measures, mismatch measures, `log_amount`, and `amount_quantile` were created and exported as an enriched dataset. This made it easier to reproduce and extend the notebook findings in Tableau, particularly for transaction-type sequence patterns and related fraud-focused visualizations.

## Exploratory Findings

### 1. Fraud Is Extremely Rare

![Fraud is Extremely Rare](paysim_selected_figures/fraud_is_extremely_rare.png)

Figure 1 shows the most important structural property of the dataset: fraud is exceptionally uncommon. Legitimate transactions dominate the dataset, while fraudulent cases form only a very small fraction of total activity. In practical terms, this means that any interpretation based only on raw transaction counts would understate fraud risk and could obscure meaningful behavioural signals.

This finding matters because it frames every later result. Fraud understanding in PaySim must focus on where risk is concentrated rather than where transaction volume is highest.

### 2. Transaction Volume Does Not Match Fraud Risk by Type

![Transaction Volume Differs by Type](paysim_selected_figures/transaction_volume_differs_by_type.png)

![Fraud Risk Differs by Transaction Type](paysim_selected_figures/fraud_risk_differs_by_transaction_type.png)

The transaction-volume chart shows that `CASH_OUT` and `PAYMENT` dominate the dataset in terms of frequency, followed by `CASH_IN`, `TRANSFER`, and `DEBIT`. However, the fraud-risk chart reveals a different pattern. Fraud risk is concentrated almost entirely in `TRANSFER` transactions (fraud rate about 0.7688%) and `CASH_OUT` transactions (fraud rate about 0.1840%), while `CASH_IN`, `DEBIT`, and `PAYMENT` show effectively zero fraud in this dataset.

This contrast is important because it demonstrates that high activity does not automatically imply high fraud exposure. The result suggests that fraud is associated with particular transaction mechanisms rather than with overall system usage.

### 3. Fraud Risk Increases with Transaction Amount

![Fraud Risk Increases with Transaction Amount](paysim_selected_figures/fraud_risk_increases_with_transaction_amount.png)

Figure 4 groups transactions into twenty amount quantiles and plots the fraud rate within each band. The lower quantiles have very low fraud rates, generally around 0.017% to 0.030%. By contrast, the highest quantiles show a clear increase in fraud concentration, culminating in a fraud rate of about 1.1954% in the top amount band.

The upward trend indicates that larger transfers are disproportionately associated with fraudulent behaviour. This suggests that transaction amount is a useful contextual feature for understanding suspicious activity, even though amount alone cannot explain fraud.

### 4. Fraudulent Activity Shows Transaction-Type Sequence Patterns

![Fraud Has Transaction-Type Sequence Patterns](paysim_selected_figures/fraud_has_transaction_type_sequence_patterns.png)

The final figure examines the transition from one transaction type to the next for accounts involved in fraudulent transactions. Among fraudulent `CASH_OUT` events, the most common next transaction is another `CASH_OUT` transaction, followed by `CASH_IN`. For fraudulent `TRANSFER` events, the next type is most often `CASH_OUT`, with smaller shares transitioning into `PAYMENT` and `CASH_IN`.

These patterns suggest that fraud may follow repeatable behavioural sequences rather than appearing as isolated, context-free events. From an exploratory perspective, this supports the idea that transaction order and behavioural flow may add useful insight when studying fraudulent activity.

## Discussion and Conclusion

Overall, the EDA shows that fraud in the PaySim dataset is rare, unevenly distributed, and behaviourally structured. The first major implication is that raw frequency alone is a poor guide to fraud risk. The second is that fraud is concentrated in specific transaction types, especially `TRANSFER` and `CASH_OUT`, rather than spread evenly across the system. The third is that higher-value transactions and repeated transition patterns appear more closely associated with fraud than ordinary low-value activity.

These findings are useful for understanding the dataset, but they should still be interpreted with care. The notebook is exploratory and descriptive, so it supports pattern discovery rather than causal inference or model-performance claims. Even so, the analysis provides a clear foundation for later fraud-focused work by showing where suspicious behaviour is most concentrated and which transaction characteristics appear most informative.
