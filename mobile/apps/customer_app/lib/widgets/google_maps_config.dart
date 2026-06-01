/// Dark map style — matches web track map.
const googleMapDarkStyle = '''
[
  {"elementType":"geometry","stylers":[{"color":"#1e1e2e"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#1e1e2e"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#6b7280"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#2d2d3f"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#9ca3af"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#374151"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#111827"}]},
  {"featureType":"poi","stylers":[{"visibility":"off"}]},
  {"featureType":"transit","stylers":[{"visibility":"off"}]}
]
''';

const accraLat = 5.6037;
const accraLng = -0.187;
