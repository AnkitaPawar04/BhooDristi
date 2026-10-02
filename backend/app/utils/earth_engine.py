"""Shared, process-wide initialization for the Earth Engine client."""

import os
import threading


_initialization_lock = threading.Lock()
_initialized = False
_earth_engine = None


def initialize_earth_engine():
    """Initialize Earth Engine once and return its shared Python module."""
    global _earth_engine, _initialized

    with _initialization_lock:
        if _initialized:
            return _earth_engine

        import ee

        project_id = os.getenv("EE_PROJECT", "ee-redijmukta04").strip()
        if project_id:
            ee.Initialize(project=project_id)
        else:
            ee.Initialize()

        _earth_engine = ee
        _initialized = True

    return _earth_engine
