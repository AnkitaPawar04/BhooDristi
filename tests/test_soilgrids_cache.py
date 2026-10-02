import logging
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from backend.app.utils import soilgrids


class SoilGridsCacheTests(unittest.TestCase):
    def setUp(self):
        soilgrids._clear_soilgrids_cache()

    def tearDown(self):
        soilgrids._clear_soilgrids_cache()

    @staticmethod
    def result(latitude=18.1, longitude=75.1):
        return {
            "latitude": latitude,
            "longitude": longitude,
            "depth": "0-5cm",
            "source": "ISRIC SoilGrids",
            "resolution_m": 250,
            "soil": {
                "ph": 6.9,
                "organic_carbon": 18.8,
                "nitrogen": 13.1,
                "clay": 42.2,
                "sand": 34.1,
                "silt": 23.6,
            },
            "status": "available",
        }

    def test_first_point_request_misses_and_same_point_hits(self):
        expected = self.result()
        with patch.object(soilgrids, "_get_soilgrids_data_uncached", return_value=expected) as fetch:
            first = soilgrids.get_soilgrids_data(18.1, 75.1)
            second = soilgrids.get_soilgrids_data(18.1, 75.1)

        self.assertEqual(first, expected)
        self.assertEqual(second, expected)
        fetch.assert_called_once_with(18.1, 75.1, None)

    def test_polygon_hit_uses_canonical_geojson_serialization(self):
        polygon = {
            "type": "Polygon",
            "coordinates": [
                [[75.1, 18.1], [75.2, 18.1], [75.2, 18.2], [75.1, 18.1]],
                [[75.12, 18.12], [75.13, 18.12], [75.12, 18.12]],
            ],
        }
        reordered_keys = {
            "coordinates": polygon["coordinates"],
            "type": "Polygon",
        }
        expected = self.result()
        with patch.object(soilgrids, "_get_soilgrids_data_uncached", return_value=expected) as fetch:
            first = soilgrids.get_soilgrids_data(18.1, 75.1, polygon)
            second = soilgrids.get_soilgrids_data(18.1, 75.1, reordered_keys)

        self.assertEqual(first, expected)
        self.assertEqual(second, expected)
        fetch.assert_called_once()
        self.assertIs(fetch.call_args.args[2], polygon)

    def test_different_points_miss_separately(self):
        with patch.object(soilgrids, "_get_soilgrids_data_uncached", side_effect=[self.result(), self.result(18.2, 75.2)]) as fetch:
            soilgrids.get_soilgrids_data(18.1, 75.1)
            soilgrids.get_soilgrids_data(18.2, 75.2)

        self.assertEqual(fetch.call_count, 2)

    def test_point_and_polygon_keys_are_separate(self):
        polygon = {"type": "Polygon", "coordinates": [[[75.1, 18.1], [75.2, 18.1], [75.1, 18.1]]]}
        self.assertNotEqual(
            soilgrids._soilgrids_cache_key(18.1, 75.1),
            soilgrids._soilgrids_cache_key(18.1, 75.1, polygon),
        )

    def test_polygon_key_includes_request_coordinates_and_geometry(self):
        polygon = {"type": "Polygon", "coordinates": [[[75.1, 18.1], [75.2, 18.1], [75.1, 18.1]]]}
        same_geometry_different_location = soilgrids._soilgrids_cache_key(18.2, 75.1, polygon)
        changed_geometry = {"type": "Polygon", "coordinates": [[[75.1, 18.1], [75.3, 18.1], [75.1, 18.1]]]}

        self.assertNotEqual(
            soilgrids._soilgrids_cache_key(18.1, 75.1, polygon),
            same_geometry_different_location,
        )
        self.assertNotEqual(
            soilgrids._soilgrids_cache_key(18.1, 75.1, polygon),
            soilgrids._soilgrids_cache_key(18.1, 75.1, changed_geometry),
        )

    def test_expired_entry_is_fetched_again(self):
        clock = [100.0]
        with patch.object(soilgrids.time, "monotonic", side_effect=lambda: clock[0]):
            with patch.object(soilgrids, "_get_soilgrids_data_uncached", return_value=self.result()) as fetch:
                soilgrids.get_soilgrids_data(18.1, 75.1)
                clock[0] += soilgrids._SOILGRIDS_CACHE_TTL_SECONDS + 1
                soilgrids.get_soilgrids_data(18.1, 75.1)

        self.assertEqual(fetch.call_count, 2)

    def test_provider_exception_is_not_cached(self):
        with patch.object(soilgrids, "_get_soilgrids_data_uncached", side_effect=RuntimeError("provider unavailable")) as fetch:
            for _ in range(2):
                with self.assertRaisesRegex(RuntimeError, "provider unavailable"):
                    soilgrids.get_soilgrids_data(18.1, 75.1)

        self.assertEqual(fetch.call_count, 2)

    def test_unavailable_result_is_not_cached(self):
        unavailable = self.result()
        unavailable["soil"] = {key: None for key in unavailable["soil"]}
        unavailable["status"] = "unavailable"
        with patch.object(soilgrids, "_get_soilgrids_data_uncached", return_value=unavailable) as fetch:
            soilgrids.get_soilgrids_data(18.1, 75.1)
            soilgrids.get_soilgrids_data(18.1, 75.1)

        self.assertEqual(fetch.call_count, 2)

    def test_same_key_concurrent_misses_execute_provider_once(self):
        provider_started = threading.Event()
        release_provider = threading.Event()
        single_flight_waiting = threading.Event()
        calls = []

        def fetch(latitude, longitude, geometry=None):
            calls.append((latitude, longitude, geometry))
            provider_started.set()
            if not release_provider.wait(timeout=5):
                raise TimeoutError("test provider was not released")
            return self.result(latitude, longitude)

        class WaitLogHandler(logging.Handler):
            def emit(self, record):
                if "single-flight wait" in record.getMessage():
                    single_flight_waiting.set()

        handler = WaitLogHandler()
        logger = logging.getLogger(soilgrids.__name__)
        old_level = logger.level
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)
        try:
            with patch.object(soilgrids, "_get_soilgrids_data_uncached", side_effect=fetch):
                with ThreadPoolExecutor(max_workers=2) as executor:
                    first = executor.submit(soilgrids.get_soilgrids_data, 18.1, 75.1)
                    self.assertTrue(provider_started.wait(timeout=3))
                    second = executor.submit(soilgrids.get_soilgrids_data, 18.1, 75.1)
                    self.assertTrue(single_flight_waiting.wait(timeout=3))
                    self.assertEqual(len(calls), 1)
                    release_provider.set()
                    self.assertEqual(first.result(timeout=3), self.result())
                    self.assertEqual(second.result(timeout=3), self.result())
        finally:
            release_provider.set()
            logger.removeHandler(handler)
            logger.setLevel(old_level)

        self.assertEqual(len(calls), 1)

    def test_different_keys_can_execute_concurrently(self):
        both_started = threading.Barrier(2)

        def fetch(latitude, longitude, geometry=None):
            both_started.wait(timeout=4)
            return self.result(latitude, longitude)

        with patch.object(soilgrids, "_get_soilgrids_data_uncached", side_effect=fetch) as provider:
            with ThreadPoolExecutor(max_workers=2) as executor:
                first = executor.submit(soilgrids.get_soilgrids_data, 18.1, 75.1)
                second = executor.submit(soilgrids.get_soilgrids_data, 18.2, 75.2)
                self.assertEqual(first.result(timeout=6), self.result(18.1, 75.1))
                self.assertEqual(second.result(timeout=6), self.result(18.2, 75.2))

        self.assertEqual(provider.call_count, 2)

    def test_cache_is_bounded_lru(self):
        with patch.object(soilgrids, "_SOILGRIDS_CACHE_MAX_ENTRIES", 2):
            with patch.object(soilgrids, "_get_soilgrids_data_uncached", side_effect=[
                self.result(18.1, 75.1),
                self.result(18.2, 75.2),
                self.result(18.3, 75.3),
                self.result(18.2, 75.2),
            ]) as fetch:
                soilgrids.get_soilgrids_data(18.1, 75.1)
                soilgrids.get_soilgrids_data(18.2, 75.2)
                soilgrids.get_soilgrids_data(18.1, 75.1)  # Make first entry most recent.
                soilgrids.get_soilgrids_data(18.3, 75.3)  # Evict second entry.
                soilgrids.get_soilgrids_data(18.2, 75.2)  # Second entry must be fetched again.

        self.assertEqual(fetch.call_count, 4)

    def test_return_structure_is_unchanged(self):
        expected = self.result()
        with patch.object(soilgrids, "_get_soilgrids_data_uncached", return_value=expected):
            actual = soilgrids.get_soilgrids_data(18.1, 75.1)

        self.assertEqual(actual, expected)
        self.assertEqual(
            set(actual),
            {"latitude", "longitude", "depth", "source", "resolution_m", "soil", "status"},
        )
        self.assertEqual(
            set(actual["soil"]),
            {"ph", "organic_carbon", "nitrogen", "clay", "sand", "silt"},
        )


if __name__ == "__main__":
    unittest.main()
