enum UserRole { user, rider, station, admin }

class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    this.stationId,
  });

  final String id;
  final String name;
  final String phone;
  final UserRole role;
  final String? stationId;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      role: _parseRole(json['role'] as String?),
      stationId: json['stationId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'role': role.name,
        if (stationId != null) 'stationId': stationId,
      };

  static UserRole _parseRole(String? role) {
    switch (role) {
      case 'rider':
        return UserRole.rider;
      case 'station':
        return UserRole.station;
      case 'admin':
        return UserRole.admin;
      default:
        return UserRole.user;
    }
  }
}
