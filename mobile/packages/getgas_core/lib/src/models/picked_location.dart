class PickedLocation {
  const PickedLocation({
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

  String get label => formatted.split(',').first.trim();
}
