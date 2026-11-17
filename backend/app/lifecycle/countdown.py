from __future__ import annotations
from datetime import date, datetime, timezone
from dataclasses import dataclass


@dataclass
class CountdownResult:
    days_remaining: int | None
    state: str  # upcoming, due_today, overdue, unknown, not_applicable


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def calculate_days_remaining(milestone_date: date | None, current: date | None = None) -> CountdownResult:
    if milestone_date is None:
        return CountdownResult(days_remaining=None, state="unknown")
    current = current or today_utc()
    delta = (milestone_date - current).days
    if delta < 0:
        return CountdownResult(days_remaining=delta, state="overdue")
    if delta == 0:
        return CountdownResult(days_remaining=0, state="due_today")
    return CountdownResult(days_remaining=delta, state="upcoming")


def classify_risk(days_to_eol: int | None, days_to_eos: int | None, unsupported: bool = False) -> str:
    # configurable defaults: Critical <=30 or unsupported/passed, High 31-90, Medium 91-180, Low >180, Unknown unavailable
    days = days_to_eol if days_to_eol is not None else days_to_eos
    if days is None:
        return "Unknown"
    if days < 0 or days <= 30 or unsupported:
        return "Critical"
    if days <= 90:
        return "High"
    if days <= 180:
        return "Medium"
    return "Low"
