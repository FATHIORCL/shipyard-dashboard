import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

REQUIRED_FIELDS = ("id", "customer", "product", "date", "amount", "status")
VALID_STATUSES = {"completed", "processing", "pending", "cancelled"}


def load_json_data(file_path: Path) -> List[Dict[str, Any]]:
    """Read and parse JSON list of records from disk."""
    if not file_path.exists():
        raise FileNotFoundError(f"Input JSON file not found: {file_path}")

    with file_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("Expected top-level JSON structure to be a list of objects.")

    return data


def validate_record(record: Dict[str, Any], index: int) -> Tuple[bool, List[str]]:
    """Validate required fields and value constraints on a single record."""
    errors: List[str] = []

    if not isinstance(record, dict):
        return False, [f"Record #{index} is not a JSON object."]

    # 1. Check required fields exist and are non-empty
    for field in REQUIRED_FIELDS:
        if field not in record or record[field] is None:
            errors.append(f"Missing required field '{field}'")
        elif isinstance(record[field], str) and not record[field].strip():
            errors.append(f"Field '{field}' cannot be empty")

    # 2. Validate numeric 'amount'
    if "amount" in record and record["amount"] is not None:
        try:
            amount_val = float(record["amount"])
            if amount_val <= 0:
                errors.append(f"Field 'amount' must be greater than 0 (got {amount_val})")
        except (ValueError, TypeError):
            errors.append(f"Field 'amount' must be a valid number (got {record['amount']!r})")

    # 3. Validate 'status' value
    status_val = str(record.get("status", "")).strip().lower()
    if status_val and status_val not in VALID_STATUSES:
        errors.append(f"Invalid status '{status_val}'. Expected one of {sorted(VALID_STATUSES)}")

    return len(errors) == 0, errors


def build_status_summary(valid_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Aggregate order count, total revenue, and average order value per status."""
    summary_by_status: Dict[str, Dict[str, Any]] = {}

    for status in sorted(VALID_STATUSES):
        matching = [r for r in valid_records if str(r["status"]).lower() == status]
        total_amount = sum(float(r["amount"]) for r in matching)
        count = len(matching)
        avg_amount = round(total_amount / count, 2) if count > 0 else 0.0

        summary_by_status[status] = {
            "status": status,
            "order_count": count,
            "total_amount_jod": round(total_amount, 2),
            "average_amount_jod": avg_amount,
        }

    return list(summary_by_status.values())


def export_summary_csv(
    summary_rows: List[Dict[str, Any]],
    valid_records: List[Dict[str, Any]],
    output_csv: Path,
) -> None:
    """Export validated records and aggregated summary metrics in JOD to a CSV file."""
    with output_csv.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)

        # Section 1: Aggregated Summary by Status (JOD)
        writer.writerow(["=== SUMMARY BY STATUS (JOD / د.أ) ==="])
        writer.writerow(["status", "order_count", "total_amount_jod", "average_amount_jod"])
        for row in summary_rows:
            writer.writerow([
                row["status"],
                row["order_count"],
                f"{row['total_amount_jod']:.2f}",
                f"{row['average_amount_jod']:.2f}",
            ])

        writer.writerow([])

        # Section 2: Validated Order Records
        writer.writerow(["=== VALIDATED ORDERS (JOD / د.أ) ==="])
        writer.writerow(["id", "customer", "city", "product", "date", "amount_jod", "status"])
        for rec in valid_records:
            writer.writerow([
                rec["id"],
                rec["customer"],
                rec.get("city", "N/A"),
                rec["product"],
                rec["date"],
                f"{float(rec['amount']):.2f}",
                rec["status"],
            ])


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    input_path = base_dir / "sample_orders.json"
    output_path = base_dir / "orders_summary.csv"

    print(f"Reading JSON data from: {input_path.name}")
    records = load_json_data(input_path)

    valid_records: List[Dict[str, Any]] = []
    invalid_count = 0

    for idx, record in enumerate(records, start=1):
        is_valid, errors = validate_record(record, idx)
        if is_valid:
            valid_records.append(record)
        else:
            invalid_count += 1
            rec_id = record.get("id", f"Row #{idx}") if isinstance(record, dict) else f"Row #{idx}"
            print(f"  [SKIPPED] {rec_id}: {'; '.join(errors)}")

    summary_rows = build_status_summary(valid_records)
    export_summary_csv(summary_rows, valid_records, output_path)

    print("\nProcessing complete:")
    print(f"  - Total records read : {len(records)}")
    print(f"  - Valid records      : {len(valid_records)}")
    print(f"  - Invalid records    : {invalid_count}")
    print(f"  - Currency           : Jordanian Dinar (JOD / د.أ)")
    print(f"  - Exported CSV file  : {output_path.name}")


if __name__ == "__main__":
    main()
