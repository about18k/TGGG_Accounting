"""
Reverse geocoding service using OpenStreetMap Nominatim API.
Converts latitude/longitude to human-readable addresses.
"""
import logging
import time
import urllib.parse
import urllib.request
import json

logger = logging.getLogger(__name__)

_last_request_time = 0


def reverse_geocode(latitude, longitude):
    """
    Convert coordinates to a human-readable address using Nominatim.
    Returns address string or coordinate fallback on failure.
    Rate-limited to 1 request per second per Nominatim usage policy.
    """
    global _last_request_time

    if latitude is None or longitude is None:
        return None

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return None

    # Rate limiting: 1 request per second
    elapsed = time.time() - _last_request_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    url = (
        f"https://nominatim.openstreetmap.org/reverse?"
        f"lat={latitude}&lon={longitude}&format=json&addressdetails=1"
    )

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "TripleGBuildHub-Attendance/1.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            _last_request_time = time.time()
            data = json.loads(response.read().decode())

        display_name = data.get("display_name", "")
        if display_name:
            # Truncate to reasonable length
            return display_name[:255]

        # Fallback: build from address parts
        addr = data.get("address", {})
        parts = []
        for key in ("road", "neighbourhood", "suburb", "city", "town", "village", "state"):
            val = addr.get(key)
            if val:
                parts.append(val)
        if parts:
            return ", ".join(parts)[:255]

    except Exception:
        logger.warning("Reverse geocoding failed for (%s, %s)", latitude, longitude)

    return f"{latitude:.5f}, {longitude:.5f}"
