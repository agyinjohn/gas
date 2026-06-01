import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

final placesServiceProvider = Provider<PlacesService?>((ref) {
  final key = AppConfig.googleMapsApiKey;
  if (key.isEmpty) return null;
  return PlacesService(key);
});

/// Google Places Autocomplete + Details — mirrors web LocationPicker search.
class PlacesService {
  PlacesService(this.apiKey);

  final String apiKey;

  Future<List<PlaceSuggestion>> autocomplete(String input) async {
    if (input.trim().length < 2) return [];
    final uri = Uri.https('maps.googleapis.com', '/maps/api/place/autocomplete/json', {
      'input': input.trim(),
      'key': apiKey,
      'components': 'country:gh',
    });
    final res = await _get(uri);
    final predictions = res['predictions'] as List<dynamic>? ?? [];
    return predictions
        .map((p) => PlaceSuggestion(
              placeId: p['place_id'] as String? ?? '',
              description: p['description'] as String? ?? '',
            ))
        .where((s) => s.placeId.isNotEmpty)
        .toList();
  }

  Future<PlaceLocation?> getPlaceDetails(String placeId) async {
    if (placeId.isEmpty) return null;
    final uri = Uri.https('maps.googleapis.com', '/maps/api/place/details/json', {
      'place_id': placeId,
      'fields': 'geometry,formatted_address,address_components',
      'key': apiKey,
    });
    final res = await _get(uri);
    final result = res['result'] as Map<String, dynamic>?;
    if (result == null) return null;

    final geometry = result['geometry'] as Map<String, dynamic>?;
    final location = geometry?['location'] as Map<String, dynamic>?;
    final lat = (location?['lat'] as num?)?.toDouble();
    final lng = (location?['lng'] as num?)?.toDouble();
    if (lat == null || lng == null) return null;

    final components = result['address_components'] as List<dynamic>? ?? [];
    final parsed = _parseComponents(components);
    final formatted = result['formatted_address'] as String? ?? parsed.street;

    return PlaceLocation(
      lat: lat,
      lng: lng,
      street: parsed.street.isNotEmpty ? parsed.street : formatted,
      city: parsed.city.isNotEmpty ? parsed.city : 'Ghana',
      formatted: formatted,
    );
  }

  Future<PlaceLocation?> reverseGeocode(double lat, double lng) async {
    final uri = Uri.https('maps.googleapis.com', '/maps/api/geocode/json', {
      'latlng': '$lat,$lng',
      'key': apiKey,
    });
    final res = await _get(uri);
    final results = res['results'] as List<dynamic>? ?? [];
    if (results.isEmpty) return null;
    final first = results.first as Map<String, dynamic>;
    final components = first['address_components'] as List<dynamic>? ?? [];
    final parsed = _parseComponents(components);
    final formatted = first['formatted_address'] as String? ?? parsed.street;
    return PlaceLocation(
      lat: lat,
      lng: lng,
      street: parsed.street.isNotEmpty ? parsed.street : formatted,
      city: parsed.city.isNotEmpty ? parsed.city : 'Ghana',
      formatted: formatted,
    );
  }

  Future<Map<String, dynamic>> _get(Uri uri) async {
    final client = HttpClient();
    try {
      final request = await client.getUrl(uri);
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();
      final data = jsonDecode(body) as Map<String, dynamic>;
      final status = data['status'] as String? ?? '';
      if (status != 'OK' && status != 'ZERO_RESULTS') {
        throw Exception(data['error_message'] ?? status);
      }
      return data;
    } finally {
      client.close();
    }
  }

  ({String street, String city}) _parseComponents(List<dynamic> components) {
    var street = '';
    var city = '';
    for (final raw in components) {
      final c = raw as Map<String, dynamic>;
      final types = (c['types'] as List<dynamic>? ?? []).cast<String>();
      final name = c['long_name'] as String? ?? '';
      if (types.contains('route')) street = name;
      if (types.contains('street_number') && street.isEmpty) street = name;
      if (types.contains('locality')) city = name;
      if (city.isEmpty && types.contains('administrative_area_level_2')) city = name;
      if (city.isEmpty && types.contains('administrative_area_level_1')) city = name;
    }
    return (street: street, city: city);
  }
}

class PlaceSuggestion {
  const PlaceSuggestion({required this.placeId, required this.description});

  final String placeId;
  final String description;
}

class PlaceLocation {
  const PlaceLocation({
    required this.lat,
    required this.lng,
    required this.street,
    required this.city,
    required this.formatted,
  });

  final double lat;
  final double lng;
  final String street;
  final String city;
  final String formatted;

  PickedLocation toPickedLocation() => PickedLocation(
        lat: lat,
        lng: lng,
        street: street,
        city: city,
        formatted: formatted,
      );
}
