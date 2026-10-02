from datetime import datetime


def get_current_season(date=None) -> str:
    """
    Determine the agricultural season from the calendar month.

    Kharif: June to October
    Rabi:   November to February
    Zaid:   March to May
    """

    if date is None:
        date = datetime.now()

    month = date.month

    if month in [6, 7, 8, 9, 10]:
        return "Kharif"

    if month in [11, 12, 1, 2]:
        return "Rabi"

    return "Zaid"