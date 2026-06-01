import 'package:flutter/material.dart';

import 'getgas_colors.dart';

ThemeData getGasTheme() {
  const scale = 1.0625; // Align with web mobile typography (16px base)

  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: GetGasColors.brand,
      primary: GetGasColors.brand,
    ),
    scaffoldBackgroundColor: GetGasColors.bg,
    textTheme: TextTheme(
      bodyLarge: TextStyle(fontSize: 16 * scale, color: GetGasColors.text),
      bodyMedium: TextStyle(fontSize: 15 * scale, color: GetGasColors.text),
      bodySmall: TextStyle(fontSize: 13 * scale, color: GetGasColors.textMuted),
      titleMedium: TextStyle(fontSize: 17 * scale, fontWeight: FontWeight.w700, color: GetGasColors.text),
      labelLarge: TextStyle(fontSize: 15 * scale, fontWeight: FontWeight.w700),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: GetGasColors.bgCard2,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFF87171)),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );
}

ThemeData getGasDarkTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: GetGasColors.brand,
      primary: GetGasColors.brand,
      brightness: Brightness.dark,
    ),
    scaffoldBackgroundColor: const Color(0xFF111827),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(fontSize: 17, color: Color(0xFFF9FAFB)),
      bodyMedium: TextStyle(fontSize: 15, color: Color(0xFFF9FAFB)),
      bodySmall: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF1F2937),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF374151)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF374151)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
  );
}
