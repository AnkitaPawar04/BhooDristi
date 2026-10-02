import unittest
from unittest.mock import Mock, patch

from backend.app.utils import soil_moisture


class SoilMoistureCombinedEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.earth_engine = Mock()
        self.collection = Mock()
        self.count_expression = Mock(name="count_expression")
        self.reduction_expression = Mock(name="reduction_expression")
        self.combined_expression = Mock(name="combined_expression")
        self.point = Mock(name="point")
        self.buffered_point = Mock(name="buffered_point")

        self.earth_engine.ImageCollection.return_value.filterDate.return_value.select.return_value = self.collection
        self.collection.size.return_value = self.count_expression
        self.collection.mean.return_value.reduceRegion.return_value = self.reduction_expression
        self.earth_engine.Dictionary.return_value = self.combined_expression
        self.earth_engine.Geometry.Point.return_value = self.point
        self.point.buffer.return_value = self.buffered_point
        self.earth_engine.Reducer.mean.return_value = "mean_reducer"

    def call_provider(self, combined_response, geometry=None):
        self.combined_expression.getInfo.return_value = combined_response
        with (
            patch.object(soil_moisture, "ee", self.earth_engine),
            patch.object(soil_moisture, "initialize_earth_engine"),
        ):
            return soil_moisture.get_soil_moisture(
                18.1,
                75.1,
                geometry=geometry,
            )

    def assert_single_combined_evaluation(self):
        self.earth_engine.Dictionary.assert_called_once_with(
            {
                "count": self.count_expression,
                "reduction": self.reduction_expression,
            }
        )
        self.combined_expression.getInfo.assert_called_once_with()
        self.count_expression.getInfo.assert_not_called()
        self.reduction_expression.getInfo.assert_not_called()

    def test_normal_response_converts_bands_and_preserves_structure(self):
        result = self.call_provider(
            {
                "count": 53,
                "reduction": {
                    "sm_surface": 0.24771556088709723,
                    "sm_rootzone": 0.28870444388186195,
                },
            }
        )

        self.assertEqual(
            result,
            {
                "latitude": 18.1,
                "longitude": 75.1,
                "source": "NASA SMAP L4",
                "available": True,
                "observations_used": 53,
                "resolution_m": 9000,
                "surface_depth": "0-5cm",
                "rootzone_depth": "0-100cm",
                "surface_moisture_percent": 24.771556088709723,
                "rootzone_moisture_percent": 28.870444388186193,
            },
        )
        self.assert_single_combined_evaluation()
        self.earth_engine.ImageCollection.assert_called_once_with(soil_moisture.SMAP_ASSET)
        self.collection.mean.return_value.reduceRegion.assert_called_once_with(
            reducer="mean_reducer",
            geometry=self.buffered_point,
            scale=soil_moisture.SMAP_SCALE,
            bestEffort=True,
        )
        self.earth_engine.Geometry.Point.assert_called_once_with([75.1, 18.1])
        self.point.buffer.assert_called_once_with(soil_moisture.SMAP_SCALE / 2)

    def test_zero_count_returns_existing_unavailable_response(self):
        result = self.call_provider({"count": 0, "reduction": {}})

        self.assertEqual(
            result,
            {
                "source": "NASA SMAP L4",
                "available": False,
                "message": "No recent SMAP observations available",
                "surface_moisture_percent": None,
                "rootzone_moisture_percent": None,
            },
        )
        self.assert_single_combined_evaluation()

    def test_null_band_value_remains_null(self):
        result = self.call_provider(
            {
                "count": 53,
                "reduction": {
                    "sm_surface": None,
                    "sm_rootzone": 0.28870444388186195,
                },
            }
        )

        self.assertTrue(result["available"])
        self.assertIsNone(result["surface_moisture_percent"])
        self.assertEqual(result["rootzone_moisture_percent"], 28.870444388186193)
        self.assert_single_combined_evaluation()

    def test_polygon_geometry_is_passed_unchanged(self):
        polygon = {
            "type": "Polygon",
            "coordinates": [[[75.1, 18.1], [75.2, 18.1], [75.1, 18.1]]],
        }
        result = self.call_provider(
            {
                "count": 1,
                "reduction": {"sm_surface": 0.2, "sm_rootzone": 0.3},
            },
            geometry=polygon,
        )

        self.assertEqual(result["surface_moisture_percent"], 20.0)
        self.assertEqual(result["rootzone_moisture_percent"], 30.0)
        self.earth_engine.Geometry.assert_called_once_with(polygon)
        self.collection.mean.return_value.reduceRegion.assert_called_once_with(
            reducer="mean_reducer",
            geometry=self.earth_engine.Geometry.return_value,
            scale=soil_moisture.SMAP_SCALE,
            bestEffort=True,
        )
        self.assert_single_combined_evaluation()

    def test_polygon_with_null_band_falls_back_to_centroid_point(self):
        polygon = {
            "type": "Polygon",
            "coordinates": [[
                [75.0995, 18.0995],
                [75.1005, 18.0995],
                [75.1005, 18.1005],
                [75.0995, 18.1005],
                [75.0995, 18.0995],
            ]],
        }
        centroid_reduction = Mock(name="centroid_reduction")
        centroid_reduction.getInfo.return_value = {
            "sm_surface": 0.25,
            "sm_rootzone": 0.29,
        }
        self.collection.mean.return_value.reduceRegion.side_effect = [
            self.reduction_expression,
            centroid_reduction,
        ]

        result = self.call_provider(
            {
                "count": 53,
                "reduction": {"sm_surface": 0.21, "sm_rootzone": None},
            },
            geometry=polygon,
        )

        self.assertTrue(result["available"])
        self.assertAlmostEqual(result["surface_moisture_percent"], 25.0)
        self.assertAlmostEqual(result["rootzone_moisture_percent"], 29.0)
        self.earth_engine.Dictionary.assert_called_once_with(
            {
                "count": self.count_expression,
                "reduction": self.reduction_expression,
            }
        )
        self.combined_expression.getInfo.assert_called_once_with()
        self.count_expression.getInfo.assert_not_called()
        self.reduction_expression.getInfo.assert_not_called()
        centroid_reduction.getInfo.assert_called_once_with()
        self.earth_engine.Geometry.assert_called_once_with(polygon)
        self.earth_engine.Geometry.Point.assert_called_once_with([75.1, 18.1])
        self.point.buffer.assert_not_called()
        self.assertEqual(self.collection.mean.return_value.reduceRegion.call_count, 2)


if __name__ == "__main__":
    unittest.main()
