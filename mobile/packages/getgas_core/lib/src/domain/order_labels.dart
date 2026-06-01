const orderStatusLabels = <String, String>{
  'pending': 'Order Placed',
  'accepted': 'Rider Assigned',
  'at_station': 'Rider at Station',
  'en_route': 'On the Way',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
};

String orderStatusLabel(String status) => orderStatusLabels[status] ?? status;

/// Alias used by home banner / orders list.
String homeOrderStatusLabel(String status) => orderStatusLabel(status);

const paymentMethodLabels = <String, String>{
  'mobile_money': 'Mobile Money',
  'card': 'Card',
  'cash': 'Cash on Delivery',
};

String paymentMethodLabel(String? method) =>
    paymentMethodLabels[method ?? ''] ?? method ?? '—';