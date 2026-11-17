from datetime import date
from app.lifecycle.countdown import calculate_days_remaining, classify_risk


def test_countdown_upcoming():
    r = calculate_days_remaining(date(2026, 11, 27), current=date(2026, 11, 17))
    assert r.days_remaining == 10
    assert r.state == "upcoming"


def test_countdown_due_today():
    r = calculate_days_remaining(date(2026, 11, 17), current=date(2026, 11, 17))
    assert r.days_remaining == 0
    assert r.state == "due_today"


def test_countdown_overdue():
    r = calculate_days_remaining(date(2026, 11, 10), current=date(2026, 11, 17))
    assert r.days_remaining == -7
    assert r.state == "overdue"


def test_countdown_unknown():
    r = calculate_days_remaining(None)
    assert r.days_remaining is None
    assert r.state == "unknown"


def test_risk_classification():
    assert classify_risk(-1, None) == "Critical"
    assert classify_risk(30, None) == "Critical"
    assert classify_risk(60, None) == "High"
    assert classify_risk(120, None) == "Medium"
    assert classify_risk(200, None) == "Low"
    assert classify_risk(None, None) == "Unknown"
