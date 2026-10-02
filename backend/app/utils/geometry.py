"""Small, dependency-free helpers for farm GeoJSON geometry."""

from math import cos, radians, sqrt
from typing import Any, Dict, List, Tuple


Coordinate = Tuple[float, float]


def _coordinates(geometry: Dict[str, Any]) -> List[Coordinate]:
    if not isinstance(geometry, dict) or geometry.get("type") != "Polygon":
        raise ValueError("Farm boundary must be a GeoJSON Polygon.")

    rings = geometry.get("coordinates")
    if not isinstance(rings, list) or not rings or not isinstance(rings[0], list):
        raise ValueError("Farm polygon must contain an exterior ring.")

    ring = []
    for coordinate in rings[0]:
        if not isinstance(coordinate, (list, tuple)) or len(coordinate) != 2:
            raise ValueError("Polygon coordinates must be [longitude, latitude].")
        longitude, latitude = float(coordinate[0]), float(coordinate[1])
        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            raise ValueError("Polygon contains an invalid coordinate.")
        ring.append((longitude, latitude))

    if len(ring) < 4 or ring[0] != ring[-1]:
        raise ValueError("Farm polygon must be closed and have at least three vertices.")
    if len(ring) > 501:
        raise ValueError("Farm polygon has too many vertices.")
    return ring


def validate_polygon(geometry: Dict[str, Any]) -> Dict[str, Any]:
    ring = _coordinates(geometry)
    area = polygon_area_hectares(geometry)
    if area < 0.001:
        raise ValueError("Farm polygon area is too small.")
    if area > 10000:
        raise ValueError("Farm polygon area is unrealistically large.")

    # Segment-intersection check catches the common self-intersecting case.
    def orientation(a: Coordinate, b: Coordinate, c: Coordinate) -> float:
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    segments = list(zip(ring, ring[1:]))
    for index, (a, b) in enumerate(segments):
        for other_index, (c, d) in enumerate(segments):
            if abs(index - other_index) <= 1 or {index, other_index} == {0, len(segments) - 1}:
                continue
            if orientation(a, b, c) * orientation(a, b, d) < 0 and orientation(c, d, a) * orientation(c, d, b) < 0:
                raise ValueError("Farm polygon must not self-intersect.")
    return {"area_hectares": area, "centroid": polygon_centroid(geometry)}


def polygon_area_hectares(geometry: Dict[str, Any]) -> float:
    ring = _coordinates(geometry)
    mean_latitude = radians(sum(latitude for _, latitude in ring) / len(ring))
    radius_m = 6371008.8
    projected = [
        (radians(longitude) * radius_m * cos(mean_latitude), radians(latitude) * radius_m)
        for longitude, latitude in ring
    ]
    area_m2 = abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(projected, projected[1:]))) / 2
    return round(area_m2 / 10000, 4)


def polygon_centroid(geometry: Dict[str, Any]) -> Dict[str, float]:
    ring = _coordinates(geometry)[:-1]
    return {
        "latitude": round(sum(latitude for _, latitude in ring) / len(ring), 7),
        "longitude": round(sum(longitude for longitude, _ in ring) / len(ring), 7),
    }