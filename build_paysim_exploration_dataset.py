from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd


DATA_CANDIDATES = [
    os.environ.get("PAYSIM_DATA_PATH"),
    "paysim.csv",
    "paysim dataset.csv",
    "paysim_dataset.csv",
]

OUTPUT_PATH = Path(os.environ.get("PAYSIM_EXPLORATION_OUTPUT", "paysim_exploration_dataset.csv"))


def resolve_data_path() -> Path:
    for candidate in DATA_CANDIDATES:
        if candidate and Path(candidate).exists():
            return Path(candidate)
    raise FileNotFoundError(
        "Could not find the PaySim dataset. Set PAYSIM_DATA_PATH or place the CSV in this directory."
    )


def build_exploration_dataset(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.sort_values(["nameOrig", "step"]).reset_index(drop=True).copy()

    enriched["sender_expected_new_balance"] = enriched["oldbalanceOrg"] - enriched["amount"]
    enriched["sender_balance_error"] = enriched["sender_expected_new_balance"] - enriched["newbalanceOrig"]

    enriched["receiver_expected_new_balance"] = enriched["oldbalanceDest"] + enriched["amount"]
    enriched["receiver_balance_error"] = (
        enriched["receiver_expected_new_balance"] - enriched["newbalanceDest"]
    )

    enriched["delta_orig"] = enriched["newbalanceOrig"] - enriched["oldbalanceOrg"]
    enriched["delta_dest"] = enriched["newbalanceDest"] - enriched["oldbalanceDest"]

    enriched["mismatch_orig"] = np.abs(
        (enriched["oldbalanceOrg"] - enriched["amount"]) - enriched["newbalanceOrig"]
    )
    enriched["mismatch_dest"] = np.abs(
        (enriched["oldbalanceDest"] + enriched["amount"]) - enriched["newbalanceDest"]
    )

    enriched["log_amount"] = np.log1p(enriched["amount"])
    enriched["log_mismatch_orig"] = np.log1p(enriched["mismatch_orig"])
    enriched["log_mismatch_dest"] = np.log1p(enriched["mismatch_dest"])

    enriched["time_gap"] = enriched.groupby("nameOrig")["step"].diff().fillna(0)
    enriched["transaction_index"] = enriched.groupby("nameOrig").cumcount()
    enriched["next_type"] = enriched.groupby("nameOrig")["type"].shift(-1)
    enriched["prev_type"] = enriched.groupby("nameOrig")["type"].shift(1)

    enriched["amount_quantile"] = pd.qcut(
        enriched["amount"].rank(method="first"),
        q=20,
        labels=False,
    )

    return enriched


def main() -> None:
    data_path = resolve_data_path()
    df = pd.read_csv(data_path)
    enriched = build_exploration_dataset(df)
    enriched.to_csv(OUTPUT_PATH, index=False)

    print(f"Loaded dataset: {data_path}")
    print(f"Output dataset: {OUTPUT_PATH}")
    print(f"Rows, columns: {enriched.shape}")
    print("Added exploration columns:")
    print(
        ", ".join(
            [
                "sender_expected_new_balance",
                "sender_balance_error",
                "receiver_expected_new_balance",
                "receiver_balance_error",
                "delta_orig",
                "delta_dest",
                "mismatch_orig",
                "mismatch_dest",
                "log_amount",
                "log_mismatch_orig",
                "log_mismatch_dest",
                "time_gap",
                "transaction_index",
                "prev_type",
                "next_type",
                "amount_quantile",
            ]
        )
    )


if __name__ == "__main__":
    main()
