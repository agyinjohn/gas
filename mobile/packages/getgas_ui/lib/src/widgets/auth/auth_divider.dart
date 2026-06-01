import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Row(
        children: [
          const Expanded(child: Divider(color: GetGasColors.border)),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Text('or', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
          ),
          const Expanded(child: Divider(color: GetGasColors.border)),
        ],
      ),
    );
  }
}
