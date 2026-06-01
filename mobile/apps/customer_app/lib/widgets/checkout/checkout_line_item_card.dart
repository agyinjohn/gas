import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';

/// Single cylinder line item — mirrors web checkout "Your Order" row.
class CheckoutLineItemCard extends StatefulWidget {
  const CheckoutLineItemCard({
    super.key,
    required this.line,
    required this.onChanged,
    required this.onRemove,
  });

  final CheckoutLineItem line;
  final VoidCallback onChanged;
  final VoidCallback onRemove;

  @override
  State<CheckoutLineItemCard> createState() => _CheckoutLineItemCardState();
}

class _CheckoutLineItemCardState extends State<CheckoutLineItemCard> {
  late final TextEditingController _priceController;

  @override
  void initState() {
    super.initState();
    _priceController = TextEditingController(text: widget.line.price);
  }

  @override
  void didUpdateWidget(CheckoutLineItemCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.line.id != widget.line.id && _priceController.text != widget.line.price) {
      _priceController.text = widget.line.price;
    }
  }

  @override
  void dispose() {
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final line = widget.line;
    final entered = double.tryParse(line.price);
    final belowMin = line.price.isNotEmpty && entered != null && entered < minCylinderPrice;
    final sub = ((entered ?? minCylinderPrice.toDouble()) * line.quantity);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: belowMin ? GetGasColors.bgCard : GetGasColors.brand.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: belowMin ? const Color(0xFFF87171) : GetGasColors.brand, width: 2),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: GetGasColors.brand,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${line.size}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        height: 1,
                      ),
                    ),
                    const Text(
                      'kg',
                      style: TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w700,
                        color: Colors.white70,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${line.size}kg Cylinder',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
              ),
              _QtyButton(
                icon: Icons.remove,
                onTap: () {
                  setState(() => line.quantity = line.quantity > 1 ? line.quantity - 1 : 1);
                  widget.onChanged();
                },
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Text(
                  '${line.quantity}',
                  style: const TextStyle(fontWeight: FontWeight.w900, color: GetGasColors.brand),
                ),
              ),
              _QtyButton(
                icon: Icons.add,
                onTap: () {
                  setState(() => line.quantity++);
                  widget.onChanged();
                },
              ),
              Material(
                color: const Color(0xFFFEF2F2),
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: widget.onRemove,
                  customBorder: const CircleBorder(),
                  child: const SizedBox(
                    width: 28,
                    height: 28,
                    child: Icon(Icons.close, color: Color(0xFFEF4444), size: 18),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'GAS COST (₵)',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: GetGasColors.textMuted,
                  letterSpacing: 1,
                ),
              ),
              Text(
                'Min ₵$minCylinderPrice',
                style: const TextStyle(fontSize: 10, color: GetGasColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _priceController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: (v) {
              line.price = v;
              widget.onChanged();
              setState(() {});
            },
            style: const TextStyle(fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              prefixText: '₵ ',
              prefixStyle: const TextStyle(
                fontWeight: FontWeight.w600,
                color: GetGasColors.textMuted,
              ),
              filled: true,
              fillColor: GetGasColors.bgCard,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: belowMin ? const Color(0xFFF87171) : GetGasColors.border,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
              ),
            ),
          ),
          if (belowMin)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Minimum is ₵$minCylinderPrice',
                  style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444)),
                ),
              ),
            ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${line.quantity} × ₵${entered ?? minCylinderPrice}',
                style: const TextStyle(fontSize: 12, color: GetGasColors.brand),
              ),
              Text(
                '₵${sub.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: GetGasColors.brand,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: GetGasColors.bgCard,
      shape: CircleBorder(
        side: BorderSide(color: GetGasColors.brand.withValues(alpha: 0.3), width: 2),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(width: 28, height: 28, child: Icon(icon, size: 16, color: GetGasColors.brand)),
      ),
    );
  }
}
