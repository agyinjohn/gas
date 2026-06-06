import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'getgas_colors.dart';

ThemeData getGasTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: GetGasColors.brand,
      primary: GetGasColors.brand,
      surface: GetGasColors.bgCard,
    ),
    scaffoldBackgroundColor: GetGasColors.bg,
    appBarTheme: const AppBarTheme(
      backgroundColor: GetGasColors.bgCard,
      foregroundColor: GetGasColors.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: GetGasColors.text,
      ),
    ),
    cardTheme: CardThemeData(
      color: GetGasColors.bgCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: GetGasColors.border),
      ),
      margin: EdgeInsets.zero,
    ),
    dividerColor: GetGasColors.border,
    dividerTheme: const DividerThemeData(
      color: GetGasColors.border,
      thickness: 1,
      space: 1,
    ),
    textTheme: const TextTheme(
      bodyLarge:   TextStyle(fontSize: 16, color: GetGasColors.text),
      bodyMedium:  TextStyle(fontSize: 14, color: GetGasColors.text),
      bodySmall:   TextStyle(fontSize: 12, color: GetGasColors.textMuted),
      titleLarge:  TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: GetGasColors.text),
      titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GetGasColors.text),
      titleSmall:  TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GetGasColors.text),
      labelLarge:  TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: GetGasColors.brand,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: GetGasColors.text,
        side: const BorderSide(color: GetGasColors.border),
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: GetGasColors.bgCard,
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
        borderSide: const BorderSide(color: GetGasColors.error),
      ),
      hintStyle: const TextStyle(color: GetGasColors.textMuted, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: GetGasColors.text,
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
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
      surface: GetGasColors.darkCard,
    ),
    scaffoldBackgroundColor: GetGasColors.darkBg,
    appBarTheme: const AppBarTheme(
      backgroundColor: GetGasColors.darkCard,
      foregroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: Colors.white,
      ),
    ),
    cardTheme: CardThemeData(
      color: GetGasColors.darkCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: GetGasColors.darkBorder),
      ),
      margin: EdgeInsets.zero,
    ),
    dividerColor: GetGasColors.darkBorder,
    dividerTheme: const DividerThemeData(
      color: GetGasColors.darkBorder,
      thickness: 1,
      space: 1,
    ),
    textTheme: const TextTheme(
      bodyLarge:   TextStyle(fontSize: 16, color: Colors.white),
      bodyMedium:  TextStyle(fontSize: 14, color: Colors.white),
      bodySmall:   TextStyle(fontSize: 12, color: GetGasColors.darkMuted),
      titleLarge:  TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
      titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
      titleSmall:  TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
      labelLarge:  TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: GetGasColors.brand,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        side: const BorderSide(color: GetGasColors.darkBorder),
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: GetGasColors.darkCard2,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.darkBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.darkBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
      ),
      hintStyle: const TextStyle(color: GetGasColors.darkMuted, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: GetGasColors.darkCard,
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
