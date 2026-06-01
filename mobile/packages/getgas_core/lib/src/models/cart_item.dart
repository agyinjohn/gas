class CartItem {
  const CartItem({
    required this.size,
    required this.quantity,
    required this.unitPrice,
    this.id,
  });

  final String? id;
  final int size;
  final int quantity;
  final double unitPrice;

  double get subtotal => unitPrice * quantity;

  CartItem copyWith({
    String? id,
    int? size,
    int? quantity,
    double? unitPrice,
  }) {
    return CartItem(
      id: id ?? this.id,
      size: size ?? this.size,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'size': size,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'subtotal': subtotal,
        if (unitPrice != 0) 'customPrice': unitPrice,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) {
    final unitPrice = (json['unitPrice'] as num?)?.toDouble() ??
        (json['customPrice'] as num?)?.toDouble() ??
        0;
    return CartItem(
      id: json['id'] as String?,
      size: (json['size'] as num?)?.toInt() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: unitPrice,
    );
  }
}

class CheckoutLineItem {
  CheckoutLineItem({
    required this.size,
    required this.quantity,
    required this.price,
    String? id,
  }) : id = id ?? _uid();

  final String id;
  int size;
  int quantity;
  String price;

  static String _uid() =>
      '${DateTime.now().microsecondsSinceEpoch}${DateTime.now().millisecondsSinceEpoch % 1000}';
}
