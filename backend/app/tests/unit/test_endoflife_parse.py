from datetime import date
from app.lifecycle.sources.endoflife import parse_date


def test_parse_full_date():
    assert parse_date("2026-12-31") == (date(2026, 12, 31), "day")


def test_parse_month_date():
    assert parse_date("2026-12") == (date(2026, 12, 1), "month")


def test_parse_year_date():
    assert parse_date("2027") == (date(2027, 1, 1), "year")


def test_parse_false_or_unknown():
    assert parse_date(False) is None
    assert parse_date(None) is None
    assert parse_date("unknown") is None
