import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

class GetGasColors {
  // Light mode — mirrors web CSS :root vars
  static const brand     = Color(Brand.primary);        // #E87722
  static const brandDark = Color(Brand.primaryDark);    // #C9610F
  static const bg        = Color(0xFFF5F5F5);           // --bg
  static const bgCard    = Color(0xFFFFFFFF);           // --bg-card
  static const bgCard2   = Color(0xFFF0F0F0);           // --bg-card2
  static const text      = Color(0xFF1A1A1A);           // --text-primary
  static const textSub   = Color(0xFF6B6B6B);           // --text-secondary
  static const textMuted = Color(0xFF9A9A9A);           // --text-muted
  static const border    = Color(0xFFE5E5E5);           // --border
  static const error     = Color(0xFFEF4444);
  static const errorBg   = Color(0x1AEF4444);
  static const errorBorder = Color(0x33EF4444);

  // Dark mode — mirrors web CSS .dark vars
  static const darkBg      = Color(0xFF1A1A1A);         // --bg dark
  static const darkCard    = Color(0xFF2A2A2A);         // --bg-card dark
  static const darkCard2   = Color(0xFF333333);         // --bg-card2 dark
  static const darkBorder  = Color(0xFF3A3A3A);         // --border dark
  static const darkMuted   = Color(0xFF9A9A9A);         // --text-muted dark
}
