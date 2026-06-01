import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

class StationSkeleton extends StatelessWidget {
  const StationSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: GetGasColors.bgCard2,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 16,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: GetGasColors.bgCard2,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      height: 12,
                      width: 120,
                      decoration: BoxDecoration(
                        color: GetGasColors.bgCard2,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 25, color: GetGasColors.border),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                height: 12,
                width: 80,
                color: GetGasColors.bgCard2,
              ),
              Container(
                height: 12,
                width: 60,
                color: GetGasColors.bgCard2,
              ),
            ],
          ),
          const Divider(height: 25, color: GetGasColors.border),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(height: 16, width: 60, color: GetGasColors.bgCard2),
              Container(height: 16, width: 60, color: GetGasColors.bgCard2),
            ],
          ),
        ],
      ),
    );
  }
}

class StationSkeletonList extends StatelessWidget {
  const StationSkeletonList({super.key, this.count = 4});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(count, (i) {
        return Padding(
          padding: EdgeInsets.only(bottom: i < count - 1 ? 12 : 0),
          child: const StationSkeleton(),
        );
      }),
    );
  }
}
